import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosConfig';

function Panier() {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [panier, setPanier] = useState([]);
    const [total, setTotal] = useState(0);
    const [chargement, setChargement] = useState(true);
    const [erreur, setErreur] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/auth');
            return;
        }
        chargerPanier();
    }, [isAuthenticated, navigate]);

    const chargerPanier = async () => {
        try {
            const response = await api.get('/panier');
            setPanier(response.data.panier || []);
            setTotal(response.data.total || 0);
        } catch (error) {
            setErreur('Erreur chargement du panier');
            console.error('Erreur:', error);
        } finally {
            setChargement(false);
        }
    };

    const modifierQuantite = async (produitId, delta) => {
        try {
            await api.put(`/panier/${produitId}`, { delta });
            await chargerPanier();
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Erreur modification quantité';
            setMessage(`❌ ${errorMsg}`);
            setTimeout(() => setMessage(''), 5000);
        }
    };

    const supprimerDuPanier = async (produitId) => {
        try {
            await api.delete(`/panier/${produitId}`);
            await chargerPanier();
        } catch (error) {
            setMessage('❌ Erreur suppression');
            setTimeout(() => setMessage(''), 5000);
        }
    };

    const validerCommande = async () => {
        try {
            const response = await api.post('/commandes/valider');
            setMessage('✅ Commande validée avec succès !');
            setTimeout(() => {
                navigate('/mes-commandes');
            }, 1500);
        } catch (error) {
            setMessage('❌ Erreur : ' + (error.response?.data?.message || ''));
            setTimeout(() => setMessage(''), 5000);
        }
    };

    const getImageUrl = (photoPath) => {
        if (!photoPath) return null;
        if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) {
            return photoPath;
        }
        return `http://192.168.100.6:5001${photoPath}`;
    };

    if (chargement) {
        return (
            <div className="container section fade">
                <div className="loader"></div>
            </div>
        );
    }

    if (erreur) {
        return (
            <div className="container section">
                <div className="alert alert-danger">{erreur}</div>
            </div>
        );
    }

    if (panier.length === 0) {
        return (
            <div className="container section">
                <div className="empty-state">
                    <div>🛒</div>
                    <h2>Votre panier est vide</h2>
                    <p>Découvrez nos produits et ajoutez-en à votre panier.</p>
                    <Link to="/boutique">
                        <button className="btn btn-primary">Voir la boutique</button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="container section">
            <div className="container cart-page fade">
                <div className="section-title">
                    <h1 className="panier-titre">🛒 Mon Panier</h1>
                </div>

                {message && (
                    <div className={`alert ${message.includes('❌') ? 'alert-danger' : 'alert-success'}`}>
                        {message}
                    </div>
                )}

                <div className="cart-items">
                    {panier.map((item) => (
                        <div key={item.id} className="cart-item">
                            <div className="cart-item-image">
                                {item.photo ? (
                                    <img 
                                        src={getImageUrl(item.photo)} 
                                        alt={item.nom}
                                        onError={(e) => e.target.src = '/images/default-product.jpg'}
                                    />
                                ) : (
                                    <span>📦</span>
                                )}
                            </div>

                            <div className="cart-item-info">
                                <h3>{item.nom}</h3>
                                <p className="cart-item-price">
                                    {item.prix_unitaire} da / unité
                                </p>
                            </div>

                            <div className="cart-quantity">
                                <button
                                    className="qty-btn"
                                    onClick={() => modifierQuantite(item.id_produit, -1)}
                                    disabled={item.quantite <= 1}
                                >
                                    −
                                </button>
                                <span>{item.quantite}</span>
                                <button
                                    className="qty-btn"
                                    onClick={() => modifierQuantite(item.id_produit, 1)}
                                >
                                    +
                                </button>
                            </div>

                            <div className="product-price">
                                {(item.prix_unitaire * item.quantite).toFixed(2)} da
                            </div>

                            <button
                                className="btn btn-danger"
                                onClick={() => supprimerDuPanier(item.id_produit)}
                            >
                                🗑️
                            </button>
                        </div>
                    ))}
                </div>

                <div className="cart-summary">
                    <div className="summary-total">
                        <span>Total</span>
                        <span className="product-price">{total.toFixed(2)} da</span>
                    </div>

                    {/* ✅ MODIFICATION ICI : id="cart-actions" au lieu de id="view-link" */}
                    <div className="cart-actions" id="cart-actions">
                        <Link to="/accueil">
                            {/* ✅ MODIFICATION ICI : className="btn btn-outline" sans id */}
                            <button className="btn btn-outline">🛍️ Continuer</button>
                        </Link>
                        <button
                            className="btn btn-success"
                            onClick={validerCommande}
                            disabled={panier.length === 0}
                        >
                            ✅ Valider la commande
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Panier;
