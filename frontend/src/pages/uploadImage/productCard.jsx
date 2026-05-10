import React from 'react';
import styles from "./uploadImagePage.module.css";
import * as Icons from 'lucide-react';

const BACKEND_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');

{/* Product Card Component */ }
export default function ProductCard({ product }) {
    const { name, shortDescription, pricing, media, slug } = product;

    const currentPrice = pricing?.currentPrice || 0;
    const originalPrice = pricing?.originalPrice || currentPrice;
    const isOnSale = pricing?.isOnSale || false;

    return (
        <div className={styles.productCard}>
            <div className={styles.productImageWrap}>
                <img
                    src={media?.primaryImage?.startsWith('http') ? media.primaryImage : `${BACKEND_URL}${media?.primaryImage}`}
                    alt={name}
                    className={styles.productImage}
                    onError={(e) => {
                        e.target.src = '/placeholder-furniture.jpg'; // fallback
                    }}
                />
                {isOnSale && <div className={styles.productBadge}>On Sale</div>}
            </div>

            <div className={styles.productInfo}>
                <div>
                    <h4 className={styles.productName}>{name}</h4>
                    <span className={styles.productDesc}>
                        {shortDescription?.length > 80
                            ? shortDescription.substring(0, 77) + '...'
                            : shortDescription}
                    </span>
                </div>

                <div className={styles.productPriceContainer}>
                    {isOnSale && (
                        <span className={styles.originalPrice}>${originalPrice}</span>
                    )}
                    <span className={styles.productPrice}>${currentPrice}</span>
                </div>
            </div>

            <div className={styles.productActions}>
                <button
                    className={styles.viewDetailsBtn}
                    onClick={() => window.location.href = `/product/${slug || product._id}`}
                >
                    View Details
                </button>
                <button className={styles.addToCartBtn}>
                    <Icons.Plus size={16} />
                </button>
            </div>
        </div>
    );
}