# IntelliRoom Detailed System Diagram

This document reflects the current implementation, not an older idealized design.

Key implementation facts captured below:
- The Kaggle notebook is the GPU inference backend.
- The local orchestrator is the control plane, taxonomy snapper, ChromaDB writer/query layer, and FastAPI app.
- The taxonomy source of truth now lives inside `intelliroom_local_orchestrator.py`, and the Kaggle prompt mirrors it.
- ChromaDB stores flattened metadata, with list fields saved as comma-separated strings.
- Search currently filters on `color`, `material`, and `style`, then falls back to pure vector search if the filtered query returns nothing.

## 1. End-to-End Architecture

```mermaid
flowchart LR
    U[User]
    RQ[Room Photo]
    CP[Catalog Product Images<br/>furniture_assets/]

    subgraph LOCAL["Local Machine: intelliroom_local_orchestrator.py"]
        OAPI[FastAPI Orchestrator<br/>/health<br/>/search<br/>/ingest/single]
        LHTTP[HTTP Client Layer<br/>api_health<br/>api_detect<br/>api_embed_b64<br/>api_tag_b64]
        SNAP[Semantic Snapper<br/>Tier-2 color alias map<br/>char n-gram cosine snapper]
        COERCE[Embedding Normalizer<br/>_coerce_embedding<br/>squeeze / mean-pool / renormalize]
        META[Metadata Flattener<br/>room_fit -> CSV string<br/>complementary_styles -> CSV string]
        CHROMA[(ChromaDB<br/>collection: furniture<br/>space: cosine)]
        QUERY[Vector Search + Filter Builder<br/>where: color/material/style]
    end

    subgraph KAGGLE["Kaggle GPU Notebook + FastAPI"]
        TUNNEL[zrok Public Tunnel]
        KAPI[Remote FastAPI<br/>/health<br/>/detect<br/>/embed_b64<br/>/tag_b64]
        DET[RT-DETR r50vd<br/>furniture detection + crop extraction]
        EMB[SigLIP2<br/>image embedding<br/>flat 1152-d vector]
        TAG[Qwen3-VL<br/>taxonomy tagging + description]
        PROMPT[Mirrored Taxonomy Prompt<br/>color / material / style<br/>room_fit / complementary_styles]
    end

    subgraph STORAGE["Persisted Data"]
        IMG[Catalog image files]
        VEC[Embeddings]
        MD[Metadata<br/>color, material, style, label<br/>bbox, source_image, room_fit,<br/>complementary_styles, description]
    end

    U --> RQ --> OAPI
    CP --> OAPI

    OAPI --> LHTTP
    LHTTP --> TUNNEL --> KAPI

    KAPI --> DET
    KAPI --> EMB
    KAPI --> TAG
    TAG --> PROMPT

    EMB --> COERCE
    TAG --> SNAP
    SNAP --> META

    COERCE --> CHROMA
    META --> CHROMA
    QUERY --> CHROMA

    CHROMA --> VEC
    CHROMA --> MD
    CP --> IMG

    OAPI --> QUERY
    QUERY --> OAPI
    OAPI --> U
```

## 2. Offline Ingestion Pipeline

```mermaid
flowchart TD
    START[Run offline ingestion<br/>python intelliroom_local_orchestrator.py ingest furniture_assets]
    HEALTH[Check Kaggle /health]
    LIST[Scan catalog directory<br/>jpg / jpeg / png]
    NEXTIMG[Take next catalog image]
    DETECT[POST image -> /detect]
    NOCROP{Any furniture crops?}
    CROPS[Loop through each detected crop]
    PARALLEL[Run in parallel<br/>api_embed_b64 + api_tag_b64]
    EMBFIX[Normalize embedding payload<br/>_coerce_embedding]
    TAGSNAP[Snap raw tags to allowed taxonomy<br/>Tier-2 color aliases first<br/>otherwise char n-gram similarity]
    FLAT[Flatten metadata for ChromaDB]
    UPSERT[collection.upsert<br/>id = crop_id<br/>embedding = vector<br/>metadata = flattened tags + bbox + source_image]
    COUNT[Increment success count]
    MORECROPS{More crops in image?}
    MOREIMGS{More images in folder?}
    DONE[Print ingestion summary<br/>images processed<br/>items upserted<br/>failed images<br/>collection.count]

    START --> HEALTH --> LIST --> NEXTIMG --> DETECT --> NOCROP
    NOCROP -- No --> MOREIMGS
    NOCROP -- Yes --> CROPS --> PARALLEL
    PARALLEL --> EMBFIX
    PARALLEL --> TAGSNAP
    TAGSNAP --> FLAT
    EMBFIX --> UPSERT
    FLAT --> UPSERT
    UPSERT --> COUNT --> MORECROPS
    MORECROPS -- Yes --> CROPS
    MORECROPS -- No --> MOREIMGS
    MOREIMGS -- Yes --> NEXTIMG
    MOREIMGS -- No --> DONE
```

## 3. Online Search Pipeline

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant LocalAPI as Local Orchestrator /search
    participant Kaggle as Kaggle FastAPI
    participant Detect as RT-DETR
    participant Embed as SigLIP2
    participant Tag as Qwen3-VL
    participant Snap as Semantic Snapper
    participant Chroma as ChromaDB

    User->>LocalAPI: Upload room photo
    LocalAPI->>Kaggle: POST /detect
    Kaggle->>Detect: run_detect(image)
    Detect-->>Kaggle: crops[] with crop_b64, label, confidence, bbox
    Kaggle-->>LocalAPI: detect response

    LocalAPI->>LocalAPI: choose highest-confidence crop

    par Parallel inference on chosen crop
        LocalAPI->>Kaggle: POST /embed_b64
        Kaggle->>Embed: run_embed(crop)
        Embed-->>Kaggle: flat normalized 1152-d vector
        Kaggle-->>LocalAPI: embedding JSON
    and
        LocalAPI->>Kaggle: POST /tag_b64
        Kaggle->>Tag: run_tag(crop)
        Tag-->>Kaggle: taxonomy JSON + description
        Kaggle-->>LocalAPI: tag JSON
    end

    LocalAPI->>Snap: snap_metadata(raw_tags)
    Snap-->>LocalAPI: clean_tags

    LocalAPI->>LocalAPI: build where_filter from color/material/style
    LocalAPI->>Chroma: query(query_embedding, n_results, where_filter)

    alt Filter returned results
        Chroma-->>LocalAPI: ranked ids + distances + metadata
    else Filter empty or exception
        LocalAPI->>Chroma: fallback query without where filter
        Chroma-->>LocalAPI: ranked ids + distances + metadata
    end

    LocalAPI->>LocalAPI: score = 1 - cosine_distance
    LocalAPI-->>User: top-K recommendations with metadata
```

## 4. Kaggle Inference Backend Internals

```mermaid
flowchart TD
    IN[Incoming request]

    subgraph REMOTE["Remote FastAPI App"]
        HEALTH[/GET /health/]
        DETECT[/POST /detect/]
        EMBED[/POST /embed_b64/]
        TAG[/POST /tag_b64/]
    end

    subgraph PRE["Shared Preprocessing"]
        PIL[_pil_from_upload<br/>decode bytes/base64<br/>EXIF transpose<br/>RGB conversion]
        MOVE[_move_inputs<br/>move tensors to DEVICE<br/>cast float tensors to model dtype]
    end

    subgraph MODELS["Loaded Models"]
        MDET[RT-DETR r50vd]
        MEMB[SigLIP2 so400m]
        MTAG[Qwen3-VL 4B]
    end

    subgraph POST["Postprocessing"]
        LABELS[Dynamic furniture label lookup<br/>from model id2label]
        DEDUPE[IoU crop dedupe]
        SIGVEC[_siglip_extract_features<br/>_siglip_to_vector]
        JSONFIX[Qwen JSON validation<br/>retry loop if malformed]
    end

    IN --> HEALTH
    IN --> DETECT
    IN --> EMBED
    IN --> TAG

    DETECT --> PIL --> MOVE --> MDET --> LABELS --> DEDUPE
    EMBED --> PIL --> MOVE --> MEMB --> SIGVEC
    TAG --> PIL --> MOVE --> MTAG --> JSONFIX
```

## 5. ChromaDB Item Shape

```mermaid
classDiagram
    class FurnitureItem {
        +string id
        +int embedding_dim
        +float[] embedding
        +string color
        +string material
        +string style
        +string label
        +string bbox_json
        +string source_image
        +string room_fit_csv
        +string complementary_styles_csv
        +string description
    }

    class SearchQuery {
        +int embedding_dim
        +float[] query_embedding
        +string color_filter
        +string material_filter
        +string style_filter
        +int n_results
    }

    class SearchResult {
        +string id
        +float score
        +string color
        +string material
        +string style
        +string[] room_fit
        +string description
        +string source
    }

    SearchQuery --> FurnitureItem : cosine similarity + optional scalar filter
    FurnitureItem --> SearchResult : metadata projection
```

## 6. Current Behavioral Notes

```mermaid
flowchart LR
    A[Taxonomy source of truth<br/>Local orchestrator]
    B[Kaggle prompt mirrors taxonomy]
    C[Local snapper still protects against drift]
    D[List fields stored as CSV in ChromaDB]
    E[Search filters only color/material/style]
    F[room_fit and complementary_styles are stored and returned<br/>but not yet used in retrieval ranking]
    G[Fallback search path prevents empty filtered queries from failing hard]

    A --> B --> C --> D --> E --> F --> G
```
