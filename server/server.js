// ==========================================
// 1. IMPORTS
// ==========================================
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const redis = require('redis');
const helmet = require('helmet');
const sharp = require('sharp');
require('dotenv').config();

// ==========================================
// 2. CONFIGURATION
// ==========================================
const app = express();
const PORT = process.env.PORT || 5001;

// ==========================================
// 3. MIDDLEWARE
// ==========================================
app.use(helmet());
// Compresse toutes les réponses (JSON + fichiers statiques) en gzip/br
// -> réduit la bande passante transférée, donc les coûts et le temps de chargement
app.use(compression());

// ==========================================
// CORS configuration - Allow multiple origins
app.use(cors({
    origin: true,  // ← Allows any origin (but still validates)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting for auth routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: { message: 'Trop de tentatives, veuillez réessayer dans 15 minutes' }
});

// ==========================================
// 2. REDIS CLIENT
// ==========================================


const redisClient = redis.createClient({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD
});

redisClient.on('error', (err) => console.error('❌ Redis Error:', err));
redisClient.on('connect', () => console.log('✅ Redis connected'));

// ✅ Pas besoin de .connect() avec Redis 3.x
console.log('✅ Redis client créé');


// ==========================================
// 3. CACHE HELPERS
// ==========================================
// ==========================================
// 3. CACHE HELPERS - Version Redis 3.x
// ==========================================
const CACHE_TTL = {
    PRODUITS: 60 * 5, // 5 minutes
    CATEGORIES: 60 * 60, // 1 heure
    STATS: 60 * 10, // 10 minutes
    PRODUIT_DETAIL: 60 * 5 // 5 minutes
};

const getCached = (key) => {
    return new Promise((resolve) => {
        redisClient.get(key, (err, data) => {
            if (err) {
                console.error('Cache get error:', err);
                resolve(null);
                return;
            }
            resolve(data ? JSON.parse(data) : null);
        });
    });
};

const setCached = (key, data, ttl = 60) => {
    return new Promise((resolve) => {
        redisClient.setex(key, ttl, JSON.stringify(data), (err) => {
            if (err) {
                console.error('Cache set error:', err);
                resolve(false);
                return;
            }
            resolve(true);
        });
    });
};

const clearCache = (pattern) => {
    return new Promise((resolve) => {
        redisClient.keys(pattern, (err, keys) => {
            if (err || !keys || keys.length === 0) {
                resolve();
                return;
            }
            redisClient.del(keys, (err) => {
                if (!err) {
                    console.log(`✅ Cache cleared: ${pattern} (${keys.length} keys)`);
                }
                resolve();
            });
        });
    });
};

const otpLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 3,
    message: { message: 'Trop de tentatives de vérification, veuillez réessayer dans 5 minutes' }
});

// ==========================================
// 4. CONNEXION MySQL
// ==========================================
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect((err) => {
    if (err) {
        console.error('❌ Erreur MySQL:', err);
        return;
    }
    console.log('✅ Connecté à MySQL');
});

// ==========================================
// 5. MIDDLEWARE : VÉRIFIER LE TOKEN
// ==========================================
const verifierToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Token manquant' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Token invalide' });
    }
};

// ==========================================
// MIDDLEWARE : VÉRIFIER QUE L'UTILISATEUR EST ADMIN
// ==========================================
const verifierAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Non authentifié' });
    }
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Accès refusé - Admin requis' });
    }
    next();
};

// ==========================================
// 6. CONFIGURATION MULTER (upload d'images)
// ==========================================

// Créer le dossier uploads s'il n'existe pas
const uploadDir = path.join(__dirname, 'uploads', 'produits');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuration du stockage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Sanitize filename to prevent path traversal
        const sanitized = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '');
        const uniqueName = Date.now() + '-' + sanitized;
        cb(null, uniqueName);
    }
});

// Filtrer pour accepter seulement les images
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Seules les images sont autorisées'), false);
    }
};

// Créer l'instance multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

// ==========================================
// COMPRESSION DES IMAGES PRODUITS (sharp)
// ==========================================
// Redimensionne (max 1200px de large) et recompresse en WebP qualité 80.
// Résultat typique : une photo de 400-680 Ko tombe à 30-90 Ko, sans perte
// visible pour une fiche produit. À appeler juste après upload.single('photo').
const optimiserImageProduit = async (req, res, next) => {
    if (!req.file) return next();
    try {
        const inputPath = req.file.path;
        const outputFilename = req.file.filename.replace(/\.[^.]+$/, '') + '.webp';
        const outputPath = path.join(uploadDir, outputFilename);

        await sharp(inputPath)
            .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 78 })
            .toFile(outputPath);

        // On supprime l'original non compressé et on redirige req.file
        // vers le fichier webp optimisé
        fs.unlinkSync(inputPath);
        req.file.filename = outputFilename;
        req.file.path = outputPath;
        next();
    } catch (err) {
        console.error('Erreur optimisation image:', err.message);
        next(); // on continue avec l'image d'origine plutôt que de bloquer l'upload
    }
};

// Servir les images statiquement
// ==========================================
// SERVIR LES IMAGES AVEC HEADERS CORS
// ==========================================
app.use('/uploads', (req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    // Les noms de fichiers contiennent déjà un timestamp unique (Date.now()-nom.jpg),
    // donc un fichier ne change JAMAIS une fois créé : on peut le mettre en cache
    // longtemps côté navigateur/CDN sans risque de servir une version périmée.
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    next();
}, express.static(path.join(__dirname, 'uploads')));

// ==========================================
// 7. ROUTES
// ==========================================

// ==========================================
// ROUTE POST /api/auth/register
// ==========================================


const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
});

// ===============================
// INSCRIPTION (FIXED)
// ===============================
// ==========================================
// ROUTE POST /api/auth/register
// ==========================================
app.post('/api/auth/register', authLimiter, async (req, res) => {
    try {
        const { nom, email, motDePasse } = req.body;

        if (!nom || !email || !motDePasse) {
            return res.status(400).json({ message: 'Tous les champs sont obligatoires' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Adresse email invalide' });
        }

        if (motDePasse.length < 6) {
            return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères' });
        }

        const [users] = await db.promise().query(
            'SELECT id, email_verified FROM utilisateurs WHERE email = ?',
            [email]
        );

        if (users.length > 0 && users[0].email_verified) {
            return res.status(409).json({ message: 'Cet email est déjà utilisé' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiration = new Date(Date.now() + 10 * 60 * 1000);
        const hash = await bcrypt.hash(motDePasse, 10);

        if (users.length > 0 && !users[0].email_verified) {
            await db.promise().query(
                `UPDATE utilisateurs SET otp_code = ?, otp_expires_at = ? WHERE email = ?`,
                [otp, expiration, email]
            );
        } else {
            await db.promise().query(
                `INSERT INTO utilisateurs (nom, email, mot_de_passe, role, email_verified, otp_code, otp_expires_at)
                 VALUES (?, ?, ?, 'client', FALSE, ?, ?)`,
                [nom, email, hash, otp, expiration]
            );
        }

        await transporter.sendMail({
            from: `"Ma Boutique" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Votre code de vérification',
            html: `
                <div style="font-family: Arial;">
                    <h2>Vérification de votre compte</h2>
                    <p>Votre code de vérification est :</p>
                    <h1 style="font-size: 48px;">${otp}</h1>
                    <p>Ce code est valable pendant 10 minutes.</p>
                    <p>Si vous n'avez pas demandé cette inscription, ignorez simplement cet email.</p>
                </div>
            `
        });

        res.status(201).json({ message: 'Un code OTP a été envoyé à votre adresse email' });
    } catch (error) {
        console.error('Erreur inscription:', error.message);
        res.status(500).json({ message: 'Erreur lors de l\'inscription' });
    }
});

// ==========================================
// ROUTE POST /api/auth/verify-otp
// ==========================================
app.post('/api/auth/verify-otp', otpLimiter, async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ message: 'Email et code OTP obligatoires' });
        }

        const [users] = await db.promise().query(
            `SELECT * FROM utilisateurs WHERE email = ? AND otp_code = ? AND otp_expires_at > NOW()`,
            [email, otp]
        );

        if (users.length === 0) {
            const [existing] = await db.promise().query(
                'SELECT email_verified FROM utilisateurs WHERE email = ?',
                [email]
            );
            
            if (existing.length === 0) {
                return res.status(404).json({ message: 'Utilisateur introuvable' });
            }
            
            if (existing[0].email_verified) {
                return res.status(400).json({ message: 'Email déjà vérifié' });
            }
            
            return res.status(400).json({ message: 'Code OTP incorrect ou expiré' });
        }

        const user = users[0];

        await db.promise().query(
            `UPDATE utilisateurs SET email_verified = TRUE, otp_code = NULL, otp_expires_at = NULL WHERE id = ?`,
            [user.id]
        );

        res.json({ message: 'Email vérifié avec succès' });
    } catch (error) {
        console.error('Erreur vérification OTP:', error.message);
        res.status(500).json({ message: 'Erreur lors de la vérification' });
    }
});

// ==========================================
// ROUTE POST /api/auth/login
// ==========================================
app.post('/api/auth/login', authLimiter, async (req, res) => {
    try {
        const { email, mot_de_passe } = req.body;

        if (!email || !mot_de_passe) {
            return res.status(400).json({ message: 'Email et mot de passe requis' });
        }

        const [users] = await db.promise().query(
            'SELECT * FROM utilisateurs WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
        }

        const user = users[0];

        if (!user.email_verified) {
            return res.status(403).json({ message: 'Veuillez vérifier votre email avant de vous connecter' });
        }

        const isValid = await bcrypt.compare(mot_de_passe, user.mot_de_passe);

        if (!isValid) {
            return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                nom: user.nom,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Erreur login:', error.message);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ==========================================
// ROUTE GET /api/produits - AVEC CACHE REDIS
// ==========================================
app.get('/api/produits', async (req, res) => {
    try {
        const { categorie } = req.query;
        const cacheKey = categorie ? `produits_cat_${categorie}` : 'produits_all';
        
        const cached = await getCached(cacheKey);
        if (cached) {
            console.log(`✅ Cache hit: ${cacheKey}`);
            return res.json(cached);
        }
        
        console.log(`❌ Cache miss: ${cacheKey}`);
        
        let query = 'SELECT * FROM produits ORDER BY nom';
        let params = [];
        if (categorie) {
            query = 'SELECT * FROM produits WHERE id_categorie = ? ORDER BY nom';
            params = [categorie];
        }
        
        const [produits] = await db.promise().query(query, params);
        await setCached(cacheKey, produits, CACHE_TTL.PRODUITS);
        res.json(produits);
    } catch (error) {
        console.error('Erreur GET produits:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ==========================================
// ROUTE GET /api/produits/:id - AVEC CACHE REDIS
// ==========================================
app.get('/api/produits/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const cacheKey = `produit_${id}`;
        
        const cached = await getCached(cacheKey);
        if (cached) {
            console.log(`✅ Cache hit: ${cacheKey}`);
            return res.json(cached);
        }
        
        console.log(`❌ Cache miss: ${cacheKey}`);
        
        const [produits] = await db.promise().query(
            'SELECT * FROM produits WHERE id = ?',
            [id]
        );
        
        if (produits.length === 0) {
            return res.status(404).json({ message: 'Produit non trouvé' });
        }
        
        await setCached(cacheKey, produits[0], CACHE_TTL.PRODUIT_DETAIL);
        res.json(produits[0]);
    } catch (error) {
        console.error('Erreur GET produit:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ==========================================
// ROUTE POST /api/produits - VIDE LE CACHE
// ==========================================
app.post('/api/produits', verifierToken, verifierAdmin, upload.single('photo'), optimiserImageProduit, async (req, res) => {
    try {
        const { nom, description, prix, stock, id_categorie } = req.body;

        if (!nom || !prix) {
            return res.status(400).json({ message: 'Nom et prix sont requis' });
        }

        let photoPath = null;
        if (req.file) {
            photoPath = `/uploads/produits/${req.file.filename}`;
        }

        const [result] = await db.promise().query(
            'INSERT INTO produits (nom, description, prix, stock, photo, id_categorie) VALUES (?, ?, ?, ?, ?, ?)',
            [nom, description || null, prix, stock || 0, photoPath, id_categorie]
        );

        await clearCache('produits_*');

        res.status(201).json({
            message: '✅ Produit créé avec succès',
            id: result.insertId,
            photo: photoPath
        });
    } catch (error) {
        console.error('Erreur POST produit:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ==========================================
// ROUTE PUT /api/produits/:id - VIDE LE CACHE
// ==========================================
app.put('/api/produits/:id', verifierToken, verifierAdmin, upload.single('photo'), optimiserImageProduit, async (req, res) => {
    try {
        const { id } = req.params;
        const { nom, description, prix, stock, id_categorie } = req.body;

        const [oldProduct] = await db.promise().query(
            'SELECT photo FROM produits WHERE id = ?',
            [id]
        );

        let photoPath = oldProduct[0]?.photo || null;

        if (req.file) {
            if (photoPath) {
                const oldFilePath = path.join(__dirname, photoPath);
                try {
                    if (fs.existsSync(oldFilePath)) {
                        fs.unlinkSync(oldFilePath);
                    }
                } catch (err) {
                    console.error('Failed to delete old image:', err.message);
                }
            }
            photoPath = `/uploads/produits/${req.file.filename}`;
        }

        await db.promise().query(
            'UPDATE produits SET nom = ?, description = ?, prix = ?, stock = ?, photo = ?, id_categorie = ? WHERE id = ?',
            [nom, description, prix, stock, photoPath, id_categorie, id]
        );

        await clearCache(`produit_${id}`);
        await clearCache('produits_*');

        res.json({
            message: '✅ Produit modifié avec succès',
            photo: photoPath
        });
    } catch (error) {
        console.error('Erreur PUT produit:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ==========================================
// ROUTE DELETE /api/produits/:id - VIDE LE CACHE
// ==========================================
app.delete('/api/produits/:id', verifierToken, verifierAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // On récupère le chemin de la photo AVANT de supprimer la ligne,
        // sinon on perd la référence et le fichier reste orphelin sur le disque pour toujours.
        const [produitRows] = await db.promise().query(
            'SELECT photo FROM produits WHERE id = ?',
            [id]
        );

        await db.promise().query(
            'DELETE FROM ligne_commandes WHERE id_produit = ?',
            [id]
        );

        const [result] = await db.promise().query(
            'DELETE FROM produits WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Produit non trouvé' });
        }

        const photoPath = produitRows[0]?.photo;
        if (photoPath) {
            const filePath = path.join(__dirname, photoPath);
            try {
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            } catch (err) {
                console.error('Impossible de supprimer le fichier image:', err.message);
            }
        }

        await clearCache(`produit_${id}`);
        await clearCache('produits_*');

        res.json({ message: '✅ Produit supprimé avec succès' });
    } catch (error) {
        console.error('Erreur DELETE produit:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ==========================================
// ROUTE GET /api/categories - AVEC CACHE REDIS
// ==========================================
app.get('/api/categories', async (req, res) => {
    try {
        const cached = await getCached('categories');
        if (cached) {
            console.log('✅ Cache hit: categories');
            return res.json(cached);
        }
        
        console.log('❌ Cache miss: categories');
        
        const [categories] = await db.promise().query(
            'SELECT * FROM categories ORDER BY nom'
        );
        
        await setCached('categories', categories, CACHE_TTL.CATEGORIES);
        res.json(categories);
    } catch (error) {
        console.error('Erreur GET categories:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ==========================================
// ROUTE GET /api/panier
// ==========================================
app.get('/api/panier', verifierToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const [commandes] = await db.promise().query(
            'SELECT id FROM commandes WHERE id_utilisateur = ? AND statut = "en_cours"',
            [userId]
        );

        if (commandes.length === 0) {
            return res.json({ panier: [], total: 0 });
        }

        const commandeId = commandes[0].id;

        const [lignes] = await db.promise().query(
            `SELECT lc.*, p.nom, p.photo, p.prix 
             FROM ligne_commandes lc
             JOIN produits p ON lc.id_produit = p.id
             WHERE lc.id_commande = ?`,
            [commandeId]
        );

        const total = lignes.reduce((sum, item) => sum + (item.prix_unitaire * item.quantite), 0);

        res.json({ panier: lignes, total });
    } catch (error) {
        console.error('Erreur GET panier:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ==========================================
// ROUTE POST /api/panier
// ==========================================
// ==========================================
// ROUTE POST /api/panier - AVEC LIMITES
// ==========================================
app.post('/api/panier', verifierToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id_produit, quantite } = req.body;

        if (!id_produit || !quantite || quantite < 1) {
            return res.status(400).json({ message: 'Produit et quantité requis' });
        }

        // ✅ LIMITE : max 10 articles par produit
        if (quantite > 10) {
            return res.status(400).json({ message: 'Quantité maximale de 10 par produit' });
        }

        const [produits] = await db.promise().query(
            'SELECT prix, stock FROM produits WHERE id = ?',
            [id_produit]
        );

        if (produits.length === 0) {
            return res.status(404).json({ message: 'Produit non trouvé' });
        }

        if (produits[0].stock < quantite) {
            return res.status(400).json({ message: 'Stock insuffisant' });
        }

        let [commandes] = await db.promise().query(
            'SELECT id FROM commandes WHERE id_utilisateur = ? AND statut = "en_cours"',
            [userId]
        );

        let commandeId;

        if (commandes.length === 0) {
            const [result] = await db.promise().query(
                'INSERT INTO commandes (id_utilisateur, statut) VALUES (?, ?)',
                [userId, 'en_cours']
            );
            commandeId = result.insertId;
        } else {
            commandeId = commandes[0].id;
        }

        // ✅ VÉRIFIER LE NOMBRE TOTAL D'ARTICLES DANS LE PANIER
        const [totalItems] = await db.promise().query(
            'SELECT SUM(quantite) AS total FROM ligne_commandes WHERE id_commande = ?',
            [commandeId]
        );
        
        const totalActuel = totalItems[0].total || 0;
        const LIMITE_TOTAL_PANIER = 20; // ✅ MAX 20 articles au total

        if (totalActuel + quantite > LIMITE_TOTAL_PANIER) {
            return res.status(400).json({ 
                message: `Vous ne pouvez pas avoir plus de ${LIMITE_TOTAL_PANIER} articles dans votre panier` 
            });
        }

        const [existants] = await db.promise().query(
            'SELECT id, quantite FROM ligne_commandes WHERE id_commande = ? AND id_produit = ?',
            [commandeId, id_produit]
        );

        if (existants.length > 0) {
            const nouvelleQuantite = existants[0].quantite + quantite;
            
            // ✅ Vérifier que le produit individuel ne dépasse pas 10
            if (nouvelleQuantite > 10) {
                return res.status(400).json({ 
                    message: `Vous ne pouvez pas avoir plus de 10 exemplaires de ce produit` 
                });
            }
            
            await db.promise().query(
                'UPDATE ligne_commandes SET quantite = ? WHERE id = ?',
                [nouvelleQuantite, existants[0].id]
            );
        } else {
            await db.promise().query(
                'INSERT INTO ligne_commandes (id_commande, id_produit, quantite, prix_unitaire) VALUES (?, ?, ?, ?)',
                [commandeId, id_produit, quantite, produits[0].prix]
            );
        }

        res.json({ message: '✅ Ajouté au panier' });
    } catch (error) {
        console.error('Erreur POST panier:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ==========================================
// ROUTE DELETE /api/panier/:id
// ==========================================
app.delete('/api/panier/:id', verifierToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const produitId = req.params.id;

        const [commandes] = await db.promise().query(
            'SELECT id FROM commandes WHERE id_utilisateur = ? AND statut = "en_cours"',
            [userId]
        );

        if (commandes.length === 0) {
            return res.status(404).json({ message: 'Panier non trouvé' });
        }

        const commandeId = commandes[0].id;

        await db.promise().query(
            'DELETE FROM ligne_commandes WHERE id_commande = ? AND id_produit = ?',
            [commandeId, produitId]
        );

        res.json({ message: '✅ Produit supprimé du panier' });
    } catch (error) {
        console.error('Erreur DELETE panier:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ==========================================
// ROUTE PUT /api/panier/:id
// ==========================================
app.put('/api/panier/:id', verifierToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const produitId = req.params.id;
        const { delta } = req.body;

        if (!delta || typeof delta !== 'number') {
            return res.status(400).json({ message: 'Delta doit être un nombre' });
        }

        const [commandes] = await db.promise().query(
            'SELECT id FROM commandes WHERE id_utilisateur = ? AND statut = "en_cours"',
            [userId]
        );

        if (commandes.length === 0) {
            return res.status(404).json({ message: 'Panier non trouvé' });
        }

        const commandeId = commandes[0].id;

        const [lignes] = await db.promise().query(
            'SELECT id, quantite FROM ligne_commandes WHERE id_commande = ? AND id_produit = ?',
            [commandeId, produitId]
        );

        if (lignes.length === 0) {
            return res.status(404).json({ message: 'Produit non trouvé dans le panier' });
        }

        const ligneId = lignes[0].id;
        const nouvelleQuantite = lignes[0].quantite + delta;

        if (nouvelleQuantite < 1) {
            await db.promise().query('DELETE FROM ligne_commandes WHERE id = ?', [ligneId]);

            const [restant] = await db.promise().query(
                'SELECT COUNT(*) AS count FROM ligne_commandes WHERE id_commande = ?',
                [commandeId]
            );

            if (restant[0].count === 0) {
                await db.promise().query('DELETE FROM commandes WHERE id = ?', [commandeId]);
            }

            const [panierMisAJour] = await db.promise().query(
                `SELECT lc.*, p.nom, p.photo, p.prix 
                 FROM ligne_commandes lc
                 JOIN produits p ON lc.id_produit = p.id
                 WHERE lc.id_commande = ?`,
                [commandeId]
            );

            const total = panierMisAJour.reduce((sum, item) => 
                sum + (item.prix_unitaire * item.quantite), 0
            );

            return res.json({ 
                panier: panierMisAJour, 
                total,
                message: '✅ Article supprimé du panier'
            });
        }

        const [produits] = await db.promise().query(
            'SELECT stock FROM produits WHERE id = ?',
            [produitId]
        );

        if (produits.length === 0) {
            return res.status(404).json({ message: 'Produit non trouvé' });
        }

        if (nouvelleQuantite > produits[0].stock) {
            return res.status(400).json({ 
                message: `❌ Stock insuffisant. Stock disponible : ${produits[0].stock}` 
            });
        }

        await db.promise().query(
            'UPDATE ligne_commandes SET quantite = ? WHERE id = ?',
            [nouvelleQuantite, ligneId]
        );

        const [panierMisAJour] = await db.promise().query(
            `SELECT lc.*, p.nom, p.photo, p.prix 
             FROM ligne_commandes lc
             JOIN produits p ON lc.id_produit = p.id
             WHERE lc.id_commande = ?`,
            [commandeId]
        );

        const total = panierMisAJour.reduce((sum, item) => 
            sum + (item.prix_unitaire * item.quantite), 0
        );

        res.json({ 
            panier: panierMisAJour, 
            total,
            message: '✅ Quantité mise à jour'
        });
    } catch (error) {
        console.error('Erreur PUT panier:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ==========================================
// ROUTE GET /api/auth/profil
// ==========================================
app.get('/api/auth/profil', verifierToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const [users] = await db.promise().query(
            'SELECT id, nom, email, role, created_at FROM utilisateurs WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        res.json(users[0]);
    } catch (error) {
        console.error('Erreur GET profil:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ==========================================
// ROUTE PUT /api/auth/profil
// ==========================================
app.put('/api/auth/profil', verifierToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { nom } = req.body;

        if (!nom) {
            return res.status(400).json({ message: 'Le nom est requis' });
        }

        await db.promise().query(
            'UPDATE utilisateurs SET nom = ? WHERE id = ?',
            [nom, userId]
        );

        const [users] = await db.promise().query(
            'SELECT id, nom, email, role, created_at FROM utilisateurs WHERE id = ?',
            [userId]
        );

        res.json({
            message: '✅ Profil modifié avec succès',
            user: users[0]
        });
    } catch (error) {
        console.error('Erreur PUT profil:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ==========================================
// ROUTE GET /api/produits/:id/avis - LIMITÉ À 5
// ==========================================
app.get('/api/produits/:id/avis', async (req, res) => {
    try {
        const { id } = req.params;
        const limit = parseInt(req.query.limit) || 5;

        const [avis] = await db.promise().query(
            `SELECT a.*, u.nom AS nom_utilisateur 
             FROM avis a
             JOIN utilisateurs u ON a.id_utilisateur = u.id
             WHERE a.id_produit = ?
             ORDER BY a.date_avis DESC
             LIMIT ?`,
            [id, limit]
        );

        const [countResult] = await db.promise().query(
            'SELECT COUNT(*) AS total FROM avis WHERE id_produit = ?',
            [id]
        );
        const total = countResult[0].total;

        const moyenne = avis.length > 0 
            ? avis.reduce((sum, a) => sum + a.note, 0) / avis.length 
            : 0;

        res.json({
            avis: avis,
            moyenne: moyenne,
            total: total,
            limite: limit
        });
    } catch (error) {
        console.error('Erreur GET avis:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ==========================================
// ROUTE POST /api/avis - VIDE STATS CACHE
// ==========================================
app.post('/api/avis', verifierToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id_produit, note, commentaire } = req.body;

        if (!id_produit || !note) {
            return res.status(400).json({ message: 'Produit et note sont requis' });
        }

        if (note < 1 || note > 5) {
            return res.status(400).json({ message: 'La note doit être entre 1 et 5' });
        }

        const [produits] = await db.promise().query(
            'SELECT id FROM produits WHERE id = ?',
            [id_produit]
        );

        if (produits.length === 0) {
            return res.status(404).json({ message: 'Produit non trouvé' });
        }

        const [existants] = await db.promise().query(
            'SELECT id FROM avis WHERE id_utilisateur = ? AND id_produit = ?',
            [userId, id_produit]
        );

        if (existants.length > 0) {
            return res.status(409).json({ message: 'Vous avez déjà laissé un avis sur ce produit' });
        }

        await db.promise().query(
            'INSERT INTO avis (id_utilisateur, id_produit, note, commentaire) VALUES (?, ?, ?, ?)',
            [userId, id_produit, note, commentaire || null]
        );

        await clearCache('stats');

        res.status(201).json({ message: '✅ Avis ajouté avec succès' });
    } catch (error) {
        console.error('Erreur POST avis:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ==========================================
// ROUTE PUT /api/avis/:id - VIDE STATS CACHE
// ==========================================
app.put('/api/avis/:id', verifierToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const avisId = req.params.id;
        const { note, commentaire } = req.body;

        const [avis] = await db.promise().query(
            'SELECT * FROM avis WHERE id = ?',
            [avisId]
        );

        if (avis.length === 0) {
            return res.status(404).json({ message: 'Avis non trouvé' });
        }

        if (avis[0].id_utilisateur !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Accès refusé' });
        }

        await db.promise().query(
            'UPDATE avis SET note = ?, commentaire = ? WHERE id = ?',
            [note, commentaire || null, avisId]
        );

        await clearCache('stats');

        res.json({ message: '✅ Avis modifié avec succès' });
    } catch (error) {
        console.error('Erreur PUT avis:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ==========================================
// ROUTE DELETE /api/avis/:id - VIDE STATS CACHE
// ==========================================
app.delete('/api/avis/:id', verifierToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const avisId = req.params.id;

        const [avis] = await db.promise().query(
            'SELECT * FROM avis WHERE id = ?',
            [avisId]
        );

        if (avis.length === 0) {
            return res.status(404).json({ message: 'Avis non trouvé' });
        }

        if (avis[0].id_utilisateur !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Accès refusé' });
        }

        await db.promise().query(
            'DELETE FROM avis WHERE id = ?',
            [avisId]
        );

        await clearCache('stats');

        res.json({ message: '✅ Avis supprimé avec succès' });
    } catch (error) {
        console.error('Erreur DELETE avis:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ==========================================
// ROUTE GET /api/stats - AVEC CACHE REDIS
// ==========================================
app.get('/api/stats', async (req, res) => {
    try {
        const cached = await getCached('stats');
        if (cached) {
            console.log('✅ Cache hit: stats');
            return res.json(cached);
        }
        
        console.log('❌ Cache miss: stats');
        
        const [produits] = await db.promise().query('SELECT COUNT(*) AS total FROM produits');
        const [clients] = await db.promise().query('SELECT COUNT(*) AS total FROM utilisateurs WHERE role = "client"');
        const [avis] = await db.promise().query('SELECT COUNT(*) AS total, AVG(note) AS moyenne FROM avis');

        const stats = {
            produits: produits[0].total || 0,
            clients: clients[0].total || 0,
            totalAvis: avis[0].total || 0,
            moyenneAvis: avis[0].moyenne || 0
        };
        
        await setCached('stats', stats, CACHE_TTL.STATS);
        res.json(stats);
    } catch (error) {
        console.error('Erreur GET stats:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ==========================================
// ROUTE GET /api/admin/users
// ==========================================
app.get('/api/admin/users', verifierToken, verifierAdmin, async (req, res) => {
    try {
        const [users] = await db.promise().query(
            'SELECT id, nom, email, role, created_at FROM utilisateurs ORDER BY id'
        );
        res.json(users);
    } catch (error) {
        console.error('Erreur GET admin/users:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ==========================================
// ROUTE GET /api/admin/users/:id
// ==========================================
app.get('/api/admin/users/:id', verifierToken, verifierAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const [users] = await db.promise().query(
            'SELECT id, nom, email, role, created_at FROM utilisateurs WHERE id = ?',
            [id]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        res.json(users[0]);
    } catch (error) {
        console.error('Erreur GET admin/users/:id:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ==========================================
// ROUTE PUT /api/admin/users/:id/role - VIDE STATS CACHE
// ==========================================
app.put('/api/admin/users/:id/role', verifierToken, verifierAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!['admin', 'client'].includes(role)) {
            return res.status(400).json({ message: 'Rôle invalide' });
        }

        if (parseInt(id) === req.user.id) {
            return res.status(403).json({ message: 'Vous ne pouvez pas changer votre propre rôle' });
        }

        await db.promise().query(
            'UPDATE utilisateurs SET role = ? WHERE id = ?',
            [role, id]
        );

        await clearCache('stats');

        res.json({ message: '✅ Rôle modifié avec succès' });
    } catch (error) {
        console.error('Erreur PUT admin/users/role:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ==========================================
// ROUTE DELETE /api/admin/users/:id - VIDE STATS CACHE
// ==========================================
app.delete('/api/admin/users/:id', verifierToken, verifierAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        if (parseInt(id) === req.user.id) {
            return res.status(403).json({ message: 'Vous ne pouvez pas vous supprimer vous-même' });
        }

        await db.promise().query(
            'DELETE FROM utilisateurs WHERE id = ?',
            [id]
        );

        await clearCache('stats');

        res.json({ message: '✅ Utilisateur supprimé avec succès' });
    } catch (error) {
        console.error('Erreur DELETE admin/users:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ==========================================
// ROUTE GET /api/admin/orders
// ==========================================
app.get('/api/admin/orders', verifierToken, verifierAdmin, async (req, res) => {
    try {
        const [orders] = await db.promise().query(
            `SELECT c.*, u.nom AS nom_utilisateur 
             FROM commandes c
             JOIN utilisateurs u ON c.id_utilisateur = u.id
             ORDER BY c.date_commande DESC`
        );
        res.json(orders);
    } catch (error) {
        console.error('Erreur GET admin/orders:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ==========================================
// ROUTE PUT /api/admin/orders/:id/status - AVEC TRANSACTION
// ==========================================
// ==========================================
// ROUTE PUT /api/admin/orders/:id/status - AVEC TRANSACTION (CORRIGÉE)
// ==========================================
// ==========================================
// ROUTE PUT /api/admin/orders/:id/status - AVEC LOGIQUE STOCK
// ==========================================
// ==========================================
// ROUTE PUT /api/admin/orders/:id/status - LOGIQUE STOCK SIMPLIFIÉE
// ==========================================
app.put('/api/admin/orders/:id/status', verifierToken, verifierAdmin, async (req, res) => {
    const connection = db.promise();
    
    try {
        const { id } = req.params;
        const { statut } = req.body;

        const statutsValides = ['en_attente', 'en_preparation', 'livree', 'refusee'];
        if (!statutsValides.includes(statut)) {
            return res.status(400).json({ message: 'Statut invalide' });
        }

        await connection.query('START TRANSACTION');

        const [commandes] = await connection.query(
            'SELECT statut FROM commandes WHERE id = ?',
            [id]
        );

        if (commandes.length === 0) {
            await connection.query('ROLLBACK');
            return res.status(404).json({ message: 'Commande non trouvée' });
        }

        const ancienStatut = commandes[0].statut;

        // ✅ DÉSTOCKAGE UNIQUEMENT SI ON PASSE EN "livree" ET QUE CE N'ÉTAIT PAS DÉJÀ FAIT
        if (statut === 'livree' && ancienStatut !== 'livree') {
            const [lignes] = await connection.query(
                'SELECT id_produit, quantite FROM ligne_commandes WHERE id_commande = ?',
                [id]
            );

            // Vérifier si le stock n'a pas déjà été déduit (cas où on était déjà en préparation)
            // Si on vient de en_attente ou en_preparation, on déduit le stock
            for (const ligne of lignes) {
                const [produits] = await connection.query(
                    'SELECT stock FROM produits WHERE id = ?',
                    [ligne.id_produit]
                );

                if (produits[0].stock < ligne.quantite) {
                    await connection.query('ROLLBACK');
                    return res.status(400).json({ 
                        message: `Stock insuffisant pour le produit ${ligne.id_produit}` 
                    });
                }

                await connection.query(
                    'UPDATE produits SET stock = stock - ? WHERE id = ?',
                    [ligne.quantite, ligne.id_produit]
                );
            }
        }

        // ✅ AUCUNE REMISE EN STOCK (car on ne déstocke qu'en livree)

        await connection.query(
            'UPDATE commandes SET statut = ? WHERE id = ?',
            [statut, id]
        );

        await connection.query('COMMIT');

        await clearCache('stats');
        await clearCache('produits_*');

        res.json({ message: `✅ Statut changé en "${statut}"` });

    } catch (error) {
        await connection.query('ROLLBACK');
        console.error('Erreur PUT admin/orders/status:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ==========================================
// ROUTE POST /api/commandes/valider - VIDE STATS CACHE
// ==========================================
// ==========================================
// ROUTE POST /api/commandes/valider - AVEC LIMITE
// ==========================================
app.post('/api/commandes/valider', verifierToken, async (req, res) => {
    try {
        const userId = req.user.id;
        // ✅ VÉRIFIER LE NOMBRE DE COMMANDES PAR JOUR
const [commandesAujourdhui] = await db.promise().query(
    `SELECT COUNT(*) AS count 
     FROM commandes 
     WHERE id_utilisateur = ? 
       AND DATE(date_commande) = CURDATE()`,
    [userId]
);

const LIMITE_COMMANDES_PAR_JOUR = 5;

if (commandesAujourdhui[0].count >= LIMITE_COMMANDES_PAR_JOUR) {
    return res.status(400).json({ 
        message: `Vous avez déjà ${commandesAujourdhui[0].count} commandes aujourd'hui. Revenez demain !` 
    });
}

      
        const [commandesEnAttente] = await db.promise().query(
            `SELECT COUNT(*) AS count 
             FROM commandes 
             WHERE id_utilisateur = ? 
               AND statut IN ('en_attente', 'en_preparation')`,
            [userId]
        );

        const LIMITE_COMMANDES_EN_ATTENTE = 3; // ✅ MAX 3 commandes en attente

        if (commandesEnAttente[0].count >= LIMITE_COMMANDES_EN_ATTENTE) {
            return res.status(400).json({ 
                message: `Vous avez déjà ${commandesEnAttente[0].count} commandes en attente. Veuillez attendre qu'elles soient traitées.` 
            });
        }

        const [commandes] = await db.promise().query(
            'SELECT id FROM commandes WHERE id_utilisateur = ? AND statut = "en_cours"',
            [userId]
        );

        if (commandes.length === 0) {
            return res.status(400).json({ message: 'Panier vide' });
        }

        const commandeId = commandes[0].id;

        const [lignes] = await db.promise().query(
            'SELECT id_produit, quantite, prix_unitaire FROM ligne_commandes WHERE id_commande = ?',
            [commandeId]
        );

        if (lignes.length === 0) {
            return res.status(400).json({ message: 'Panier vide' });
        }

        const total = lignes.reduce((sum, item) => sum + (item.quantite * item.prix_unitaire), 0);

        await db.promise().query(
            'UPDATE commandes SET statut = "en_attente", total = ?, date_commande = NOW() WHERE id = ?',
            [total, commandeId]
        );

        await clearCache('stats');

        res.json({ 
            message: '✅ Commande validée avec succès', 
            commandeId,
            total: total
        });
    } catch (error) {
        console.error('Erreur validation commande:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ==========================================
// ROUTE GET /api/mes-commandes
// ==========================================
app.get('/api/mes-commandes', verifierToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const [commandes] = await db.promise().query(
            `SELECT c.* 
             FROM commandes c
             WHERE c.id_utilisateur = ? 
               AND c.statut != "en_cours"
             ORDER BY c.date_commande DESC`,
            [userId]
        );

        res.json(commandes);
    } catch (error) {
        console.error('Erreur GET mes-commandes:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ==========================================
// ROUTE GET /api/commandes/:id
// ==========================================
app.get('/api/commandes/:id', verifierToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const isAdmin = req.user.role === 'admin';
        

        let commandes;

        if (isAdmin) {
            [commandes] = await db.promise().query(
                'SELECT * FROM commandes WHERE id = ? AND statut != "en_cours"',
                [id]
            );
        } else {
            [commandes] = await db.promise().query(
                'SELECT * FROM commandes WHERE id = ? AND id_utilisateur = ? AND statut != "en_cours"',
                [id, userId]
            );
        }

        if (commandes.length === 0) {
            return res.status(404).json({ message: 'Commande non trouvée' });
        }

        const [lignes] = await db.promise().query(
            `SELECT lc.*, p.nom, p.photo 
             FROM ligne_commandes lc
             JOIN produits p ON lc.id_produit = p.id
             WHERE lc.id_commande = ?`,
            [id]
        );

        res.json({
            commande: commandes[0],
            lignes: lignes
        });
    } catch (error) {
        console.error('Erreur GET commande:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ==========================================
// ROUTE POST /api/auth/request-password-change
// ==========================================
app.post('/api/auth/request-password-change', verifierToken, async (req, res) => {
    try {
        const { email, mot_de_passe_actuel, nouveau_mot_de_passe } = req.body;
        const userId = req.user.id;

        console.log('📥 Demande changement mot de passe pour:', email);

        const [users] = await db.promise().query(
            'SELECT * FROM utilisateurs WHERE id = ? AND email = ?',
            [userId, email]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        const user = users[0];

        const isValid = await bcrypt.compare(mot_de_passe_actuel, user.mot_de_passe);
        if (!isValid) {
            return res.status(401).json({ message: 'Mot de passe actuel incorrect' });
        }

        const hashNouveau = await bcrypt.hash(nouveau_mot_de_passe, 10);
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiration = new Date(Date.now() + 10 * 60 * 1000);

        await db.promise().query(
            `UPDATE utilisateurs 
             SET otp_code = ?, otp_expires_at = ?, mot_de_passe = ?
             WHERE id = ?`,
            [otp, expiration, hashNouveau, userId]
        );

        await transporter.sendMail({
            from: `"Ma Boutique" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Code de vérification - Changement de mot de passe',
            html: `
                <div style="font-family: Arial; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
                    <h2 style="color: #e11d2e;">🔐 Changement de mot de passe</h2>
                    <p>Votre code de vérification est :</p>
                    <div style="text-align: center; font-size: 48px; font-weight: 800; letter-spacing: 10px; background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0;">
                        ${otp}
                    </div>
                    <p style="color: #64748b;">Ce code est valable pendant <strong>10 minutes</strong>.</p>
                </div>
            `
        });

        res.json({ message: 'Code de vérification envoyé' });
    } catch (error) {
        console.error('❌ Erreur demande changement:', error.message);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ==========================================
// ROUTE POST /api/auth/verify-password-otp
// ==========================================
app.post('/api/auth/verify-password-otp', verifierToken, async (req, res) => {
    try {
        const { email, otp } = req.body;
        const userId = req.user.id;

        console.log('📥 Vérification OTP pour:', email);

        const [users] = await db.promise().query(
            `SELECT * FROM utilisateurs 
             WHERE id = ? AND email = ? AND otp_code = ? AND otp_expires_at > NOW()`,
            [userId, email, otp]
        );

        if (users.length === 0) {
            const [existing] = await db.promise().query(
                `SELECT otp_code, otp_expires_at FROM utilisateurs 
                 WHERE id = ? AND email = ?`,
                [userId, email]
            );

            if (existing.length > 0 && existing[0].otp_code === otp) {
                return res.status(400).json({ message: 'Le code a expiré. Cliquez sur "Renvoyer le code"' });
            }

            return res.status(400).json({ message: 'Code OTP incorrect ou expiré' });
        }

        await db.promise().query(
            `UPDATE utilisateurs SET otp_code = NULL, otp_expires_at = NULL WHERE id = ?`,
            [userId]
        );

        console.log('✅ Mot de passe changé avec succès pour:', email);

        res.json({ message: 'Mot de passe changé avec succès' });
    } catch (error) {
        console.error('❌ Erreur vérification OTP:', error.message);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ==========================================
// ROUTE POST /api/auth/resend-password-otp
// ==========================================
app.post('/api/auth/resend-password-otp', verifierToken, async (req, res) => {
    try {
        const { email } = req.body;
        const userId = req.user.id;

        console.log('📥 Renvoi OTP pour:', email);

        const [users] = await db.promise().query(
            'SELECT * FROM utilisateurs WHERE id = ? AND email = ?',
            [userId, email]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        const user = users[0];

        if (!user.otp_code) {
            return res.status(400).json({ message: 'Aucune demande de changement en cours' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiration = new Date(Date.now() + 10 * 60 * 1000);

        await db.promise().query(
            `UPDATE utilisateurs SET otp_code = ?, otp_expires_at = ? WHERE id = ? AND email = ?`,
            [otp, expiration, userId, email]
        );

        await transporter.sendMail({
            from: `"Ma Boutique" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Nouveau code de vérification',
            html: `
                <div style="font-family: Arial; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
                    <h2 style="color: #e11d2e;">🔄 Nouveau code de vérification</h2>
                    <p>Votre nouveau code est :</p>
                    <div style="text-align: center; font-size: 48px; font-weight: 800; letter-spacing: 10px; background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0;">
                        ${otp}
                    </div>
                    <p style="color: #64748b;">Ce code est valable pendant <strong>10 minutes</strong>.</p>
                </div>
            `
        });

        console.log('📧 Nouveau OTP envoyé à:', email);

        res.json({ message: 'Nouveau code envoyé' });
    } catch (error) {
        console.error('❌ Erreur renvoi OTP:', error.message);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ==========================================
// HEALTH CHECK
// ==========================================
app.get('/api/health', (req, res) => {
    redisClient.set('health_test', 'ok', 10, (err) => {
        if (err) {
            console.error('❌ Redis health check:', err);
            return res.status(500).json({
                status: 'OK',
                mysql: 'connected',
                redis: '❌ NOT WORKING',
                error: err.message
            });
        }

        res.json({
            status: 'OK',
            mysql: 'connected',
            redis: '✅ WORKING'
        });
    });
});

// ==========================================
// 8. DÉMARRER LE SERVEUR
// ==========================================
app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Serveur sur http://localhost:${PORT}`);
});
