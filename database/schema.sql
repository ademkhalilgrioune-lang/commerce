-- ============================================================
-- DATABASE SCHEMA - COMMERCE
-- Compatible avec le backend Node/Express
-- ============================================================

SET NAMES utf8mb4;

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- 1. UTILISATEURS
-- ============================================================

CREATE TABLE IF NOT EXISTS utilisateurs (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nom VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    mot_de_passe VARCHAR(255) NOT NULL,

    role ENUM('client', 'admin') NOT NULL DEFAULT 'client',

    email_verified BOOLEAN NOT NULL DEFAULT FALSE,

    otp_code VARCHAR(10) DEFAULT NULL,
    otp_expires_at DATETIME DEFAULT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY unique_email (email),
    INDEX idx_role (role),
    INDEX idx_email_verified (email_verified)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 2. CATEGORIES
-- ============================================================

CREATE TABLE IF NOT EXISTS categories (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nom VARCHAR(255) NOT NULL,

    PRIMARY KEY (id),
    UNIQUE KEY unique_categorie_nom (nom)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 3. PRODUITS
-- ============================================================

CREATE TABLE IF NOT EXISTS produits (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,

    nom VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,

    prix DECIMAL(10,2) NOT NULL DEFAULT 0.00,

    stock INT NOT NULL DEFAULT 0,

    photo VARCHAR(500) DEFAULT NULL,

    id_categorie INT UNSIGNED DEFAULT NULL,

    PRIMARY KEY (id),

    INDEX idx_produits_categorie (id_categorie),

    CONSTRAINT fk_produits_categories
        FOREIGN KEY (id_categorie)
        REFERENCES categories(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 4. COMMANDES
-- ============================================================

CREATE TABLE IF NOT EXISTS commandes (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,

    id_utilisateur INT UNSIGNED NOT NULL,

    statut ENUM(
        'en_cours',
        'en_attente',
        'en_preparation',
        'livree'
    ) NOT NULL DEFAULT 'en_cours',

    total DECIMAL(10,2) NOT NULL DEFAULT 0.00,

    date_commande DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    INDEX idx_commandes_utilisateur (id_utilisateur),
    INDEX idx_commandes_statut (statut),
    INDEX idx_commandes_date (date_commande),

    CONSTRAINT fk_commandes_utilisateur
        FOREIGN KEY (id_utilisateur)
        REFERENCES utilisateurs(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 5. LIGNES DE COMMANDES
-- ============================================================

CREATE TABLE IF NOT EXISTS ligne_commandes (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,

    id_commande INT UNSIGNED NOT NULL,
    id_produit INT UNSIGNED NOT NULL,

    quantite INT NOT NULL DEFAULT 1,

    prix_unitaire DECIMAL(10,2) NOT NULL DEFAULT 0.00,

    PRIMARY KEY (id),

    INDEX idx_ligne_commande (id_commande),
    INDEX idx_ligne_produit (id_produit),

    CONSTRAINT fk_ligne_commande
        FOREIGN KEY (id_commande)
        REFERENCES commandes(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_ligne_produit
        FOREIGN KEY (id_produit)
        REFERENCES produits(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 6. AVIS
-- ============================================================

CREATE TABLE IF NOT EXISTS avis (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,

    id_utilisateur INT UNSIGNED NOT NULL,
    id_produit INT UNSIGNED NOT NULL,

    note TINYINT UNSIGNED NOT NULL,

    commentaire TEXT DEFAULT NULL,

    date_avis DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    INDEX idx_avis_utilisateur (id_utilisateur),
    INDEX idx_avis_produit (id_produit),
    INDEX idx_avis_date (date_avis),

    UNIQUE KEY unique_avis_utilisateur_produit
        (id_utilisateur, id_produit),

    CONSTRAINT fk_avis_utilisateur
        FOREIGN KEY (id_utilisateur)
        REFERENCES utilisateurs(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_avis_produit
        FOREIGN KEY (id_produit)
        REFERENCES produits(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- FIN
-- ============================================================

SET FOREIGN_KEY_CHECKS = 1;
