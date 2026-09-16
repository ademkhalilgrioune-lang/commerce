import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axiosConfig';

function AdminCommandes() {
    const { user } = useAuth();
    const [commandes, setCommandes] = useState([]);
    const [chargement, setChargement] = useState(true);
    const [erreur, setErreur] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        chargerCommandes();
    }, []);

    const chargerCommandes = async () => {
        try {
            const response = await api.get('/admin/orders');
            setCommandes(response.data);
        } catch (error) {
            setErreur('Erreur chargement des commandes');
            console.error('Erreur:', error);
        } finally {
            setChargement(false);
        }
    };

    const getStatutBadge = (statut) => {
        const classes = {
            'en_attente': 'badge-warning',
            'en_preparation': 'badge-primary',
            'livree': 'badge-success',
            'refusee': 'badge-danger'
        };
        const labels = {
            'en_attente': '⏳ En attente',
            'en_preparation': '🔧 En préparation',
            'livree': '✅ Livrée',
            'refusee': '❌ Refusée'
        };
        return <span className={`badge ${classes[statut] || 'badge-warning'}`}>{labels[statut] || statut}</span>;
    };

    if (chargement) {
        return (
            <div className="container section fade">
                <div className="loader"></div>
            </div>
        );
    }

    if (erreur) return (
        <div className="container section">
            <div className="alert alert-danger">{erreur}</div>
        </div>
    );

    return (
        <div className="container section fade">
            <div className="admin-produits-header flex-between">
                <h1>🧾 Gestion des commandes</h1>
                <span className="text-muted">{commandes.length} commande(s)</span>
            </div>

            {message && <div className="alert alert-success">{message}</div>}

            <div className="table-card">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Client</th>
                            <th>Date</th>
                            <th>Total</th>
                            <th>Statut</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {commandes.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="text-center text-muted">
                                    Aucune commande pour le moment
                                </td>
                            </tr>
                        ) : (
                            commandes.map((c) => (
                                <tr key={c.id}>
                                    <td>#{c.id}</td>
                                    <td>
                                        <Link to={`/profile/${c.id_utilisateur}`} className="text-primary">
                                            {c.nom_utilisateur}
                                        </Link>
                                    </td>
                                    <td>{new Date(c.date_commande).toLocaleDateString('fr-FR')}</td>
                                    <td><strong>{c.total} DA</strong></td>
                                    <td>{getStatutBadge(c.statut)}</td>
                                    <td>
                                        <div className="actions">
                                            <Link to={`/commande/${c.id}`}>
                                                <button className="btn btn-outline btn-sm" title="Voir détails">
                                                    👁️ Voir
                                                </button>
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mt-3 text-center">
                <Link to="/accueil">
                    <button className="btn btn-outline">⬅ Retour à l'accueil</button>
                </Link>
            </div>
        </div>
    );
}

export default AdminCommandes;