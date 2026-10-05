import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        laravel({
            input: [
                'resources/css/app.css',
                'resources/js/app.js',
                'resources/js/landing.tsx',
                'resources/js/auth-switch.tsx',
                'resources/js/dashboard.tsx',
            ],
            refresh: true,
        }),
        react(),
        tailwindcss(),
    ],
    server: {
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
    },
    build: {
        rollupOptions: {
            output: {
                // Découpage des dépendances lourdes pour optimiser le cache navigateur.
                manualChunks(id) {
                    if (!id.includes('node_modules')) return;
                    if (id.includes('recharts') || id.includes('d3-') || id.includes('victory-vendor')) {
                        return 'charts';
                    }
                    if (id.includes('lucide-react')) return 'icons';
                    if (id.includes('@radix-ui')) return 'radix';
                    if (
                        id.includes('react-dom') ||
                        id.includes('/react/') ||
                        id.includes('/react-is/') ||
                        id.includes('/scheduler/')
                    ) {
                        return 'react';
                    }
                },
            },
        },
    },
});