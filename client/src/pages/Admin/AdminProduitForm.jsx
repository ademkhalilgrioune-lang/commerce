import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axiosConfig';

function AdminProduitForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = !!id;

    const [formData, setFormData] = useState({
        nom: '',
        description: '',
        prix: '',
        stock: 0,
        id_categorie: '',
        photo: null
    });
    const [categories, setCategories] = useState([]);
    const [chargement, setChargement] = useState(isEdit);
    const [erreur, setErreur] = useState('');
    const [message, setMessage] = useState('');
    const [photoApercu, setPhotoApercu] = useState(null);

    useEffect(() => {
        chargerCategories();
        if (isEdit) chargerProduit();
    }, []);

    const getImageUrl = (photoPath) => {
    if (!photoPath) return null;
    if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) {
        return photoPath;
    }
    return `http://192.168.100.6:5001${photoPath}`;
};

    const chargerCategories = async () => {
        try {
            const response = await api.get('/categories');
            setCategories(response.data);
        } catch (error) {
            console.error('Erreur chargement catégories:', error);
        }
    };

const chargerProduit = async () => {
    try {
        const response = await api.get(`/produits/${id}`);
        setFormData({
            ...response.data,
            photo: null
        });
        // ✅ Si une photo existe, on l'affiche
if (response.data.photo) {
    setPhotoApercu(getImageUrl(response.data.photo));
}
    } catch (error) {
        setErreur('Erreur chargement du produit');
    } finally {
        setChargement(false);
    }
};
    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === 'stock') {
            const num = parseInt(value, 10);
            if (value === '' || isNaN(num)) {
                setFormData({ ...formData, stock: 0 });
            } else if (num < 0) {
                setFormData({ ...formData, stock: 0 });
            } else {
                setFormData({ ...formData, stock: num });
            }
        } else if (name === 'prix') {
            if (value === '' || value === '-') {
                setFormData({ ...formData, prix: '' });
                return;
            }
            const num = parseFloat(value);
            if (isNaN(num)) {
                setFormData({ ...formData, prix: '' });
            } else if (num < 0) {
                setFormData({ ...formData, prix: 0 });
            } else {
                setFormData({ ...formData, prix: num });
            }
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData({ ...formData, photo: file });
            setPhotoApercu(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErreur('');
        setMessage('');

        if (!formData.nom || !formData.prix) {
            setErreur('Nom et prix sont requis');
            return;
        }

        try {
            const formDataToSend = new FormData();
            formDataToSend.append('nom', formData.nom);
            formDataToSend.append('description', formData.description || '');
            formDataToSend.append('prix', formData.prix);
            formDataToSend.append('stock', formData.stock || 0);
            formDataToSend.append('id_categorie', formData.id_categorie || '');
            
            if (formData.photo) {
                formDataToSend.append('photo', formData.photo);
            }

            if (isEdit) {
                await api.put(`/produits/${id}`, formDataToSend, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                setMessage('✅ Produit modifié avec succès !');
            } else {
                await api.post('/produits', formDataToSend, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                setMessage('✅ Produit ajouté avec succès !');
            }

            setTimeout(() => navigate('/admin/produits'), 1500);
        } catch (error) {
            setErreur(error.response?.data?.message || 'Erreur');
        }
    };

    if (chargement) return (
        <div className="container section">
            <div className="loader">⏳ Chargement...</div>
        </div>
    );

    return (
        <div className="container section fade">
            <div className="card">
                <h2 className="section-title">{isEdit ? '✏️ Modifier le produit' : '➕ Ajouter un produit'}</h2>

                {message && <div className="alert alert-success">{message}</div>}
                {erreur && <div className="alert alert-danger">{erreur}</div>}

                <form onSubmit={handleSubmit} className="admin-form" encType="multipart/form-data">
                    <div className="admin-form-grid">
                        <div className="full input-group">
                            <label>Nom *</label>
                            <input
                                type="text"
                                name="nom"
                                value={formData.nom || ''}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="full input-group">
                            <label>Description</label>
                            <textarea
                                name="description"
                                value={formData.description || ''}
                                onChange={handleChange}
                                rows="3"
                            />
                        </div>

                        <div className="input-group">
                            <label>Prix (€) *</label>
                            <input
                                type="number"
                                name="prix"
                                step="0.01"
                                value={formData.prix || ''}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        {/* ✅ STOCK EN TEXT (pas de flèches) */}
                        <div className="input-group">
                            <label>Stock</label>
                            <input
                                type="text"
                                name="stock"
                                value={formData.stock || 0}
                                onChange={handleChange}
                                placeholder="0"
                                inputMode="numeric"
                            />
                        </div>

                        <div className="full input-group">
                            <label>Catégorie</label>
                            <select
                                name="id_categorie"
                                value={formData.id_categorie || ''}
                                onChange={handleChange}
                            >
                                <option value="">Sélectionner une catégorie</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>{c.nom}</option>
                                ))}
                            </select>
                        </div>

                        <div className="full input-group">
                            <label>Photo du produit</label>
                            <div className="upload-container">
                                <div className={`file-upload-wrapper ${formData.photo ? 'has-file' : ''}`}>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        id="photo-upload"
                                    />
                                    <label htmlFor="photo-upload" className="file-upload-label">
                                        <span className="icon">🖼️</span>
                                        <span className="text">
                                            {formData.photo ? 'Image sélectionnée' : 'Cliquez pour choisir une image'}
                                        </span>
                                        <span className="subtext">Glissez ou sélectionnez un fichier</span>
                                        <span className="format">JPG, PNG, GIF, WebP (max 5MB)</span>
                                    </label>
                                </div>

                                {photoApercu && (
                                    <div className="photo-preview">
                                        <img src={photoApercu} alt="Aperçu du produit" />
                                        <span className="file-name">
                                            {formData.photo?.name || 'Image sélectionnée'}
                                        </span>
                                        <span className="file-size">
                                            {formData.photo?.size 
                                                ? `${(formData.photo.size / 1024).toFixed(1)} KB` 
                                                : ''}
                                        </span>
                                        <button 
                                            type="button" 
                                            className="remove-photo"
                                            onClick={() => {
                                                setPhotoApercu(null);
                                                setFormData({ ...formData, photo: null });
                                                document.getElementById('photo-upload').value = '';
                                            }}
                                        >
                                            ❌ Supprimer l'image
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="form-actions" style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
                        <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                            {isEdit ? '💾 Mettre à jour' : '📤 Ajouter'}
                        </button>
                        <Link to="/admin/produits" style={{ flex: 1 }}>
                            <button type="button" className="btn btn-outline w-100">❌ Annuler</button>
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AdminProduitForm;
