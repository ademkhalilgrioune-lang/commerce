import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosConfig';
import ProductCard from '../components/common/ProductCard';
import '../styles/global.css';

function Boutique() {
    const [categories, setCategories] = useState([]);
    const [categorieSelectionnee, setCategorieSelectionnee] = useState('');
    const [chargement, setChargement] = useState(true);
    const [erreur, setErreur] = useState('');
    const [message, setMessage] = useState('');
    const { user, isAuthenticated } = useAuth();
    const [recherche, setRecherche] = useState('');
    const [produits, setProduits] = useState([]);

    useEffect(() => {
        chargerCategories();
        chargerProduits();
    }, []);

    const chargerCategories = async () => {
        try {
            const response = await api.get('/categories');
            setCategories(response.data);
        } catch (error) {
            console.error('Erreur chargement catégories:', error);
        }
    };

    const chargerProduits = async (categorieId = '') => {
        try {
            setChargement(true);
            const url = categorieId ? `/produits?categorie=${categorieId}` : '/produits';
            const response = await api.get(url);
            setProduits(response.data);
            setErreur('');
        } catch (error) {
            setErreur('Erreur chargement des produits');
            console.error('Erreur:', error);
        } finally {
            setChargement(false);
        }
    };

    // ✅ FILTRAGE RECHERCHE SUR LES PRODUITS CHARGÉS
    const produitsFiltres = useMemo(() => {
        if (!recherche.trim()) return produits;
        return produits.filter((p) =>
            p.nom.toLowerCase().includes(recherche.toLowerCase())
        );
    }, [produits, recherche]);

    const handleFiltreCategorie = (categorieId) => {
        setCategorieSelectionnee(categorieId);
        setRecherche('');
        chargerProduits(categorieId);
    };

    const ajouterAuPanier = async (produitId) => {
        if (!isAuthenticated) {
            setMessage('🔐 Connectez-vous pour ajouter au panier');
            setTimeout(() => setMessage(''), 3000);
            return;
        }

        try {
            await api.post('/panier', { id_produit: produitId, quantite: 1 });
            setMessage('✅ Ajouté au panier !');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            setMessage('❌ Erreur : ' + (error.response?.data?.message || ''));
            setTimeout(() => setMessage(''), 3000);
        }
    };

    const handleRechercheChange = (e) => {
        setRecherche(e.target.value);
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
            <div className="container section fade">
                <div className="alert alert-danger">{erreur}</div>
            </div>
        );
    }

    return (
        <div className="container section fade">
            <div className="section-title">
                <h1>🛍️ Tous nos produits</h1>
            </div>

            {/* BARRE DE RECHERCHE */}
            <div className="search-bar">
                <input
                    type="text"
                    placeholder="🔍 Rechercher un produit..."
                    value={recherche}
                    onChange={handleRechercheChange}
                />
            </div>

            {/* FILTRES PAR CATÉGORIE */}
            <div className="filters">
                <button
                    className={`filter-btn ${categorieSelectionnee === '' ? 'active' : ''}`}
                    onClick={() => handleFiltreCategorie('')}
                >
                    Tous
                </button>
                {categories.map((cat) => (
                    <button
                        key={cat.id}
                        className={`filter-btn ${categorieSelectionnee === String(cat.id) ? 'active' : ''}`}
                        onClick={() => handleFiltreCategorie(String(cat.id))}
                    >
                        {cat.nom}
                    </button>
                ))}
            </div>

            {message && <div className="alert alert-success">{message}</div>}

            {/* GRILLE PRODUITS */}
            {produitsFiltres.length === 0 ? (
                <div className="empty-state">
                    <p>
                        {recherche 
                            ? `Aucun produit ne correspond à "${recherche}"`
                            : 'Aucun produit dans cette catégorie.'}
                    </p>
                </div>
            ) : (
                <div className="products-grid">
                    {produitsFiltres.map((produit) => (
                        <ProductCard 
                            key={produit.id} 
                            produit={produit} 
                            onAjouterPanier={ajouterAuPanier}
                            showAddButton={true}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default Boutique;