import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import { bunny } from 'laravel-vite-plugin/fonts';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.jsx'],
            refresh: true,
            fonts: [
                bunny('Instrument Sans', {
                    weights: [400, 500, 600],
                }),
            ],
        }),
        react(),
        tailwindcss(),
    ],
    server: {
        // Necessário para o Vite aceitar conexões de fora do container Docker
        // e para o navegador (no host) conseguir se conectar de volta pro HMR.
        host: '0.0.0.0',
        port: 5173,
        strictPort: true,
        // Sem isso, o navegador bloqueia por CORS o carregamento dos scripts
        // do Vite (localhost:5173) a partir da página servida pelo Laravel
        // (localhost:8000) — são origens diferentes.
        cors: true,
        origin: 'http://localhost:5173',
        watch: {
            ignored: ['**/storage/framework/views/**'],
            usePolling: true,
        },
    },
});
