import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { formatPrice } from '../../utils/formatPrice';

function ProductCard({ produit, onAjouterPanier, showAddButton = true }) {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

const BASE_URL = import.meta.env.VITE_API_URL;

const getImageUrl = (photoPath) => {
    if (!photoPath) return null;

    if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) {
        return photoPath;
    }

    const timestamp = Date.now();
    return `${BASE_URL}${photoPath}?t=${timestamp}`;
};

    const imageUrl = getImageUrl(produit.photo);
 
    console.log('PHOTO:', produit.photo);
    console.log('IMAGE URL:', imageUrl);

    return (
        <div className="product-card">
            <div className="product-image">
                {imageUrl ? (
                    <img 
                        src={imageUrl}
                        alt={produit.nom}
                        onError={(e) => {
                            e.target.style.display = 'none';
                            const parent = e.target.parentElement;
                            if (!parent.querySelector('.no-image')) {
                                const fallback = document.createElement('div');
                                fallback.className = 'no-image';
                                fallback.textContent = '📦';
                                fallback.style.cssText = `
                                    font-size: 4rem;
                                    color: #94a3b8;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    width: 100%;
                                    height: 100%;
                                    background: #f1f5f9;
                                `;
                                parent.appendChild(fallback);
                            }
                        }}
                    />
                ) : (
                    <div className="no-image" style={{
                        fontSize: '4rem',
                        color: '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        height: '100%',
                        background: '#f1f5f9'
                    }}>📦</div>
                )}
            </div>
            <div className="product-info">
                <h3 className="product-title">{produit.nom}</h3>
                <p className="product-price">{formatPrice(produit.prix)}</p>
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                    {produit.stock > 0 ? `✅ Stock: ${produit.stock}` : '❌ Rupture'}
                </p>
                <div className={`product-actions ${isAdmin ? 'admin-mode' : ''}`}>
                    <Link to={`/produit/${produit.id}`} className="view-link">
                        <button className="btn btn-outline view-btn">Voir</button>
                    </Link>
                    {showAddButton && !isAdmin && (
                        <button
                            className="btn btn-primary"
                            onClick={() => onAjouterPanier?.(produit.id)}
                            disabled={produit.stock <= 0}
                        >
                            🛒 Ajouter
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ProductCard;