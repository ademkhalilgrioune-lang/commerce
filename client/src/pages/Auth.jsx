import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/global.css';

function Auth() {
    const [mode, setMode] = useState('login');
    const [nom, setNom] = useState('');
    const [email, setEmail] = useState('');
    const [motDePasse, setMotDePasse] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [otp, setOtp] = useState('');
    const [erreur, setErreur] = useState('');
    const [succes, setSucces] = useState('');
    const [chargement, setChargement] = useState(false);
    const [emailTemporaire, setEmailTemporaire] = useState('');

    const { login, register, verifyOTP, resendOTP } = useAuth();
    const navigate = useNavigate();

    const toggleMode = () => {
        setMode(mode === 'login' ? 'register' : 'login');
        setErreur('');
        setSucces('');
        setNom('');
        setEmail('');
        setMotDePasse('');
        setConfirmation('');
        setOtp('');
        setEmailTemporaire('');
    };

    const retourInscription = () => {
        setMode('register');
        setErreur('');
        setSucces('');
        setOtp('');
        setEmailTemporaire('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErreur('');
        setSucces('');
        setChargement(true);

        try {
            if (mode === 'login') {
                await login(email, motDePasse);
                navigate('/accueil');
            } else if (mode === 'register') {
                if (motDePasse !== confirmation) {
                    setErreur('Les mots de passe ne correspondent pas');
                    setChargement(false);
                    return;
                }
                if (motDePasse.length < 6) {
                    setErreur('Mot de passe : minimum 6 caractères');
                    setChargement(false);
                    return;
                }

                await register(nom, email, motDePasse);
                setEmailTemporaire(email);
                setMode('verify-otp');
                setSucces('✅ Un code de vérification a été envoyé à votre email');
                setChargement(false);
            } else if (mode === 'verify-otp') {
                if (!otp || otp.length < 6) {
                    setErreur('Veuillez entrer le code OTP à 6 chiffres');
                    setChargement(false);
                    return;
                }

                await verifyOTP(emailTemporaire, otp);
                setSucces('✅ Email vérifié avec succès !');
                
                setTimeout(() => {
                    setMode('login');
                    setEmail(emailTemporaire);
                    setMotDePasse('');
                    setOtp('');
                    setSucces('✅ Compte vérifié ! Connectez-vous maintenant.');
                    setChargement(false);
                }, 2000);
            }
        } catch (error) {
            setErreur(error.response?.data?.message || 'Une erreur est survenue');
            setChargement(false);
        }
    };

    const handleResendOTP = async () => {
        setErreur('');
        setSucces('');
        setChargement(true);
        try {
            await resendOTP(emailTemporaire);
            setSucces('✅ Un nouveau code a été envoyé à votre email');
        } catch (error) {
            setErreur(error.response?.data?.message || 'Erreur lors du renvoi du code');
        } finally {
            setChargement(false);
        }
    };

    // ==========================================
    // OTP SCREEN
    // ==========================================
    if (mode === 'verify-otp') {
        return (
            <div className="auth-page">
                <div className="auth-card">
                    <div className="auth-header">
                        <h2>📧 Vérification du compte</h2>
                        <p className="text-muted">
                            Un code a été envoyé à <strong className="text-primary">{emailTemporaire}</strong>
                        </p>
                    </div>

                    {erreur && <div className="alert alert-danger">{erreur}</div>}
                    {succes && <div className="alert alert-success">{succes}</div>}

                    <form className="auth-form" onSubmit={handleSubmit}>
                        <div className="input-group">
                            <label>Code OTP (6 chiffres)</label>
                            <input
                                type="text"
                                className="text-center"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="123456"
                                maxLength="6"
                                required
                                autoFocus
                            />
                            <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '8px' }}>
                                Le code est valable pendant 10 minutes
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={chargement}
                            className="btn btn-primary"
                            id="sub"
                        >
                            {chargement ? 'Vérification...' : '✅ Vérifier mon compte'}
                        </button>
                    </form>

                    <div className="d-flex flex-column gap-10" style={{ marginTop: '20px' }}>
                        <button
                            onClick={handleResendOTP}
                            disabled={chargement}
                            className="btn btn-outline"
                            id="sub"
                        >
                            🔄 Renvoyer le code
                        </button>
                        <button
                            onClick={retourInscription}
                            className="btn btn-outline"
                            id="sub"
                            style={{ borderColor: 'var(--text-light)', color: 'var(--text-light)' }}
                        >
                            ⬅️ Retour à l'inscription
                        </button>
                    </div>

                    <div className="auth-footer">
                        <p className="text-muted">
                            Vous n'avez pas reçu de code ? Vérifiez vos spams ou
                            <button 
                                onClick={handleResendOTP} 
                                className="text-primary"
                                style={{ fontWeight: 600, cursor: 'pointer', background: 'none', border: 'none', padding: '0 4px' }}
                            >
                                renvoyez-le
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // ==========================================
    // LOGIN / REGISTER
    // ==========================================
    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-header">
                    <h2>{mode === 'login' ? '🔐 Connexion' : '📝 Inscription'}</h2>
                    <p className="text-muted">
                        {mode === 'login' 
                            ? 'Connectez-vous à votre compte' 
                            : 'Créez votre compte gratuitement'}
                    </p>
                </div>

                {erreur && <div className="alert alert-danger">{erreur}</div>}
                {succes && <div className="alert alert-success">{succes}</div>}

                <form className="auth-form" onSubmit={handleSubmit}>
                    {mode === 'register' && (
                        <div className="input-group">
                            <label>Nom complet</label>
                            <input
                                type="text"
                                value={nom}
                                onChange={(e) => setNom(e.target.value)}
                                placeholder="Jean Dupont"
                                required
                            />
                        </div>
                    )}

                    <div className="input-group">
                        <label>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="jean@email.com"
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label>Mot de passe</label>
                        <input
                            type="password"
                            value={motDePasse}
                            onChange={(e) => setMotDePasse(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {mode === 'register' && (
                        <div className="input-group">
                            <label>Confirmer le mot de passe</label>
                            <input
                                type="password"
                                value={confirmation}
                                onChange={(e) => setConfirmation(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={chargement}
                        className="btn btn-primary"
                        id="sub"
                    >
                        {chargement 
                            ? (mode === 'login' ? 'Connexion...' : 'Inscription...') 
                            : (mode === 'login' ? 'Se connecter' : "S'inscrire")}
                    </button>
                </form>

                <div className="auth-toggle" style={{ marginTop: '20px' }}>
                    <button className="btn btn-outline" onClick={toggleMode} id="sub">
                        {mode === 'login' 
                            ? "Pas encore de compte ? S'inscrire" 
                            : "Déjà un compte ? Se connecter"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Auth;