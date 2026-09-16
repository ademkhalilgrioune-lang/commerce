import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosConfig';

function ModifyProfile() {
    const { user, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    
    // Profile fields
    const [nom, setNom] = useState('');
    
    // Password change fields
    const [motDePasseActuel, setMotDePasseActuel] = useState('');
    const [nouveauMotDePasse, setNouveauMotDePasse] = useState('');
    const [confirmationMotDePasse, setConfirmationMotDePasse] = useState('');
    
    // OTP fields
    const [otpMode, setOtpMode] = useState(false);
    const [otp, setOtp] = useState('');
    const [emailTemp, setEmailTemp] = useState('');
    
    // UI states
    const [chargement, setChargement] = useState(true);
    
    // Separate errors for each section
    const [erreurNom, setErreurNom] = useState('');
    const [succesNom, setSuccesNom] = useState('');
    
    const [erreurPassword, setErreurPassword] = useState('');
    const [succesPassword, setSuccesPassword] = useState('');
    
    const [erreurOtp, setErreurOtp] = useState('');
    const [succesOtp, setSuccesOtp] = useState('');
    
    const [chargementOtp, setChargementOtp] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/auth');
            return;
        }

        if (user) {
            setNom(user.nom || '');
            setEmailTemp(user.email || '');
        }
        setChargement(false);
    }, [isAuthenticated, navigate, user]);

    // ==========================================
    // CHANGER LE NOM
    // ==========================================
    const handleSubmitNom = async (e) => {
        e.preventDefault();
        setErreurNom('');
        setSuccesNom('');

        if (!nom.trim()) {
            setErreurNom('Le nom ne peut pas être vide');
            return;
        }

        try {
            await api.put('/auth/profil', { nom });
            setSuccesNom('✅ Profil modifié avec succès !');
            const updatedUser = { ...user, nom: nom };
            localStorage.removeItem('user');
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setTimeout(() => {
                window.location.href = '/profile';
            }, 500);
        } catch (error) {
            setErreurNom(error.response?.data?.message || 'Erreur lors de la modification');
        }
    };

    // ==========================================
    // DEMANDER LE CHANGEMENT DE MOT DE PASSE
    // ==========================================
    const handleDemanderChangementMotDePasse = async (e) => {
        e.preventDefault();
        setErreurPassword('');
        setSuccesPassword('');
        setChargementOtp(true);

        // Vérification locale
        if (!motDePasseActuel) {
            setErreurPassword('Veuillez entrer votre mot de passe actuel');
            setChargementOtp(false);
            return;
        }

        if (nouveauMotDePasse.length < 6) {
            setErreurPassword('Le mot de passe doit contenir au moins 6 caractères');
            setChargementOtp(false);
            return;
        }

        if (nouveauMotDePasse !== confirmationMotDePasse) {
            setErreurPassword('Les mots de passe ne correspondent pas');
            setChargementOtp(false);
            return;
        }

        try {
            await api.post('/auth/request-password-change', {
                email: emailTemp,
                mot_de_passe_actuel: motDePasseActuel,
                nouveau_mot_de_passe: nouveauMotDePasse
            });

            setOtpMode(true);
            setSuccesPassword('✅ Un code de vérification a été envoyé à votre email');
            setMotDePasseActuel('');
            setNouveauMotDePasse('');
            setConfirmationMotDePasse('');
        } catch (error) {
            const message = error.response?.data?.message || 'Erreur lors de la demande';
            
            // Messages d'erreur spécifiques
            if (message.includes('incorrect') || message.includes('Mot de passe actuel incorrect')) {
                setErreurPassword('❌ Mot de passe actuel incorrect');
            } else if (message.includes('404')) {
                setErreurPassword('❌ Route introuvable. Veuillez réessayer.');
            } else {
                setErreurPassword(message);
            }
        } finally {
            setChargementOtp(false);
        }
    };

    // ==========================================
    // VÉRIFIER L'OTP ET CHANGER LE MOT DE PASSE
    // ==========================================
    const handleVerifierOtp = async (e) => {
        e.preventDefault();
        setErreurOtp('');
        setSuccesOtp('');

        if (!otp || otp.length < 6) {
            setErreurOtp('Veuillez entrer le code OTP à 6 chiffres');
            return;
        }

        setChargementOtp(true);

        try {
            await api.post('/auth/verify-password-otp', {
                email: emailTemp,
                otp: otp,
                nouveau_mot_de_passe: nouveauMotDePasse
            });

            setSuccesOtp('✅ Mot de passe changé avec succès !');
            setOtp('');
            
            setTimeout(() => {
                setOtpMode(false);
                setSuccesPassword('✅ Mot de passe changé avec succès !');
                setChargementOtp(false);
            }, 1500);
        } catch (error) {
            const message = error.response?.data?.message || 'Code OTP invalide ou expiré';
            
            if (message.includes('expiré')) {
                setErreurOtp('❌ Le code a expiré. Cliquez sur "Renvoyer le code"');
            } else if (message.includes('invalide')) {
                setErreurOtp('❌ Code OTP incorrect. Veuillez réessayer.');
            } else {
                setErreurOtp(message);
            }
            setChargementOtp(false);
        }
    };

    // ==========================================
    // RENVOYER L'OTP
    // ==========================================
    const handleResendOtp = async () => {
        setErreurOtp('');
        setSuccesOtp('');
        setChargementOtp(true);

        try {
            await api.post('/auth/resend-password-otp', {
                email: emailTemp
            });
            setSuccesOtp('✅ Un nouveau code a été envoyé à votre email');
        } catch (error) {
            setErreurOtp(error.response?.data?.message || 'Erreur lors du renvoi');
        } finally {
            setChargementOtp(false);
        }
    };

    // ==========================================
    // ANNULER LE CHANGEMENT DE MOT DE PASSE
    // ==========================================
    const handleAnnulerChangement = () => {
        setOtpMode(false);
        setErreurOtp('');
        setSuccesOtp('');
        setOtp('');
        setMotDePasseActuel('');
        setNouveauMotDePasse('');
        setConfirmationMotDePasse('');
        setErreurPassword('');
        setSuccesPassword('');
        setChargementOtp(false);
    };

    // ==========================================
    // RENDU - CHARGEMENT
    // ==========================================
    if (chargement) {
        return (
            <div className="container section">
                <div className="loader"></div>
            </div>
        );
    }

    // ==========================================
    // RENDU - ÉCRAN OTP
    // ==========================================
    if (otpMode) {
        return (
            <div className="container section fade">
                <div className="card profile-card">
                    <div className="auth-header">
                        <h2>🔐 Vérification du changement</h2>
                        <p className="text-muted">
                            Un code a été envoyé à <strong>{emailTemp}</strong>
                        </p>
                    </div>

                    {erreurOtp && <div className="alert alert-danger">{erreurOtp}</div>}
                    {succesOtp && <div className="alert alert-success">{succesOtp}</div>}

                    <form onSubmit={handleVerifierOtp} className="auth-form">
                        <div className="input-group">
                            <label>Code OTP (6 chiffres)</label>
                            <input
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="123456"
                                maxLength="6"
                                required
                                autoFocus
                                className="text-center"
                                style={{ fontSize: '1.8rem', letterSpacing: '8px', padding: '16px' }}
                            />
                            <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '8px' }}>
                                Le code est valable pendant 10 minutes
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={chargementOtp}
                            className="btn btn-primary"
                            id="sub"
                        >
                            {chargementOtp ? 'Vérification...' : '✅ Vérifier et changer'}
                        </button>
                    </form>

                    <div className="d-flex flex-column gap-10" style={{ marginTop: '20px' }}>
                        <button
                            onClick={handleResendOtp}
                            disabled={chargementOtp}
                            className="btn btn-outline"
                            id="sub"
                        >
                            🔄 Renvoyer le code
                        </button>
                        <button
                            onClick={handleAnnulerChangement}
                            className="btn btn-outline"
                            id="sub"
                            style={{ borderColor: 'var(--text-light)', color: 'var(--text-light)' }}
                        >
                            ⬅️ Annuler
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ==========================================
    // RENDU - PAGE PRINCIPALE
    // ==========================================
    return (
        <div className="container section fade">
            <div className="card profile-card">
                <div className="auth-header">
                    <h2>✏️ Modifier mon profil</h2>
                    <p className="text-muted">Modifiez vos informations personnelles</p>
                </div>

                {/* ==========================================
                    SECTION 1: CHANGER LE NOM
                ========================================== */}
                <div style={{ marginBottom: '30px', borderBottom: '2px solid var(--border)', paddingBottom: '25px' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '20px' }}>👤 Changer le nom</h3>
                    
                    {erreurNom && <div className="alert alert-danger">{erreurNom}</div>}
                    {succesNom && <div className="alert alert-success">{succesNom}</div>}
                    
                    <form onSubmit={handleSubmitNom}>
                        <div className="input-group">
                            <label>Nouveau nom</label>
                            <input
                                type="text"
                                value={nom}
                                onChange={(e) => setNom(e.target.value)}
                                placeholder="Votre nom"
                                required
                            />
                        </div>

                        <button type="submit" className="btn btn-primary">
                            💾 Enregistrer le nom
                        </button>
                    </form>
                </div>

                {/* ==========================================
                    SECTION 2: CHANGER LE MOT DE PASSE
                ========================================== */}
                <div>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '20px' }}>🔐 Changer le mot de passe</h3>
                    
                    {erreurPassword && <div className="alert alert-danger">{erreurPassword}</div>}
                    {succesPassword && <div className="alert alert-success">{succesPassword}</div>}
                    
                    <form onSubmit={handleDemanderChangementMotDePasse}>
                        <div className="input-group">
                            <label>Mot de passe actuel</label>
                            <input
                                type="password"
                                value={motDePasseActuel}
                                onChange={(e) => setMotDePasseActuel(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <div className="input-group">
                            <label>Nouveau mot de passe</label>
                            <input
                                type="password"
                                value={nouveauMotDePasse}
                                onChange={(e) => setNouveauMotDePasse(e.target.value)}
                                placeholder="•••••••• (min 6 caractères)"
                                required
                            />
                        </div>

                        <div className="input-group">
                            <label>Confirmer le nouveau mot de passe</label>
                            <input
                                type="password"
                                value={confirmationMotDePasse}
                                onChange={(e) => setConfirmationMotDePasse(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={chargementOtp}
                            className="btn btn-outline"
                        >
                            {chargementOtp ? 'Envoi du code...' : '📧 Envoyer le code de vérification'}
                        </button>
                    </form>
                </div>

                {/* ==========================================
                    BOUTON RETOUR
                ========================================== */}
                <div style={{ marginTop: '30px', borderTop: '2px solid var(--border)', paddingTop: '20px' }}>
                    <Link to="/profile">
                        <button className="btn btn-outline" id="sub" style={{ borderColor: 'var(--text-light)', color: 'var(--text-light)' }}>
                            ⬅️ Retour au profil
                        </button>
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default ModifyProfile;