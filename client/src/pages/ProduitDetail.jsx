import React, { useState, useEffect } from 'react';
import { useParams, Link , useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosConfig';


function ProduitDetail() {
    const { id } = useParams();
    const { user,isAuthenticated } = useAuth();
    const [produit, setProduit] = useState(null);
    const [quantite, setQuantite] = useState(1);
    const [chargement, setChargement] = useState(true);
    const [erreur, setErreur] = useState('');
    const [message, setMessage] = useState('');



    // État pour les avis
const [avis, setAvis] = useState([]);
const [moyenne, setMoyenne] = useState(0);
const [totalAvis, setTotalAvis] = useState(0);
const [avisAffiches, setAvisAffiches] = useState(3); // Nombre d'avis affichés

// Formulaire d'avis
const [note, setNote] = useState(5);
const [commentaire, setCommentaire] = useState('');
const [messageAvis, setMessageAvis] = useState('');
const [avisEnModification, setAvisEnModification] = useState(null);
const navigate = useNavigate();



    useEffect(() => {
        const fetchProduit = async () => {
            try {
                const response = await api.get(`/produits/${id}`);
                setProduit(response.data);
            } catch (error) {
                setErreur('Produit non trouvé');
                console.error('Erreur:', error);
            } finally {
                setChargement(false);
            }
        };
        fetchProduit();
    }, [id]);

const goBack = () => {
navigate(-1);  // ← Retourne à la page précédente
};

    // ==========================================
// FONCTION POUR CONSTRUIRE L'URL DE L'IMAGE
// ==========================================
const getImageUrl = (photoPath) => {
    if (!photoPath) return null;
    if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) {
        return photoPath;
    }
    return `http://192.168.100.6:5001${photoPath}`;
};

    const chargerAvis = async () => {
    try {
        const response = await api.get(`/produits/${id}/avis`);
        setAvis(response.data.avis || []);
        setMoyenne(response.data.moyenne || 0);
        setTotalAvis(response.data.total || 0);
    } catch (error) {
        console.error('Erreur chargement avis:', error);
    }
};

// Appeler chargerAvis() dans le useEffect
useEffect(() => {
    const fetchProduit = async () => {
        // ... charger le produit
        chargerAvis(); // ← AJOUTER
    };
    fetchProduit();
}, [id]);

const afficherMessage = (texte, type = 'success') => {
    setMessage(texte);
    setTimeout(() => setMessage(''), 3000);
};

const handleSupprimerAvis = async (avisId) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cet avis ?')) {
        return;
    }

    try {
        await api.delete(`/avis/${avisId}`);
        setMessageAvis('✅ Avis supprimé avec succès !');
        setTimeout(() => setMessageAvis(''), 3000);
        await chargerAvis();
    } catch (error) {
        setMessageAvis('❌ Erreur lors de la suppression');
        setTimeout(() => setMessageAvis(''), 3000);
    }
};

const handleModifierAvis = (avis) => {
    setAvisEnModification(avis.id);
    setNote(avis.note);
    setCommentaire(avis.commentaire || '');
};

const handleSubmitModificationAvis = async (e) => {
    e.preventDefault();

    try {
        await api.put(`/avis/${avisEnModification}`, {
            note: note,
            commentaire: commentaire
        });

        setMessageAvis('✅ Avis modifié avec succès !');
        setAvisEnModification(null);
        setCommentaire('');
        setNote(5);
        setTimeout(() => setMessageAvis(''), 3000);
        await chargerAvis();
    } catch (error) {
        setMessageAvis(error.response?.data?.message || '❌ Erreur');
        setTimeout(() => setMessageAvis(''), 3000);
    }
};

const annulerModification = () => {
    setAvisEnModification(null);
    setCommentaire('');
    setNote(5);
};



const ajouterAuPanier = async () => {
    if (!isAuthenticated) {
        afficherMessage('🔐 Connectez-vous pour ajouter au panier', 'error');
        return;
    }

    try {
        await api.post('/panier', {
            id_produit: produit.id,
            quantite: quantite
        });
        afficherMessage('✅ Produit ajouté au panier !', 'success');
    } catch (error) {
        afficherMessage('❌ Erreur : ' + (error.response?.data?.message || ''), 'error');
    }
};

const handleSubmitAvis = async (e) => {
    e.preventDefault();
    setMessageAvis('');

    if (!isAuthenticated) {
        setMessageAvis('🔐 Connectez-vous pour laisser un avis');
        return;
    }

    try {
        await api.post('/avis', {
            id_produit: id,
            note: note,
            commentaire: commentaire
        });

        setMessageAvis('✅ Avis ajouté avec succès !');
        setCommentaire('');
        setNote(5);
        setTimeout(() => setMessageAvis(''), 3000);
        await chargerAvis();
    } catch (error) {
        setMessageAvis(error.response?.data?.message || '❌ Erreur');
        setTimeout(() => setMessageAvis(''), 3000);
    }
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
                <div className="empty-state">
                    <h2>❌ {erreur}</h2>
                    <button id="RetourProdDetail" className="btn btn-outline" onClick={goBack}> ⬅ Retour</button>
                </div>
            </div>
        );
    }

    if (!produit) {
        return (
            <div className="container section">
                <div className="empty-state">
                    <h2>❌ Produit introuvable</h2>
                    <button id="RetourProdDetail" className="btn btn-outline" onClick={goBack}>⬅ Retour</button>
                </div>
            </div>
        );
    }

return (
    <div className="container section fade">
        <div className="card">
            {/* ========================================== */}
            {/* LAYOUT : PHOTO À GAUCHE | INFOS À DROITE  */}
            {/* ========================================== */}
            <div className="product-detail">
                {/* IMAGE (GAUCHE) */}
                <div className="product-detail-image">
                    {produit.photo ? (
                        <img 
                            src={getImageUrl(produit.photo)} 
                            alt={produit.nom}
                            onError={(e) => {
                                e.target.src = '/images/default-product.jpg';
                            }}
                        />
                    ) : (
                        <div className="no-image">📦</div>
                    )}
                </div>

                {/* INFOS PRODUIT (DROITE) */}
                <div className="product-detail-info">
                    <div className="badge">
                        {produit.categorie_nom || 'Catégorie'}
                    </div>

                    <h1>{produit.nom}</h1>

                    <p className="price">{produit.prix}€</p>

                    <div className="stock">
                        {produit.stock > 0 ? (
                            <span className="badge-success">✅ En stock ({produit.stock} disponibles)</span>
                        ) : (
                            <span className="badge-danger">❌ Rupture de stock</span>
                        )}
                    </div>

                    <div className="review-summary">
                        {totalAvis > 0 ? (
                            <>
                                <span className="stars">
                                    {'⭐'.repeat(Math.round(moyenne))}
                                    {'☆'.repeat(5 - Math.round(moyenne))}
                                </span>
                                <span className="rating">{moyenne.toFixed(1)}</span>
                                <span className="count">({totalAvis} avis)</span>
                            </>
                        ) : (
                            <span className="count">Aucun avis pour le moment</span>
                        )}
                    </div>

                    <p className="description">{produit.description}</p>
                </div>
            </div>

            {/* ========================================== */}
            {/* BLOC COMPLET : QUANTITÉ + BOUTONS (sous les infos) */}
            {/* ========================================== */}
            {user?.role !== 'admin' && (
            <div className="product-actions-full">
                <div className="quantity-box">
                    <label>Quantité :</label>
                    <div className="quantity-controls">
                        <button
                            onClick={() => setQuantite(Math.max(1, quantite - 1))}
                            disabled={quantite <= 1}
                        >
                            −
                        </button>
                        <span>{quantite}</span>
                        <button
                            onClick={() => setQuantite(quantite + 1)}
                            disabled={produit.stock <= quantite}
                        >
                            +
                        </button>
                    </div>
                    <span className="max-text">max {produit.stock}</span>
                </div>

                {message && (
                    <div className={`alert alert-${message.includes('✅') ? 'success' : 'danger'}`}>
                        {message}
                    </div>
                )}

                <div className="actions-row">
                    
                    <button
                        className="btn btn-primary"
                        onClick={ajouterAuPanier}
                        disabled={produit.stock <= 0}
                    >
                        🛒 Ajouter au panier
                    </button>
    
                </div>
            </div>
            )}
            <button id="RetourProdDetail" className="btn btn-outline" onClick={goBack}>⬅ Retour</button>


            {/* ========================================== */}
            {/* SECTION AVIS - EN BAS DE LA PAGE           */}
            {/* ========================================== */}
            <div className="reviews-section">
                <h3 className="section-title">💬 Avis des clients</h3>

                {/* AFFICHAGE DES AVIS */}
                {avis.length === 0 ? (
                    <p className="text-muted">Aucun avis pour le moment !</p>
                ) : (
                    <>
                        {avis.slice(0, avisAffiches).map((a) => (
                            <div key={a.id} className="produit-detail-avis-item">
                                <div className="review-header">
                                    <span className="review-user">{a.nom_utilisateur}</span>
                                    <span className="stars">{'⭐'.repeat(a.note)}</span>
                                    <span className="text-muted">
                                        {new Date(a.date_avis).toLocaleDateString('fr-FR')}
                                    </span>
                                    {/* BOUTONS MODIFIER / SUPPRIMER (si c'est l'utilisateur connecté) */}
                                    {isAuthenticated && user?.id === a.id_utilisateur && (
                                        <div className="review-actions">
                                            <button 
                                                className="btn btn-outline"
                                                onClick={() => handleModifierAvis(a)}
                                                title="Modifier mon avis"
                                            >
                                                ✏️
                                            </button>
                                            <button 
                                                className="btn btn-danger"
                                                onClick={() => handleSupprimerAvis(a.id)}
                                                title="Supprimer mon avis"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {a.commentaire && (
                                    <p className="review-comment">{a.commentaire}</p>
                                )}
                            </div>
                        ))}

                        {/* BOUTON "VOIR PLUS" */}
                        {avisAffiches < avis.length && (
                            <button
                                className="btn btn-outline"
                                onClick={() => setAvisAffiches(avisAffiches + 3)}
                            >
                                Voir plus d'avis ({avis.length - avisAffiches} restants)
                            </button>
                        )}
                    </>
                )}

                {/* ========================================== */}
                {/* FORMULAIRE POUR AJOUTER/MODIFIER UN AVIS   */}
                {/* ========================================== */}
                {user?.role !== 'admin' && (
                <div className="card mt-4">
                    <h4 className="section-title">
                        {avisEnModification ? '✏️ Modifier mon avis' : '✏️ Donnez votre avis'}
                    </h4>

                    {messageAvis && (
                        <div className={`alert alert-${messageAvis.includes('✅') ? 'success' : 'danger'}`}>
                            {messageAvis}
                        </div>
                    )}

                    {isAuthenticated ? (
                        <form 
                            onSubmit={avisEnModification ? handleSubmitModificationAvis : handleSubmitAvis} 
                            className="auth-form"
                        >
                            <div className="input-group">
                                <label>Note :</label>
                                <div className="stars-selector">
                                    {[1, 2, 3, 4, 5].map((n) => (
                                        <span
                                            key={n}
                                            className={`star ${n <= note ? 'active' : ''}`}
                                            onClick={() => setNote(n)}
                                            style={{ cursor: 'pointer', fontSize: '28px' }}
                                        >
                                            {n <= note ? '⭐' : '☆'}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="input-group">
                                <label>Commentaire (optionnel) :</label>
                                <input
                                    value={commentaire}
                                    onChange={(e) => setCommentaire(e.target.value)}
                                    placeholder="Partagez votre expérience avec ce produit..."
                                    rows="3"
                                />
                            </div>

                            <div className="profile-actions">
                                <button type="submit" className="btn btn-success">
                                    {avisEnModification ? '💾 Mettre à jour' : '📤 Envoyer mon avis'}
                                </button>
                                {avisEnModification && (
                                    <button 
                                        type="button" 
                                        className="btn btn-outline"
                                        onClick={annulerModification}
                                    >
                                        ❌ Annuler
                                    </button>
                                )}
                            </div>
                        </form>
                    ) : (
                        <div className="empty-state">
                            <p>🔐 <Link to="/auth">Connectez-vous</Link> pour laisser un avis.</p>
                        </div>
                    )}
                </div>
                )}
            </div>
        </div>
    </div>
);
}

export default ProduitDetail;
