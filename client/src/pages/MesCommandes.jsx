import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosConfig';

function MesCommandes() {
    const { isAuthenticated } = useAuth();
    const [commandes, setCommandes] = useState([]);
    const [chargement, setChargement] = useState(true);
    const [erreur, setErreur] = useState('');

    useEffect(() => {
        if (!isAuthenticated) return;
        chargerCommandes();
    }, [isAuthenticated]);

    const chargerCommandes = async () => {
        try {
            const response = await api.get('/mes-commandes');
            setCommandes(response.data);
        } catch (error) {
            setErreur('Erreur chargement des commandes');
        } finally {
            setChargement(false);
        }
    };

    const getStatutBadge = (statut) => {
        const classes = {
            'en_attente': 'badge-warning',
            'en_preparation': 'badge-primary',
            'livree': 'badge-success'
        };
        const labels = {
            'en_attente': '⏳ En attente',
            'en_preparation': '🔧 En préparation',
            'livree': '✅ Livrée'
        };
        return <span className={`badge ${classes[statut] || 'badge-warning'}`}>{labels[statut] || statut}</span>;
    };

    if (chargement) return (
        <div className="container section">
            <div className="loader">⏳ Chargement...</div>
        </div>
    );

    return (
        <div className="container section fade">
            <h1 className="section-title">📦 Mes commandes</h1>

            {erreur && <div className="alert alert-danger">{erreur}</div>}

            {commandes.length === 0 ? (
                <div className="empty-state">
                    <div style={{ fontSize: '64px' }}>📦</div>
                    <h2>Vous n'avez pas encore de commandes</h2>
                    <p>Découvrez nos produits et passez votre première commande.</p>
                    <Link to="/boutique">
                        <button className="btn btn-primary">Voir la boutique</button>
                    </Link>
                </div>
            ) : (
                <div className="table-card">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>N°</th>
                                <th>Date</th>
                                <th>Total</th>
                                <th>Statut</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {commandes.map((c, index) => (
                                <tr key={c.id}>
                                    {/* ✅ AFFICHAGE : index + 1 au lieu de c.id */}
                                    <td>#{index + 1}</td>
                                    <td>{new Date(c.date_commande).toLocaleDateString('fr-FR')}</td>
                                    <td><strong>{c.total} DA</strong></td>
                                    <td>{getStatutBadge(c.statut)}</td>
                                    <td>
                                        <Link to={`/commande/${c.id}`}>
                                            <button className="btn btn-outline btn-sm" title="Voir détails">
                                                Voir
                                            </button>
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default MesCommandes;
