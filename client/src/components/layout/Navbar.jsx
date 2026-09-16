import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function Navbar() {
    const { user, logout, isAuthenticated } = useAuth();

    return (
        <nav className="navbar">
            <div className="navbar-container">

                <Link to="/" className="logo">
                    🛍️ Solstice
                </Link>

                <div className="nav-links">

                    <Link to="/">
                        Accueil
                    </Link>

                    <Link to="/boutique">
                        Boutique
                    </Link>

                    {isAuthenticated && user?.role !== 'admin' && (
                        <Link to="/panier">
                            🛒 Panier
                        </Link>
                    )}
                    {isAuthenticated && user?.role !== 'admin' && (
                        <Link to="/mes-commandes">
                            📦 Commandes
                        </Link>
                    )}

 

                    {isAuthenticated ? (
                        <>
                            <Link to="/profile">
                                👋 {user.nom}
                            </Link>

                            <button
                                onClick={logout}
                                className="btn btn-outline"
                            >
                                Déconnexion
                            </button>
                        </>
                    ) : (
                        <Link to="/auth">
                            <button className="btn btn-primary">
                                Connexion
                            </button>
                        </Link>
                    )}

                </div>

            </div>
        </nav>
    );
}

export default Navbar;
