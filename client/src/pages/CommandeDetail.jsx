import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosConfig';

function CommandeDetail() {
    const { id } = useParams();
    const { user, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [commande, setCommande] = useState(null);
    const [lignes, setLignes] = useState([]);
    const [chargement, setChargement] = useState(true);
    const [erreur, setErreur] = useState('');
    const [message, setMessage] = useState('');
    const [changementEnCours, setChangementEnCours] = useState(false);
    
    const [modalOpen, setModalOpen] = useState(false);
    const [modalStatut, setModalStatut] = useState('');
    const [modalMessage, setModalMessage] = useState('');

    const isAdmin = user?.role === 'admin';

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/auth');
            return;
        }
        chargerDetail();
    }, [id, isAuthenticated]);

    const chargerDetail = async () => {
        try {
            const response = await api.get(`/commandes/${id}`);
            setCommande(response.data.commande);
            setLignes(response.data.lignes);
            setErreur('');
        } catch (error) {
            setErreur('Commande non trouvée');
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

    const getImageUrl = (photoPath) => {
        if (!photoPath) return null;
        if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) {
            return photoPath;
        }
        return `http://192.168.100.6:5001${photoPath}`;
    };

    const ouvrirModal = (statut, message) => {
        setModalStatut(statut);
        setModalMessage(message || '');
        setModalOpen(true);
    };

    const fermerModal = () => {
        setModalOpen(false);
        setModalStatut('');
        setModalMessage('');
    };

    const executerAction = async () => {
        setChangementEnCours(true);
        setErreur('');
        setMessage('');
        fermerModal();

        try {
            await api.put(`/admin/orders/${id}/status`, { statut: modalStatut });
            
            const messages = {
                'en_preparation': '🔧 Commande passée en préparation',
                'livree': '✅ Commande livrée avec succès !',
                'refusee': '❌ Commande refusée'
            };
            setMessage(messages[modalStatut] || `✅ Statut changé en "${modalStatut}"`);
            await chargerDetail();
            
        } catch (error) {
            const msg = error.response?.data?.message || 'Erreur lors du changement';
            setErreur(msg);
            if (msg.includes('Stock insuffisant')) {
                setMessage('⚠️ Stock insuffisant, vous pouvez refuser la commande.');
            }
        } finally {
            setChangementEnCours(false);
        }
    };

    // ✅ STATUTS DISPONIBLES
    const getStatutsDisponibles = () => {
        const statutActuel = commande?.statut;
        
        if (statutActuel === 'en_attente') {
            return ['en_preparation', 'livree'];
        }
        
        if (statutActuel === 'en_preparation') {
            return ['livree'];
        }
        
        return [];
    };

    const peutRefuser = commande?.statut === 'en_attente' || commande?.statut === 'en_preparation';
    const estTerminee = commande?.statut === 'livree' || commande?.statut === 'refusee';

    // ✅ INFO STOCK
    const getStockInfo = () => {
        if (commande?.statut === 'en_attente') {
            return 'ℹ️ Stock non déduit (en attente)';
        }
        if (commande?.statut === 'en_preparation') {
            return '🔧 Commande en préparation. Le stock sera déduit à la livraison.';
        }
        if (commande?.statut === 'livree') {
            return '✅ Stock déduit, commande livrée';
        }
        if (commande?.statut === 'refusee') {
            return '❌ Commandes refusée, stock non déduit';
        }
        return '';
    };

    if (chargement) return (
        <div className="container section">
            <div className="loader"></div>
        </div>
    );

    if (erreur && !commande) return (
        <div className="container section">
            <div className="empty-state">
                <h2>❌ {erreur || 'Commande non trouvée'}</h2>
                <Link to={isAdmin ? '/admin/commandes' : '/mes-commandes'}>
                    <button className="btn btn-primary">⬅ Retour</button>
                </Link>
            </div>
        </div>
    );

    return (
        <div className="container section fade">
            {/* MODAL */}
            {modalOpen && (
                <div className="modal" style={{ 
                    position: 'fixed', 
                    inset: 0, 
                    background: 'rgba(15,23,42,0.6)', 
                    backdropFilter: 'blur(4px)',
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    zIndex: 9999,
                    padding: '20px'
                }}>
                    <div className="modal-content" style={{ 
                        maxWidth: '480px', 
                        background: 'white', 
                        borderRadius: '20px', 
                        padding: '35px',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.2)',
                        animation: 'fade 0.3s ease'
                    }}>
                        <h3 style={{ fontSize: '1.4rem', marginBottom: '12px', textAlign: 'center' }}>
                            {modalStatut === 'refusee' ? '❌ Refuser la commande' : '✅ Confirmer'}
                        </h3>
                        <p style={{ textAlign: 'center', color: 'var(--text-light)', marginBottom: '20px' }}>
                            {modalStatut === 'refusee' 
                                ? 'Êtes-vous sûr de vouloir refuser cette commande ? Cette action est irréversible.'
                                : modalStatut === 'livree'
                                ? `Valider la livraison de cette commande va déduire les produits du stock.`
                                : `Voulez-vous passer cette commande au statut "${modalStatut}" ?`
                            }
                        </p>
                        {modalMessage && (
                            <p style={{ textAlign: 'center', color: 'var(--warning)', fontSize: '0.95rem', marginBottom: '20px' }}>
                                {modalMessage}
                            </p>
                        )}
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button 
                                className="btn btn-outline" 
                                onClick={fermerModal}
                                style={{ minWidth: '120px' }}
                            >
                                Annuler
                            </button>
                            <button 
                                className={`btn ${modalStatut === 'refusee' ? 'btn-danger' : modalStatut === 'en_preparation' ? 'btn-primary' : 'btn-success'}`}
                                onClick={executerAction}
                                disabled={changementEnCours}
                                style={{ minWidth: '120px' }}
                            >
                                {changementEnCours ? '...' : 'Confirmer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="card" style={{ padding: '30px' }}>
                {/* HEADER */}
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    flexWrap: 'wrap', 
                    gap: '15px',
                    marginBottom: '25px',
                    borderBottom: '2px solid var(--border)',
                    paddingBottom: '20px'
                }}>
                    <h1 style={{ margin: 0, fontSize: '1.8rem' }}>🧾 Détails de la commande</h1>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {getStatutBadge(commande.statut)}
                    </div>
                </div>

                {/* INFO STOCK */}
                <div style={{ 
                    marginBottom: '20px',
                    padding: '12px 16px',
                    background: '#f8fafc',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.95rem',
                    color: 'var(--text-light)'
                }}>
                    {getStockInfo()}
                </div>

                {message && (
                    <div className={`alert ${message.includes('❌') ? 'alert-danger' : message.includes('⚠️') ? 'alert-warning' : 'alert-success'}`}>
                        {message}
                    </div>
                )}
                
                {erreur && (
                    <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
                        <strong>❌ {erreur}</strong>
                        {erreur.includes('Stock insuffisant') && (
                            <div style={{ marginTop: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                <button 
                                    className="btn btn-danger" 
                                    onClick={() => ouvrirModal('refusee', '')}
                                >
                                    ❌ Refuser la commande
                                </button>
                                <button 
                                    className="btn btn-outline" 
                                    onClick={() => setErreur('')}
                                >
                                    Ignorer
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* INFOS COMMANDE */}
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                    gap: '15px', 
                    marginBottom: '25px' 
                }}>
                    <div className="info-item">
                        <span className="text-muted">Référence</span>
                        <strong>#{commande.id}</strong>
                    </div>
                    <div className="info-item">
                        <span className="text-muted">Date</span>
                        <strong>{new Date(commande.date_commande).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>
                    </div>
                    <div className="info-item">
                        <span className="text-muted">Total</span>
                        <strong style={{ color: 'var(--primary)', fontSize: '1.2rem' }}>{commande.total} DA</strong>
                    </div>
                    <div className="info-item">
                        <span className="text-muted">Statut</span>
                        <strong>{getStatutBadge(commande.statut)}</strong>
                    </div>
                </div>

                {/* PRODUITS */}
                <div style={{ marginTop: '25px' }}>
                    <h3 style={{ marginBottom: '15px', fontSize: '1.1rem' }}>📦 Produits</h3>
                    <div className="cart-items">
                        {lignes.map((l) => (
                            <div key={l.id} className="cart-item" style={{ padding: '12px 16px', borderRadius: '12px' }}>
                                <div className="cart-item-image" style={{ width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                                    {l.photo ? (
                                        <img src={getImageUrl(l.photo)} alt={l.nom} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <span style={{ fontSize: '2rem' }}>📦</span>
                                    )}
                                </div>
                                <div className="cart-item-info" style={{ flex: 1, minWidth: '120px' }}>
                                    <h3 style={{ fontSize: '1rem', margin: 0 }}>{l.nom}</h3>
                                    <p style={{ margin: '4px 0 0', color: 'var(--text-light)', fontSize: '0.9rem' }}>
                                        {l.quantite} × {l.prix_unitaire} DA
                                    </p>
                                </div>
                                <div className="cart-item-total" style={{ fontWeight: 700, fontSize: '1rem', whiteSpace: 'nowrap' }}>
                                    {(l.quantite * l.prix_unitaire).toFixed(2)} DA
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ACTIONS ADMIN */}
                {isAdmin && !estTerminee && (
                    <div style={{ 
                        marginTop: '30px', 
                        borderTop: '2px solid var(--border)', 
                        paddingTop: '25px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center'
                    }}>
                        <h4 style={{ marginBottom: '20px', fontSize: '1rem' }}>🔧 Actions sur la commande</h4>
                        <div style={{ 
                            display: 'flex', 
                            gap: '12px', 
                            flexWrap: 'wrap',
                            justifyContent: 'center'
                        }}>
                            {getStatutsDisponibles().map((s) => {
                                let label = '';
                                let className = '';
                                if (s === 'en_preparation') {
                                    label = '🔧 Préparer';
                                    className = 'btn-primary';
                                } else if (s === 'livree') {
                                    label = '✅ Livrer (déstockage)';
                                    className = 'btn-success';
                                }
                                return (
                                    <button
                                        key={s}
                                        className={`btn ${className}`}
                                        onClick={() => ouvrirModal(s, '')}
                                        disabled={changementEnCours}
                                        style={{ minWidth: '180px' }}
                                    >
                                        {label}
                                    </button>
                                );
                            })}
                            {peutRefuser && (
                                <button
                                    className="btn btn-danger"
                                    onClick={() => ouvrirModal('refusee', '')}
                                    disabled={changementEnCours}
                                    style={{ minWidth: '180px' }}
                                >
                                    ❌ Refuser
                                </button>
                            )}
                        </div>
                        {changementEnCours && (
                            <div className="loader" style={{ marginTop: '20px', width: '30px', height: '30px' }}></div>
                        )}
                    </div>
                )}

                {estTerminee && isAdmin && (
                    <div style={{ marginTop: '30px', borderTop: '2px solid var(--border)', paddingTop: '20px' }}>
                        <div className={`alert ${commande.statut === 'livree' ? 'alert-success' : 'alert-danger'}`} style={{ textAlign: 'center' }}>
                            {commande.statut === 'livree' ? '✅ Cette commande est terminée' : '❌ Cette commande a été refusée'}
                        </div>
                    </div>
                )}

                {/* RETOUR */}
                <div style={{ marginTop: '30px', borderTop: '2px solid var(--border)', paddingTop: '20px', textAlign: 'center' }}>
                    <Link to={isAdmin ? '/admin/commandes' : '/mes-commandes'}>
                        <button className="btn btn-outline" style={{ minWidth: '200px' }}>
                            ⬅ {isAdmin ? 'Retour aux commandes' : 'Mes commandes'}
                        </button>
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default CommandeDetail;