import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axiosConfig';

function AdminUsers() {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [chargement, setChargement] = useState(true);
    const [erreur, setErreur] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        chargerUsers();
    }, []);

    const chargerUsers = async () => {
        try {
            const response = await api.get('/admin/users');
            setUsers(response.data);
        } catch (error) {
            setErreur('Erreur chargement des utilisateurs');
        } finally {
            setChargement(false);
        }
    };

    const changerRole = async (userId, nouveauRole) => {
        if (!window.confirm(`Changer le rôle de cet utilisateur en "${nouveauRole}" ?`)) return;

        try {
            await api.put(`/admin/users/${userId}/role`, { role: nouveauRole });
            setMessage('✅ Rôle modifié avec succès !');
            setTimeout(() => setMessage(''), 3000);
            chargerUsers();
        } catch (error) {
            setErreur(error.response?.data?.message || 'Erreur');
            setTimeout(() => setErreur(''), 3000);
        }
    };

    const supprimerUser = async (userId, userName) => {
        if (!window.confirm(`Supprimer définitivement "${userName}" ?`)) return;

        try {
            await api.delete(`/admin/users/${userId}`);
            setMessage(`✅ "${userName}" supprimé avec succès !`);
            setTimeout(() => setMessage(''), 3000);
            chargerUsers();
        } catch (error) {
            setErreur(error.response?.data?.message || 'Erreur');
            setTimeout(() => setErreur(''), 3000);
        }
    };

    const estAdmin = (role) => role === 'admin';
    const estMoi = (userId) => userId === user?.id;

    if (chargement) {
        return (
            <div className="container section fade">
                <div className="loader"></div>
            </div>
        );
    }

    return (
        <div className="container section fade">
            <div className="admin-produits-header flex-between">
                <h1>👤 Gestion des utilisateurs</h1>
                <span className="text-muted">{users.length} utilisateur(s)</span>
            </div>

            {message && <div className="alert alert-success">{message}</div>}
            {erreur && <div className="alert alert-danger">{erreur}</div>}

            <div className="table-card">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nom</th>
                            <th>Email</th>
                            <th>Rôle</th>
                            <th>Inscrit le</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((u) => (
                            <tr key={u.id} className={estMoi(u.id) ? 'user-me' : ''}>
                                <td>{u.id}</td>
                                <td>
                                    {u.nom} {estMoi(u.id) && <span className="badge-me">(vous)</span>}
                                </td>
                                <td>{u.email}</td>
                                <td>
                                    <span className={`role-badge ${estAdmin(u.role) ? 'role-admin' : 'role-client'}`}>
                                        {estAdmin(u.role) ? '👑 Admin' : '🛒 Client'}
                                    </span>
                                </td>
                                <td>{new Date(u.created_at).toLocaleDateString('fr-FR')}</td>
                                <td>
                                    <div className="actions">
                                        <Link to={`/profile/${u.id}`}>
                                            <button className="btn btn-outline btn-sm" title="Voir profil">
                                                Voir
                                            </button>
                                        </Link>

                                        <select
                                            value={u.role}
                                            onChange={(e) => changerRole(u.id, e.target.value)}
                                            disabled={estMoi(u.id)}
                                            className="statut-select"
                                        >
                                            <option value="client">Client</option>
                                            <option value="admin">Admin</option>
                                        </select>

                                        <button
                                            onClick={() => supprimerUser(u.id, u.nom)}
                                            disabled={estMoi(u.id)}
                                            className="icon-btn delete"
                                            title={estMoi(u.id) ? "Vous ne pouvez pas vous supprimer" : "Supprimer"}
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

export default AdminUsers;
