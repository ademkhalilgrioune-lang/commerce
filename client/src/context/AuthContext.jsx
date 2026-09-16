import React, { createContext, useState, useContext } from 'react';
import api from '../api/axiosConfig';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    // On récupère l'utilisateur déjà connecté (s'il y en a un) au chargement de l'app
    const [user, setUser] = useState(() => {
        const stored = localStorage.getItem('user');
        return stored ? JSON.parse(stored) : null;
    });

    // ==========================================
    // LOGIN
    // ==========================================


    // Au login, assure-toi que le rôle est bien stocké
const login = async (email, motDePasse) => {
    const response = await api.post('/auth/login', { email, mot_de_passe: motDePasse });
    const { token, user } = response.data;
    
    console.log('🔑 User role:', user.role); // ← Vérifie que c'est 'admin'
    
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
    return user;
};

    // ==========================================
    // REGISTER (envoie un OTP par email)
    // ==========================================
    const register = async (nom, email, motDePasse) => {
        const response = await api.post('/auth/register', {
            nom,
            email,
            motDePasse
        });

        return response.data;
    };

    // ==========================================
    // VÉRIFIER LE CODE OTP
    // ==========================================
    const verifyOTP = async (email, otp) => {
        const response = await api.post('/auth/verify-otp', {
            email,
            otp
        });

        return response.data;
    };

    // ==========================================
    // RENVOYER LE CODE OTP
    // ==========================================
    const resendOTP = async (email) => {
        // On réutilise l'endpoint register avec des valeurs factices
        // Le backend ne mettra à jour que l'OTP si l'utilisateur existe déjà
        const response = await api.post('/auth/register', {
            nom: 'Resend',
            email,
            motDePasse: 'dummy123'
        });

        return response.data;
    };

    // ==========================================
    // DÉCONNEXION
    // ==========================================
    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    // ==========================================
    // VALEUR DU CONTEXT
    // ==========================================
    const value = {
        user,
        login,
        register,
        verifyOTP,
        resendOTP,
        logout,
        isAuthenticated: !!user
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};