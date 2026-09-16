import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        open: true
    },
    build: {
        // Pas de sourcemaps en production : évite de doubler le poids du bundle livré
        sourcemap: false,
        // Sépare les grosses libs tierces (react, stripe) du code applicatif
        // -> meilleur cache navigateur (le vendor bundle ne change pas à chaque déploiement)
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom', 'react-router-dom'],
                    stripe: ['@stripe/react-stripe-js', '@stripe/stripe-js']
                }
            }
        },
        // Alerte si un chunk dépasse 700kb au lieu de 500kb par défaut (Stripe est lourd)
        chunkSizeWarningLimit: 700
    }
});
