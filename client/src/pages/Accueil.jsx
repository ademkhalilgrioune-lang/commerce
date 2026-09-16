import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosConfig';
import ProductCard from '../components/common/ProductCard';
import '../styles/global.css';

function Accueil() {
    const { user, isAuthenticated } = useAuth();
    const [produits, setProduits] = useState([]);
    const [chargement, setChargement] = useState(true);
    const [stats, setStats] = useState({
        produits: 0,
        clients: 0,
        totalAvis: 0,
        moyenneAvis: 0
    });

    const chargerStats = async () => {
        try {
            const response = await api.get('/stats');
            setStats({
                produits: Number(response.data.produits) || 0,
                clients: Number(response.data.clients) || 0,
                totalAvis: Number(response.data.totalAvis) || 0,
                moyenneAvis: Number(response.data.moyenneAvis) || 0
            });
        } catch (error) {
            console.error('Erreur chargement stats:', error);
        }
    };

    useEffect(() => {
        const fetchProduits = async () => {
            try {
                const response = await api.get('/produits');
                setProduits(response.data.slice(0, 10));
            } catch (error) {
                console.error('Erreur chargement produits:', error);
            } finally {
                setChargement(false);
            }
        };
        fetchProduits();
        chargerStats();
    }, []);

    const ajouterAuPanier = async (produitId) => {
        try {
            await api.post('/panier', { id_produit: produitId, quantite: 1 });
            // Message optionnel
        } catch (error) {
            console.error('Erreur ajout panier:', error);
        }
    };

    // ==========================================
    // PAGE ADMIN
    // ==========================================
    if (isAuthenticated && user?.role === 'admin') {
        return (
            <div className="admin-page fade">
                <div className="admin-content">
                    <div className="admin-header">
                        <h1>👑 Bonjour {user.nom}</h1>
                        <p>Bienvenue dans votre espace d'administration</p>
                    </div>

                    <div className="stats-grid">
                        <div className="stat-card">
                            <h3>{stats.produits}</h3>
                            <p>📦 Produits</p>
                        </div>
                        <div className="stat-card">
                            <h3>{stats.clients}</h3>
                            <p>👤 Clients</p>
                        </div>
                        <div className="stat-card">
                            <h3>{stats.totalAvis}</h3>
                            <p>💬 Avis</p>
                        </div>
                    </div>

                    <div className="admin-menu">
                        <Link to="/admin/produits" className="card hover-up">
                            <span>📦</span>
                            <h3>Produits</h3>
                            <p>Ajouter, modifier, supprimer</p>
                        </Link>
                        <Link to="/admin/users" className="card hover-up">
                            <span>👤</span>
                            <h3>Utilisateurs</h3>
                            <p>Gérer les comptes</p>
                        </Link>
                        <Link to="/admin/commandes" className="card hover-up">
                            <span>🧾</span>
                            <h3>Commandes</h3>
                            <p>Suivi et statuts</p>
                        </Link>
                    </div>

                    <div className="text-center mt-4">
                        <Link to="/boutique">
                            <button className="btn btn-primary">🛍️ Voir la boutique</button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // ==========================================
    // PAGE CLIENT
    // ==========================================
    if (chargement) {
        return (
            <div className="container section">
                <div className="loader">⏳ Chargement...</div>
            </div>
        );
    }

    return (
        <div className="accueil-container">
            {/* HERO */}
            <div className="hero">
                <div className="hero-background"></div>
                <div className="hero-content">
                    <span className="hero-badge">✨ Nouvelle collection</span>
                    <h1>
                        <span className="hero-highlight">Solstice</span>
                        <br />
                        <span className="hero-sub">Votre boutique en ligne</span>
                    </h1>
                    <p className="hero-text">
                        {user 
                            ? `Bonjour ${user.nom} ! Découvrez nos nouveautés.`
                            : 'Connectez-vous pour accéder à votre espace.'}
                    </p>
                    <div className="hero-actions">
                        <Link to="/boutique">
                            <button className="btn btn-primary btn-lg">🛍️ Voir tous les produits</button>
                        </Link>
                        {!user && (
                            <Link to="/auth">
                                <button className="btn btn-outline btn-lg">🔐 Se connecter</button>
                            </Link>
                        )}
                    </div>
                    <div className="hero-stats">
                        <div>
                            <span className="hero-stat-number">{stats.produits > 100 ? '+100' : stats.produits}</span>
                            <span className="hero-stat-label">Produits</span>
                        </div>
                        <div className="hero-stat-divider"></div>
                        <div>
                            <span className="hero-stat-number">{stats.clients > 100 ? '+100' : stats.clients}</span>
                            <span className="hero-stat-label">Clients</span>
                        </div>
                        <div className="hero-stat-divider"></div>
                        <div>
                            <span className="hero-stat-number">{stats.totalAvis > 100 ? '+100' : stats.totalAvis}</span>
                            <span className="hero-stat-label">Avis</span>
                        </div>
                        <div className="hero-stat-divider"></div>
                        <div>
                            <span className="hero-stat-number">{stats.moyenneAvis > 0 ? stats.moyenneAvis.toFixed(1) + '★' : '-'}</span>
                            <span className="hero-stat-label">Note moyenne</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* PRODUITS AVEC ProductCard */}
            <section className="section">
                <div className="section-title">
                    <h2>✨ Nouveautés</h2>
                    <p>Découvrez nos derniers produits</p>
                </div>
                <div className="products-grid">
                    {produits.map((produit) => (
                        <ProductCard 
                            key={produit.id} 
                            produit={produit} 
                            onAjouterPanier={ajouterAuPanier}
                            showAddButton={true}
                        />
                    ))}
                </div>
            </section>


        </div>
    );
}

export default Accueil;
