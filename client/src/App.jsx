import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Auth from './pages/Auth';
import Accueil from './pages/Accueil';
import ProduitDetail from './pages/ProduitDetail';
import Panier from './pages/Panier';
import Boutique from './pages/Boutique';
import Profile from './pages/Profile';
import ModifyProfile from './pages/ModifyProfile';
import AdminUsers from './pages/Admin/AdminUsers';
import AdminProduits from './pages/Admin/AdminProduits';
import AdminProduitForm from './pages/Admin/AdminProduitForm';
import AdminCommandes from './pages/Admin/AdminCommandes';
import MesCommandes from './pages/MesCommandes';
import CommandeDetail from './pages/CommandeDetail';





function AppRoutes() {
    const { isAuthenticated, user } = useAuth();

    return (
        <Routes>
            {/* Page d'accueil (protégée) */}
            <Route 
                path="/accueil" 
                element={isAuthenticated ? <Accueil /> : <Navigate to="/auth" />} 
            />
            
            {/* Page d'authentification */}
            <Route 
                path="/auth" 
                element={isAuthenticated ? <Navigate to="/accueil" /> : <Auth />} 
            />
            
            {/* Redirection par défaut */}
            <Route 
                path="/" 
                element={<Navigate to={isAuthenticated ? "/accueil" : "/auth"} />} 
            />

            {/* Routes privées (client) */}
            <Route path="/profile/:id?" element={isAuthenticated ? <Profile /> : <Navigate to="/auth" />} />
            <Route path="/modify-profile" element={isAuthenticated ? <ModifyProfile /> : <Navigate to="/auth" />} />
            

            {/* Routes publiques */}
            <Route path="/produit/:id" element={<ProduitDetail />} />
            <Route path="/boutique" element={<Boutique />} />
<Route 
    path="/panier" 
    element={
        isAuthenticated && user?.role !== 'admin' ? (
            <Panier />
        ) : (
            <Navigate to={isAuthenticated ? "/accueil" : "/auth"} />
        )
    } 
/>

<Route 
    path="/mes-commandes" 
    element={
        isAuthenticated && user?.role !== 'admin' ? (
            <MesCommandes />
        ) : (
            <Navigate to={isAuthenticated ? "/accueil" : "/auth"} />
        )
    } 
/>

<Route 
    path="/commande/:id" 
    element={
        isAuthenticated  ? (
            <CommandeDetail />
        ) : (
            <Navigate to={isAuthenticated ? "/accueil" : "/auth"} />
        )
    } 
/>

            {/* ========================================== */}
            {/* ROUTES ADMIN (protégées) */}
            {/* ========================================== */}

            <Route 
                path="/admin/users" 
                element={
                    isAuthenticated && user?.role === 'admin' ? (
                        <AdminUsers />
                    ) : (
                        <Navigate to="/" />
                    )
                } 
            />
            <Route 
                path="/admin/produits" 
                element={
                    isAuthenticated && user?.role === 'admin' ? (
                        <AdminProduits />  // ← CORRIGÉ : AdminProduits, pas AdminUsers
                    ) : (
                        <Navigate to="/" />
                    )
                } 
            />
            <Route 
                path="/admin/produits/ajouter" 
                element={
                    isAuthenticated && user?.role === 'admin' ? (
                        <AdminProduitForm />
                    ) : (
                        <Navigate to="/" />
                    )
                } 
            />
            <Route 
                path="/admin/produits/modifier/:id" 
                element={
                    isAuthenticated && user?.role === 'admin' ? (
                        <AdminProduitForm />
                    ) : (
                        <Navigate to="/" />
                    )
                } 
            />
            <Route 
                path="/admin/commandes" 
                element={
                   isAuthenticated && user?.role === 'admin' ? (
                       <AdminCommandes />
                    ) : (
                        <Navigate to="/" />
                    )
                } 
/>
        </Routes>
    );
}

function App() {
    return (
        <AuthProvider>
            <Layout>
                <AppRoutes />
            </Layout>
        </AuthProvider>
    );
}

export default App;
