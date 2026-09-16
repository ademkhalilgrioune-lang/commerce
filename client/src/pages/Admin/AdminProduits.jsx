import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axiosConfig';

function AdminProduits() {
    const { user } = useAuth();
    const [produits, setProduits] = useState([]);
    const [categories, setCategories] = useState([]);
    const [chargement, setChargement] = useState(true);
    const [erreur, setErreur] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        chargerProduits();
        chargerCategories();
    }, []);

    const chargerProduits = async () => {
        try {
            const response = await api.get('/produits');
            setProduits(response.data);
        } catch (error) {
            setErreur('Erreur chargement des produits');
        } finally {
            setChargement(false);
        }
    };

    const chargerCategories = async () => {
        try {
            const response = await api.get('/categories');
            setCategories(response.data);
        } catch (error) {
            console.error('Erreur chargement catégories:', error);
        }
    };

    const supprimerProduit = async (produitId, produitNom) => {
        if (!window.confirm(`Supprimer définitivement "${produitNom}" ?`)) return;

        try {
            await api.delete(`/produits/${produitId}`);
            setMessage(`✅ "${produitNom}" supprimé avec succès !`);
            setTimeout(() => setMessage(''), 3000);
            chargerProduits();
        } catch (error) {
            setErreur(error.response?.data?.message || 'Erreur');
            setTimeout(() => setErreur(''), 3000);
        }
    };

    const getImageUrl = (photoPath) => {
        if (!photoPath) return null;
        if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) {
            return photoPath;
        }
        return `http://192.168.100.6:5001${photoPath}`;
    };

    const getCategorieNom = (id) => {
        const cat = categories.find(c => c.id === id);
        return cat ? cat.nom : 'Non catégorisé';
    };

    if (chargement) return (
        <div className="container section">
            <div className="loader">⏳ Chargement...</div>
        </div>
    );

    return (
        <div className="container section fade">
            <div className="admin-produits-header flex-between">
                <h1>📦 Gestion des produits</h1>
                <span className="text-muted">{produits.length} produit(s)</span>
            </div>

            {message && <div className="alert alert-success">{message}</div>}
            {erreur && <div className="alert alert-danger">{erreur}</div>}

            <div className="table-card">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Image</th>
                            <th>Nom</th>
                            <th>Prix</th>
                            <th>Stock</th>
                            <th>Catégorie</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {produits.map((p) => (
                            <tr key={p.id}>
                                <td>{p.id}</td>
                                <td>
                                    {p.photo ? (
                                        <img src={getImageUrl(p.photo)} alt={p.nom} className="admin-produit-image" />
                                    ) : (
                                        <span className="no-image">📦</span>
                                    )}
                                </td>
                                <td>{p.nom}</td>
                                <td>{p.prix} DA</td>
                                <td>{p.stock}</td>
                                <td>{getCategorieNom(p.id_categorie)}</td>
                                <td>
                                    <div className="actions">
                                        <Link to={`/produit/${p.id}`}>
                                            <button className="btn btn-outline btn-sm" title="Voir le produit">
                                                Voir
                                            </button>
                                        </Link>
                                        <Link to={`/admin/produits/modifier/${p.id}`}>
                                            <button className="icon-btn" title="Modifier">✏️</button>
                                        </Link>
                                        <button
                                            onClick={() => supprimerProduit(p.id, p.nom)}
                                            className="icon-btn delete"
                                            title="Supprimer"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* BOUTON AJOUTER */}
            <div className="mt-3">
                <Link to="/admin/produits/ajouter">
                    <button id="ajout" className="btn btn-primary">➕ Ajouter un produit</button>
                </Link>
            </div>

            {/* BOUTON RETOUR À L'ACCUEIL */}
            <div className="mt-3 text-center">
                <Link to="/accueil">
                    <button className="btn btn-outline">
                        ⬅ Retour à l'accueil
                    </button>
                </Link>
            </div>
        </div>
    );
}

export default AdminProduits;
