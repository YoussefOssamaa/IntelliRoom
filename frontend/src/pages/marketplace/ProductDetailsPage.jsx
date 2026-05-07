import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useShop } from "../../context/ShopContext";
import axios from "../../config/axios.config";

const ProductDetailsPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();

  // Pull our specialized function from the global brain
  const { addToCart } = useShop();

  // --- STATE ---
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);

  // Interactive UI States
  const [activeImage, setActiveImage] = useState(null);
  const [selectedColor, setSelectedColor] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchProduct = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(`/products/${slug}`);
        const result = response.data;

        if (result.success) {
          const fetchedProduct = result.data;
          setProduct(fetchedProduct);

          // Set default interactive states once data arrives
          setActiveImage(fetchedProduct.media?.primaryImage);
          if (fetchedProduct.categorization?.colors?.length > 0) {
            setSelectedColor(fetchedProduct.categorization.colors[0]);
          }
        } else {
          setError("Product not found.");
        }
      } catch (err) {
        console.error("Fetch error:", err.response?.data || err.message);
        setError("Could not connect to the server.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [slug]);

  // --- HANDLERS ---
  const increaseQuantity = () => {
    if (quantity < product.inventory.stockQuantity)
      setQuantity((prev) => prev + 1);
  };

  const decreaseQuantity = () => {
    if (quantity > 1) setQuantity((prev) => prev - 1);
  };

  const handleAddToCart = () => {
    // 1. Send the data to the backend via context
    addToCart(product, quantity);

    // 2. Show the confirmation box
    setShowConfirmation(true);

    // 3. Automatically hide it after 3 seconds
    setTimeout(() => {
      setShowConfirmation(false);
    }, 3000);
  };

  // Helper to get hex codes for the color swatches
  const getColorHex = (colorName) => {
    const hexMap = {
      Black: "#000000",
      White: "#FFFFFF",
      Brown: "#8B4513",
      Beige: "#F5F5DC",
      Grey: "#9CA3AF",
      Blue: "#3B82F6",
      Green: "#10B981",
      Gold: "#D4AF37",
    };
    return hexMap[colorName] || "#cccccc";
  };

  // --- LOADING / ERROR STATES ---
  if (isLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-[#f9fafb]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-text-accent"></div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-[#f9fafb]">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          {error || "Product not found"}
        </h2>
        <button
          onClick={() => navigate("/ecomm")}
          className="text-text-accent hover:underline font-bold"
        >
          &larr; Back to Marketplace
        </button>
      </div>
    );
  }

  const isOutOfStock = product.inventory.stockQuantity === 0;

  // Combine primary image and gallery for the thumbnail strip
  const allImages = [
    product.media?.primaryImage,
    ...(product.media?.gallery || []),
  ].filter(Boolean); // Filter out any empty/undefined images

  return (
    <div className="min-h-screen bg-[#f9fafb] flex flex-col">
      <div className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Breadcrumbs */}
        <nav className="flex text-sm text-gray-500 mb-8 font-medium">
          <Link to="/" className="hover:text-text-accent transition-colors">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link
            to="/ecomm"
            className="hover:text-text-accent transition-colors"
          >
            Marketplace
          </Link>
          <span className="mx-2">/</span>
          {/* 🚀 THE FIX 1: Safely extracting the slug and name with fallbacks */}
          <Link
            to={`/ecomm/category/${product.categorization?.primary?.slug || (typeof product.categorization?.primary === 'string' ? product.categorization.primary.toLowerCase().replace(/\s+/g, '-') : '')}`}
            className="hover:text-text-accent transition-colors capitalize"
          >
            {product.categorization?.primary?.name || product.categorization?.primary || "Uncategorized"}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-text-primary font-bold truncate max-w-[200px]">
            {product.name}
          </span>
        </nav>

        {/* Main Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* LEFT COLUMN: Image Gallery */}
          <div className="flex flex-col gap-4 lg:sticky lg:top-8">
            {/* Main Image Container (Rounded Box) */}
            <div className="aspect-square bg-gray-100 rounded-2xl overflow-hidden relative border border-[#e0e0e0] shadow-sm">
              {/* The Image Itself */}
              <img
                src={activeImage}
                alt={product.name}
                className="absolute top-0 left-0 w-full h-full object-cover !rounded-none"
              />
              {product.pricing?.isOnSale && (
                <div className="absolute top-4 left-4 bg-red-500 text-white text-sm font-extrabold px-3 py-1.5 rounded shadow-sm">
                  SALE
                </div>
              )}
            </div>

            {/* Thumbnail Strip */}
            {allImages.length > 1 && (
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {allImages.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveImage(img)}
                    className={`relative p-0 w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${activeImage === img
                        ? "border-text-accent ring-2 ring-text-accent/30"
                        : "border-[#e0e0e0] hover:border-gray-400"
                      }`}
                  >
                    <img
                      src={img}
                      alt={`Thumbnail ${index + 1}`}
                      className="absolute top-0 left-0 w-full h-full object-cover !rounded-none"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Product Details */}
          <div className="flex flex-col">
            <div className="mb-6">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">
                {product.brand}
              </h2>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight mb-3">
                {product.name}
              </h1>

              {/* Short Description */}
              <p className="text-gray-500 text-lg mb-4 italic">
                {product.shortDescription}
              </p>

              {/* Rating */}
              <div className="flex items-center gap-2 mb-6">
                <div className="flex text-yellow-400">
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                  </svg>
                </div>
                <span className="text-sm font-bold text-gray-700">
                  {product.social?.averageRating || "0.0"}
                </span>
                <span className="text-sm text-gray-400 mx-1">•</span>
                <span className="text-sm text-gray-500 underline cursor-pointer hover:text-text-accent">
                  {product.social?.reviewCount || 0} Reviews
                </span>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-4 border-b border-[#e0e0e0] pb-6">
                <span className="text-4xl font-extrabold text-text-primary">
                  ${product.pricing?.currentPrice}
                </span>
                {product.pricing?.isOnSale && (
                  <span className="text-xl font-medium text-gray-400 line-through">
                    ${product.pricing?.originalPrice}
                  </span>
                )}
              </div>
            </div>

            {/* Color Selector */}
            {product.categorization?.colors &&
              product.categorization.colors.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-text-primary">
                      Color
                    </span>
                    <span className="text-sm text-gray-500 capitalize">
                      {selectedColor}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {product.categorization.colors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${selectedColor === color
                            ? "ring-2 ring-offset-2 ring-text-accent"
                            : "border border-gray-300 hover:border-gray-400"
                          }`}
                      >
                        <div
                          className="w-8 h-8 rounded-full shadow-inner"
                          style={{ backgroundColor: getColorHex(color) }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

            {/* Long Description */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-text-primary mb-3">
                About this item
              </h3>
              <p className="text-gray-600 text-base leading-relaxed">
                {product.longDescription}
              </p>
            </div>

            {/* Merged Specifications & Tags Box */}
            <div className="bg-white border border-[#e0e0e0] rounded-2xl p-6 shadow-sm mb-8">
              <h3 className="text-lg font-bold text-text-primary mb-6 border-b border-[#e0e0e0] pb-4">
                Specifications
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8 mb-6">
                <div>
                  <span className="block text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">
                    Materials
                  </span>
                  <span className="text-sm font-medium text-text-primary">
                    {product.categorization?.materials?.join(", ") || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="block text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">
                    Perfect For
                  </span>
                  {/* 🚀 THE FIX 2: Safely map through room objects to get the name before joining */}
                  <span className="text-sm font-medium text-text-primary capitalize">
                    {product.categorization?.rooms?.length > 0
                      ? product.categorization.rooms.map(room => room.name || room).join(", ").replace(/-/g, " ")
                      : "Any Room"}
                  </span>
                </div>
                <div>
                  <span className="block text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">
                    Dimensions
                  </span>
                  {product.physical?.dimensions ? (
                    <span className="text-sm font-medium text-text-primary">
                      {product.physical.dimensions.width}"W x{" "}
                      {product.physical.dimensions.height}"H x{" "}
                      {product.physical.dimensions.depth}"D
                    </span>
                  ) : (
                    <span className="text-sm font-medium text-text-primary">
                      Standard
                    </span>
                  )}
                </div>
                <div>
                  <span className="block text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">
                    Weight
                  </span>
                  <span className="text-sm font-medium text-text-primary">
                    {product.physical?.weight
                      ? `${product.physical.weight} lbs`
                      : "N/A"}
                  </span>
                </div>
                <div>
                  <span className="block text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">
                    Assembly
                  </span>
                  <span className="text-sm font-medium text-text-primary">
                    {product.physical?.assemblyRequired
                      ? "Required"
                      : "Fully Assembled"}
                  </span>
                </div>
                <div>
                  <span className="block text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">
                    SKU
                  </span>
                  <span className="text-sm font-medium text-text-primary">
                    {product.sku}
                  </span>
                </div>
              </div>

              {/* Tags */}
              {product.categorization?.tags &&
                product.categorization.tags.length > 0 && (
                  <div className="pt-5 border-t border-[#e0e0e0]">
                    <span className="block text-xs text-gray-500 font-bold uppercase tracking-wider mb-3">
                      Tags
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {product.categorization.tags.map((tag) => (
                        <span
                          key={tag}
                          className="bg-gray-50 border border-gray-200 text-gray-600 text-xs font-bold px-3 py-1.5 rounded-md capitalize transition-colors hover:bg-gray-100 cursor-default"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
            </div>

            {/* Quantity Selector Box */}
            <div className="flex flex-col gap-4 mb-8 bg-white p-6 rounded-2xl border border-[#e0e0e0] shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-text-primary">
                  Quantity
                </span>
                <span
                  className={`text-sm font-bold ${isOutOfStock ? "text-red-500" : "text-green-600"}`}
                >
                  {isOutOfStock
                    ? "Out of Stock"
                    : `${product.inventory?.stockQuantity || 0} Available`}
                </span>
              </div>

              {/* Standard +/- Quantity Counter */}
              <div className="flex items-center border border-[#e0e0e0] rounded-xl overflow-hidden h-14 mb-2">
                <button
                  onClick={decreaseQuantity}
                  disabled={quantity <= 1 || isOutOfStock}
                  className="flex-1 h-full flex items-center justify-center bg-gray-50 text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M20 12H4"
                    ></path>
                  </svg>
                </button>

                <div className="w-20 h-full flex items-center justify-center font-extrabold text-lg text-text-primary border-x border-[#e0e0e0]">
                  {quantity}
                </div>

                <button
                  onClick={increaseQuantity}
                  disabled={
                    quantity >= (product.inventory?.stockQuantity || 0) || isOutOfStock
                  }
                  className="flex-1 h-full flex items-center justify-center bg-gray-50 text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 4v16m8-8H4"
                    ></path>
                  </svg>
                </button>
              </div>

              {/* Action Buttons with Toast Container */}
              <div className="relative mt-2">
                {/* The Confirmation Pop-up */}
                {showConfirmation && (
                  <div className="absolute -top-14 left-1/2 transform -translate-x-1/2 bg-[#333333] text-white text-sm font-bold py-2.5 px-5 rounded-lg shadow-xl flex items-center gap-2 z-10 transition-all w-max">
                    <svg
                      className="w-5 h-5 text-green-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="3"
                        d="M5 13l4 4L19 7"
                      ></path>
                    </svg>
                    Added {quantity} to cart!
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={handleAddToCart}
                    disabled={isOutOfStock}
                    className="flex-1 bg-white border-2 border-text-accent text-text-accent font-bold py-4 rounded-xl hover:bg-text-accent hover:text-white transition-all duration-300 disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-white disabled:cursor-not-allowed shadow-sm"
                  >
                    Add to Cart
                  </button>
                  <button
                    disabled={isOutOfStock}
                    className="flex-1 bg-text-accent text-white font-bold py-4 rounded-xl shadow-md hover:bg-green-600 hover:shadow-lg transition-all duration-300 disabled:bg-gray-300 disabled:hover:shadow-md disabled:cursor-not-allowed"
                  >
                    Buy it Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailsPage;