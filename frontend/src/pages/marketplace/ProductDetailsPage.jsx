import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Header from './MarketHeader';


const ProductDetailsPage = () => {
    const { slug } = useParams();
    const navigate = useNavigate();

    // State
    const [product, setProduct] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [quantity, setQuantity] = useState(1);

    // Fetch the single product data
    useEffect(() => {
        const fetchProduct = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL_BACKEND_BASE}/products/${slug}`);
                const result = await response.json();

                if (result.success) {
                    setProduct(result.data);
                } else {
                    setError('Product not found.');
                }
            } catch (err) {
                console.error("Fetch error:", err);
                setError('Could not connect to the server.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchProduct();
    }, [slug]);

    // Quantity Handlers
    const increaseQuantity = () => {
        // Prevent user from ordering more than what is in stock
        if (quantity < product.inventory.stockQuantity) {
            setQuantity(prev => prev + 1);
        }
    };

    const decreaseQuantity = () => {
        if (quantity > 1) {
            setQuantity(prev => prev - 1);
        }
    };

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
                <h2 className="text-2xl font-bold text-gray-800 mb-4">{error || 'Product not found'}</h2>
                <button onClick={() => navigate('/marketplace')} className="text-text-accent hover:underline font-bold">
                    &larr; Back to Marketplace
                </button>
            </div>
        );
    }

    const isOutOfStock = product.inventory.stockQuantity === 0;

    return (
        <div className="min-h-screen bg-[#f9fafb] flex flex-col">

            <div className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">

                {/* Breadcrumbs */}
                <nav className="flex text-sm text-gray-500 mb-8 font-medium">
                    <Link to="/" className="hover:text-text-accent transition-colors">Home</Link>
                    <span className="mx-2">/</span>
                    <Link to="/marketplace" className="hover:text-text-accent transition-colors">Marketplace</Link>
                    <span className="mx-2">/</span>
                    <Link to={`/marketplace/category/${product.categorization.primary.toLowerCase()}`} className="hover:text-text-accent transition-colors">
                        {product.categorization.primary}
                    </Link>
                    <span className="mx-2">/</span>
                    <span className="text-text-primary font-bold truncate max-w-[200px]">{product.name}</span>
                </nav>

                {/* Main Two-Column Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16">

                    {/*  Image Gallery */}
                    <div className="flex flex-col gap-4">
                        {/* Main Image */}
                        <div className="aspect-square bg-gray-100 rounded-2xl overflow-hidden relative border border-[#e0e0e0]">
                            <img
                                src={product.media.primaryImage}
                                alt={product.name}
                                className="absolute top-0 left-0 w-full h-full !rounded-none"
                            />
                            {product.pricing.isOnSale && (
                                <div className="absolute top-4 left-4 bg-red-500 text-white text-sm font-extrabold px-3 py-1.5 rounded shadow-sm">
                                    SALE
                                </div>
                            )}
                        </div>
                    </div>

                    {/*  Product Details */}
                    <div className="flex flex-col">

                        <div className="mb-6">
                            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">
                                {product.brand}
                            </h2>
                            <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight mb-4">
                                {product.name}
                            </h1>

                            {/* Rating */}
                            <div className="flex items-center gap-2 mb-4">
                                <div className="flex text-yellow-400">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                                </div>
                                <span className="text-sm font-bold text-gray-700">{product.social.averageRating}</span>
                                <span className="text-sm text-gray-500 underline cursor-pointer hover:text-text-accent">
                                    Read {product.social.reviewCount} Reviews
                                </span>
                            </div>

                            {/* Price */}
                            <div className="flex items-baseline gap-4">
                                <span className="text-4xl font-extrabold text-text-primary">
                                    ${product.pricing.currentPrice}
                                </span>
                                {product.pricing.isOnSale && (
                                    <span className="text-xl font-medium text-gray-400 line-through">
                                        ${product.pricing.originalPrice}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Description */}
                        <p className="text-gray-600 text-base leading-relaxed mb-8">
                            {product.longDescription}
                        </p>

                        <hr className="border-[#e0e0e0] mb-8" />

                        <div className="flex flex-col gap-6 mb-8">

                            <div className="flex items-center gap-4">
                                <span className="text-sm font-bold text-text-primary">Quantity</span>

                                {/* Quantity Selector */}
                                <div className="flex items-center border border-[#e0e0e0] rounded-lg overflow-hidden h-12">
                                    <button
                                        onClick={decreaseQuantity}
                                        disabled={quantity <= 1 || isOutOfStock}
                                        className="w-12 h-full flex items-center justify-center bg-gray-50 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"></path></svg>
                                    </button>

                                    <div className="w-14 h-full flex items-center justify-center font-bold text-text-primary border-x border-[#e0e0e0]">
                                        {quantity}
                                    </div>

                                    <button
                                        onClick={increaseQuantity}
                                        disabled={quantity >= product.inventory.stockQuantity || isOutOfStock}
                                        className="w-12 h-full flex items-center justify-center bg-gray-50 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                                    </button>
                                </div>

                                <span className="text-sm text-gray-500">
                                    {isOutOfStock ? (
                                        <span className="text-red-500 font-bold">Out of Stock</span>
                                    ) : (
                                        `${product.inventory.stockQuantity} available`
                                    )}
                                </span>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-4">
                                <button
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

                        {/* Product Specifications Grid */}
                        <div className="bg-white border border-[#e0e0e0] rounded-2xl p-6 shadow-sm">
                            <h3 className="text-lg font-bold text-text-primary mb-4">Product Details</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                                <div>
                                    <span className="block text-xs text-gray-500 font-bold uppercase tracking-wider">Materials</span>
                                    <span className="text-sm text-text-primary">{product.categorization.materials.join(', ')}</span>
                                </div>
                                <div>
                                    <span className="block text-xs text-gray-500 font-bold uppercase tracking-wider">Dimensions</span>
                                    {product.physical?.dimensions ? (
                                        <span className="text-sm text-text-primary">
                                            {product.physical.dimensions.width}"W x {product.physical.dimensions.height}"H x {product.physical.dimensions.depth}"D
                                        </span>
                                    ) : (
                                        <span className="text-sm text-text-primary">Standard</span>
                                    )}
                                </div>
                                <div>
                                    <span className="block text-xs text-gray-500 font-bold uppercase tracking-wider">Assembly</span>
                                    <span className="text-sm text-text-primary">{product.physical.assemblyRequired ? 'Required' : 'Fully Assembled'}</span>
                                </div>
                                <div>
                                    <span className="block text-xs text-gray-500 font-bold uppercase tracking-wider">SKU</span>
                                    <span className="text-sm text-text-primary">{product.sku}</span>
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