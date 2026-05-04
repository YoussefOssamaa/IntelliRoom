import asyncio
import base64
import io
import json
import os
import time
from pathlib import Path

import chromadb
import httpx
import numpy as np
import uvicorn
from fastapi import FastAPI, HTTPException, UploadFile
from PIL import Image
from pydantic import BaseModel


KAGGLE_BASE_URL  = os.getenv("KAGGLE_BASE_URL", "https://somezroklink.share.zrok.io")
CHROMA_DIR       = "./chromadb"
CATALOG_DIR      = "./catalog_images"
HTTP_TIMEOUT     = 60.0
SEARCH_TOP_K     = 10

MASTER_TAXONOMY = {
    "style": [
        "new_classic", "modern", "scandinavian", "industrial",
        "bohemian", "minimalist", "japandi", "coastal",
        "rustic", "art_deco", "traditional", "heritage_fusion", "desert_modern",
    ],
    "material": [
        "solid_wood", "engineered_wood", "metal", "glass",
        "leather", "faux_leather", "fabric", "velvet",
        "linen", "rattan", "marble", "travertine", "plastic",
    ],
    "color": [
        "black", "white", "gray", "brown", "beige",
        "blue", "navy", "green", "red", "orange",
        "yellow", "pink", "purple", "gold",
    ],
    "room_fit": [
        "salon", "living_room", "bedroom", "dining_room",
        "office", "outdoor", "kids_room", "bathroom",
    ],
    "complementary_styles": [
        "modern", "scandinavian", "industrial", "bohemian",
        "minimalist", "japandi", "coastal", "rustic",
        "art_deco", "heritage_fusion", "desert_modern",
    ],
}

TIER2_COLOR_MAP = {
    "terracotta": "orange",
    "espresso": "brown",
    "charcoal": "gray",
    "cream": "beige",
    "champagne": "gold",
    "ivory": "white",
    "teal": "blue",
    "olive": "green",
    "dark_walnut": "brown",
    "off_white": "white",
    "mustard": "yellow",
    "salmon": "pink",
    "emerald": "green",
    "midnight": "navy",
    "cognac": "brown",
    "mocha": "brown",
}

chroma_client = chromadb.PersistentClient(path=CHROMA_DIR)
collection    = chroma_client.get_or_create_collection(
    name="furniture",
    metadata={"hnsw:space": "cosine"},
)
print(f"ChromaDB ready. Current item count: {collection.count()}")


class SearchRequest(BaseModel):
    image_url: str


def _img_to_bytes(image: Image.Image) -> bytes:
    buf = io.BytesIO()
    image.save(buf, format="JPEG")
    return buf.getvalue()


def _img_to_b64(image: Image.Image) -> str:
    return base64.b64encode(_img_to_bytes(image)).decode()


def _b64_to_pil(b64: str) -> Image.Image:
    return Image.open(io.BytesIO(base64.b64decode(b64))).convert("RGB")


async def api_health() -> dict:
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(f"{KAGGLE_BASE_URL}/health")
        r.raise_for_status()
        return r.json()


async def api_detect(image_bytes: bytes, threshold: float = 0.5) -> list[dict]:
    """Call /detect on Kaggle. Returns list of crops with base64 image data."""
    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
        r = await client.post(
            f"{KAGGLE_BASE_URL}/detect",
            files={"image": ("image.jpg", image_bytes, "image/jpeg")},
            params={"threshold": threshold},
        )
        r.raise_for_status()
        return r.json()["crops"]


async def api_embed_b64(image_b64: str) -> list[float]:
    """Call /embed_b64 on Kaggle. Returns one normalized image vector."""
    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
        r = await client.post(
            f"{KAGGLE_BASE_URL}/embed_b64",
            json={"image_b64": image_b64},
        )
        r.raise_for_status()
        return _coerce_embedding(r.json()["embedding"])


async def api_tag_b64(image_b64: str) -> dict | None:
    """Call /tag_b64 on Kaggle. Returns taxonomy JSON or None."""
    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
        r = await client.post(
            f"{KAGGLE_BASE_URL}/tag_b64",
            json={"image_b64": image_b64},
        )
        if r.status_code == 422:
            return None
        r.raise_for_status()
        return r.json()


def _coerce_embedding(raw_embedding) -> list[float]:
    """
    Accepts flat or nested embedding payloads and returns one normalized vector.
    Nested outputs are mean-pooled over the non-feature axes.
    """
    arr = np.asarray(raw_embedding, dtype=np.float32)
    arr = np.squeeze(arr)

    if arr.ndim == 0:
        raise ValueError("Embedding payload was empty or scalar.")

    if arr.ndim > 1:
        print(f"  [Embed] Received nested embedding shape {arr.shape}; mean-pooling to 1D.")
        arr = arr.reshape(-1, arr.shape[-1]).mean(axis=0)

    norm = np.linalg.norm(arr)
    if norm > 0:
        arr = arr / norm

    return arr.astype(float).tolist()

def _char_ngram_vector(text: str, n: int = 3, vocab_size: int = 512) -> np.ndarray:
    """Lightweight character n-gram hashing vector. No model needed."""
    text   = text.lower().strip()
    ngrams = [text[i:i+n] for i in range(len(text) - n + 1)] or [text]
    vec    = np.zeros(vocab_size)
    for ng in ngrams:
        vec[hash(ng) % vocab_size] += 1
    norm = np.linalg.norm(vec)
    return vec / norm if norm > 0 else vec


def _cosine(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-9))


_TAXONOMY_VECS: dict[str, dict[str, np.ndarray]] = {
    field: {val: _char_ngram_vector(val) for val in values}
    for field, values in MASTER_TAXONOMY.items()
}


def snap_tag(raw: str, field: str) -> str:
    """
    Snaps a raw tag to the closest allowed taxonomy value.
    If raw is already valid, returns it unchanged.
    """
    raw_clean = raw.lower().strip()
    allowed   = MASTER_TAXONOMY[field]

    if field == "color" and raw_clean in TIER2_COLOR_MAP:
        mapped = TIER2_COLOR_MAP[raw_clean]
        print(f"  [Snapper] color alias '{raw}' -> '{mapped}'")
        return mapped

    if raw_clean in allowed:
        return raw_clean

    raw_vec = _char_ngram_vector(raw_clean)
    best    = max(allowed, key=lambda v: _cosine(raw_vec, _TAXONOMY_VECS[field][v]))
    print(f"  [Snapper] '{raw}' -> '{best}' (field: {field})")
    return best


def snap_metadata(raw_meta: dict) -> dict:
    """Runs Semantic Snapper on all scalar and list fields."""
    scalar_fields = ["color", "material", "style"]
    list_fields   = ["room_fit", "complementary_styles"]

    snapped = {}
    for f in scalar_fields:
        snapped[f] = snap_tag(raw_meta.get(f, ""), f)

    for f in list_fields:
        raw_list   = raw_meta.get(f, [])
        snapped[f] = [snap_tag(v, f) for v in raw_list]

    snapped["description"] = raw_meta.get("description", "")
    return snapped


def flatten_metadata(meta: dict) -> dict:
    """ChromaDB does not support list values; flatten to comma-separated strings."""
    return {
        "color":                meta["color"],
        "material":             meta["material"],
        "style":                meta["style"],
        "room_fit":             ",".join(meta.get("room_fit", [])),
        "complementary_styles": ",".join(meta.get("complementary_styles", [])),
        "description":          meta.get("description", ""),
    }


async def process_crop(crop: dict, source_image: str) -> bool:
    """
    Takes a single crop dict from /detect response.
    Runs embed + tag in parallel, snaps metadata, upserts to ChromaDB.
    Returns True on success.
    """
    crop_id  = crop["crop_id"]
    crop_b64 = crop["crop_b64"]

    print(f"    Crop [{crop['label']}] id={crop_id} confidence={crop['confidence']}")

    try:
        vector, raw_tags = await asyncio.gather(
            api_embed_b64(crop_b64),
            api_tag_b64(crop_b64),
        )
    except Exception as e:
        print(f"    ERROR calling Kaggle API: {e}")
        return False

    if raw_tags is None:
        print(f"    Qwen returned None. Skipping crop.")
        return False

    clean_tags = snap_metadata(raw_tags)
    flat_meta  = flatten_metadata(clean_tags)
    flat_meta["label"]        = crop["label"]
    flat_meta["source_image"] = os.path.basename(source_image)
    flat_meta["bbox"]         = json.dumps(crop["bbox"])

    collection.upsert(
        ids=[crop_id],
        embeddings=[vector],
        metadatas=[flat_meta],
    )

    print(f"    Upserted | color={flat_meta['color']} material={flat_meta['material']} style={flat_meta['style']}")
    return True


async def process_image(image_path: str) -> int:
    """
    Full offline pipeline for one catalog image.
    Returns number of successfully upserted crops.
    """
    print(f"\nProcessing: {os.path.basename(image_path)}")

    with open(image_path, "rb") as f:
        image_bytes = f.read()

    try:
        crops = await api_detect(image_bytes)
    except Exception as e:
        print(f"  /detect failed: {e}")
        return 0

    if not crops:
        print("  No furniture detected. Skipping.")
        return 0

    print(f"  {len(crops)} furniture piece(s) detected.")

    upserted = 0
    for crop in crops:
        ok = await process_crop(crop, image_path)
        if ok:
            upserted += 1

    return upserted


async def run_ingestion(catalog_dir: str = CATALOG_DIR):
    """Run the full offline ingestion pipeline over a catalog folder."""

    try:
        health = await api_health()
        print(f"Kaggle server: {health['status']} | models loaded: {list(health['models'].keys())}")
    except Exception as e:
        print(f"Cannot reach Kaggle server at {KAGGLE_BASE_URL}: {e}")
        print("Check your zrok URL in CONFIG and make sure the Kaggle cell is running.")
        return

    images = (
        list(Path(catalog_dir).glob("**/*.jpg")) +
        list(Path(catalog_dir).glob("**/*.png")) +
        list(Path(catalog_dir).glob("**/*.jpeg"))
    )
    print(f"\nFound {len(images)} catalog images in {catalog_dir}")

    total_upserted = 0
    failed         = []
    start          = time.time()

    for i, img_path in enumerate(images):
        try:
            count = await process_image(str(img_path))
            total_upserted += count
        except Exception as e:
            print(f"  FATAL ERROR on {img_path}: {e}")
            failed.append(str(img_path))

        if (i + 1) % 25 == 0:
            elapsed = time.time() - start
            rate    = (i + 1) / elapsed
            eta     = (len(images) - i - 1) / rate
            print(f"\nProgress: {i+1}/{len(images)} | {total_upserted} upserted | ETA {eta/60:.1f} min\n")

    elapsed = time.time() - start
    print(f"\n{'='*55}")
    print(f"Ingestion complete.")
    print(f"Images processed : {len(images)}")
    print(f"Items upserted   : {total_upserted}")
    print(f"Failed images    : {len(failed)}")
    print(f"Total time       : {elapsed/60:.1f} min")
    print(f"ChromaDB total   : {collection.count()} items")
    print(f"{'='*55}")


async def run_search(image_bytes: bytes) -> list[dict]:
    """
    Full online search pipeline for a user-uploaded room photo.
    Returns ranked list of matching furniture items.
    """
    crops = await api_detect(image_bytes)
    if not crops:
        return []

    target = max(crops, key=lambda c: c["confidence"])
    crop_b64 = target["crop_b64"]

    vector, raw_tags = await asyncio.gather(
        api_embed_b64(crop_b64),
        api_tag_b64(crop_b64),
    )

    if raw_tags:
        clean_tags = snap_metadata(raw_tags)
    else:
        clean_tags = {}

    where_filter = {}
    for field in ["color", "material", "style"]:
        if field in clean_tags and clean_tags[field]:
            where_filter[field] = clean_tags[field]

    print(f"Query vector: dim={len(vector)}")
    print(f"Metadata filter: {where_filter}")

    query_kwargs = {
        "query_embeddings": [vector],
        "n_results": SEARCH_TOP_K,
    }
    if where_filter:
        query_kwargs["where"] = where_filter

    try:
        results = collection.query(**query_kwargs)
    except Exception:
        print("  Filter returned empty - falling back to pure vector search.")
        results = collection.query(
            query_embeddings=[vector],
            n_results=SEARCH_TOP_K,
        )

    output = []
    for doc_id, meta, distance in zip(
        results["ids"][0],
        results["metadatas"][0],
        results["distances"][0],
    ):
        output.append({
            "id":          doc_id,
            "score":       round(1 - distance, 4),
            "color":       meta.get("color"),
            "material":    meta.get("material"),
            "style":       meta.get("style"),
            "room_fit":    meta.get("room_fit", "").split(","),
            "description": meta.get("description"),
            "source":      meta.get("source_image"),
        })

    return output


app = FastAPI(title="IntelliRoom Local Orchestrator")


@app.get("/health")
async def health():
    try:
        kaggle_health = await api_health()
        kaggle_status = kaggle_health["status"]
    except Exception:
        kaggle_status = "unreachable"

    return {
        "orchestrator":   "ok",
        "kaggle_server":  kaggle_status,
        "chromadb_items": collection.count(),
    }


@app.post("/search")
async def search(request: SearchRequest):
    """
    User uploads a room photo's URL.
    Returns top-K complementary furniture recommendations.
    """
    try:
        
        async with httpx.AsyncClient() as client:
            response = await client.get(request.image_url)
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail="Unable to fetch image from URL")
            image_bytes = response.content


        results = await run_search(image_bytes)

        if not results:
            return {"results": [], "message": "No furniture detected in photo."}

        return {"results": results, "count": len(results)}

    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Image server unreachable: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")




@app.post("/ingest/single")
async def ingest_single(image: UploadFile):
    """Ingest a single product image. Useful for incremental catalog updates."""
    try:
        image_bytes = await image.read()

        tmp_path = f"/tmp/ingest_{image.filename}"
        with open(tmp_path, "wb") as f:
            f.write(image_bytes)

        count = await process_image(tmp_path)
        Path(tmp_path).unlink(missing_ok=True)

        return {"upserted": count, "chromadb_total": collection.count()}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "ingest":
        catalog = sys.argv[2] if len(sys.argv) > 2 else CATALOG_DIR
        asyncio.run(run_ingestion(catalog))

    else:
        print(f"Starting IntelliRoom Local Orchestrator...")
        print(f"Kaggle server : {KAGGLE_BASE_URL}")
        print(f"ChromaDB      : {CHROMA_DIR} ({collection.count()} items)")
        print(f"API docs      : http://localhost:7860/docs")
        uvicorn.run(app, host="0.0.0.0", port=7860, reload=False)
