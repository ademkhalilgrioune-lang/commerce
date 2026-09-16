import React from "react";
import { Link } from "react-router-dom";

function Footer() {
    return (
        <footer className="footer">

            <div className="footer-container">

                <div className="footer-brand">

                    <h2 className="footer-logo">
                        🛍️ Solstice
                    </h2>

                    <p>
                        Découvrez une collection premium de montres,
                        chaussures, sacs, bijoux et accessoires
                        sélectionnés avec soin.
                    </p>

                </div>

                <div>

                    <h3 className="footer-title">
                        Navigation
                    </h3>

                    <div className="footer-links">

                        <Link to="/">Accueil</Link>
                        <Link to="/boutique">Boutique</Link>
                        <Link to="/panier">Panier</Link>
                        <Link to="/profile">Mon profil</Link>

                    </div>

                </div>

                <div>

                    <h3 className="footer-title">
                        Contact
                    </h3>

                    <div className="footer-contact">

                        <p>📍 Alger, Algérie</p>
                        <p>📧 contact@solstice.com</p>
                        <p>📞 +213 555 00 00 00</p>

                    </div>

                </div>

            </div>



        </footer>
    );
}

export default Footer;