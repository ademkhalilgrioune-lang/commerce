import axios from 'axios';

// ==========================================
// 1. CRÉER UNE INSTANCE AXIOS
// ==========================================
const api = axios.create({
    baseURL: 'http://192.168.100.6:5001/api',  // ← URL du backend
    /*    baseURL: 'http://192.168.100.6:5001/api',  // ← URL du backend*/
    headers: {
        'Content-Type': 'application/json'
    }
});

// ==========================================
// 2. INTERCEPTEUR : AJOUTER LE TOKEN AUTOMATIQUEMENT
// ==========================================
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ==========================================
// 3. EXPORTER L'INSTANCE
// ==========================================
export default api;
