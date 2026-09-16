import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';  // ← AJOUTE useParams
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosConfig';


function Profile() {
    const { id } = useParams();  // ← Récupère l'ID depuis l'URL
    const { user, isAuthenticated } = useAuth();  // ← AJOUTE user
    const navigate = useNavigate();
    const [userInfo, setUserInfo] = useState({});
    const [chargement, setChargement] = useState(true);
    const [erreur, setErreur] = useState('');
    const [estMonProfil, setEstMonProfil] = useState(true);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/auth');
            return;
        }

        const fetchUser = async () => {
            try {
                let response;
                
                // Si un ID est fourni dans l'URL
                if (id) {
                    // Vérifier si c'est son propre profil
                    if (parseInt(id) === user?.id) {
                        response = await api.get('/auth/profil');
                        setEstMonProfil(true);
                    } else {
                        // Profil d'un autre utilisateur (admin seulement)
                        response = await api.get(`/admin/users/${id}`);
                        setEstMonProfil(false);
                    }
                } else {
                    // Pas d'ID → son propre profil
                    response = await api.get('/auth/profil');
                    setEstMonProfil(true);
                }
                
                setUserInfo(response.data);
            } catch (error) {
                setErreur('Erreur chargement du profil');
                console.error('Erreur:', error);
            } finally {
                setChargement(false);
            }
        };

        fetchUser();
    }, [isAuthenticated, navigate, id, user?.id]);

    if (chargement) {
        return (
            <div className="container section fade">
                <div className="loader"></div>
            </div>
        );
    }

    if (erreur) {
        navigate('/');
        return null;
    }

    return (
        <div className="container section fade">
            <div className="card profile-card">
                <div className="section-title">
                <h2>{estMonProfil ? '👤 Mon Profil' : `👤 Profil de ${userInfo.nom || 'Utilisateur'}`}</h2>
                </div>
                <div className="profile-info">
                    <div className="info-row">
                        <span className="info-label">Nom :</span>
                        <span className="info-value">{userInfo.nom || '-'}</span>
                    </div>
                    
                    <div className="info-row">
                        <span className="info-label">Email :</span>
                        <span className="info-value">{userInfo.email || '-'}</span>
                    </div>
                    
                    <div className="info-row">
                        <span className="info-label">Rôle :</span>
                        <span className="info-value">
                            {userInfo.role === 'admin' ? '👑 Administrateur' : '🛒 Client'}
                        </span>
                    </div>
                    
                    <div className="info-row">
                        <span className="info-label">Inscrit le :</span>
                        <span className="info-value">
                            {userInfo.created_at 
                                ? new Date(userInfo.created_at).toLocaleDateString('fr-FR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric'
                                })
                                : '-'
                            }
                        </span>
                    </div>
                </div>

                <div className="profile-actions">
                    {/* Bouton Modifier (seulement pour son propre profil) */}
                    {estMonProfil && (
                        <Link to="/modify-profile">
                            <button className="btn btn-primary">✏️ Modifier</button>
                        </Link>
                    )}
                    
                    {/* Bouton Retour */}
                    {id ? (
                        <Link to="/admin/users">
                            <button className="btn btn-outline">⬅ Retour à la liste</button>
                        </Link>
                    ) : (
                        <Link to="/accueil">
                            <button className="btn btn-outline">⬅ Retour à l'accueil</button>
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Profile;
