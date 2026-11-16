import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        proxy: {
            // Dev server proxies API calls to the sheets backend (PORT in .env).
            '/api': 'http://localhost:3001',
        },
    },
    build: {
        outDir: 'dist',
    },
});
