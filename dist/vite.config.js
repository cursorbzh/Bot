import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
// Utilisation de __dirname ou process.cwd() est plus sûr que import.meta.dirname
const rootDir = process.cwd();
export default defineConfig({
    plugins: [
        react(),
        runtimeErrorOverlay(),
        ...(process.env.NODE_ENV !== "production" &&
            process.env.REPL_ID !== undefined
            ? [
                await import("@replit/vite-plugin-cartographer").then((m) => m.cartographer()),
            ]
            : []),
    ],
    resolve: {
        alias: [
            {
                find: '@',
                replacement: path.resolve(rootDir, "client", "src")
            },
            {
                find: '@shared',
                replacement: path.resolve(rootDir, "shared")
            },
            {
                find: '@assets',
                replacement: path.resolve(rootDir, "attached_assets")
            },
            // Ajout des alias pour les modules Node.js utilisés dans le navigateur
            {
                find: 'buffer',
                replacement: 'buffer/'
            },
            {
                find: 'process',
                replacement: 'process/browser'
            },
            {
                find: 'stream',
                replacement: 'stream-browserify'
            },
            {
                find: 'util',
                replacement: 'util/'
            }
        ],
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json']
    },
    root: path.resolve(rootDir, "client"),
    build: {
        outDir: path.resolve(rootDir, "dist/public"),
        emptyOutDir: true,
        commonjsOptions: {
            transformMixedEsModules: true,
        },
        rollupOptions: {
            // Ne pas externaliser ces modules, ils doivent être inclus dans le bundle
            external: [],
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom'],
                    solana: ['@solana/web3.js'],
                }
            }
        }
    },
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:3001',
                changeOrigin: true,
                ws: true
            }
        },
    },
    define: {
        // Fournir des polyfills pour les variables globales de Node.js
        'process.env': {},
        'global': 'window',
        'Buffer.isBuffer': 'false',
        '__dirname': '""',
        '__filename': '""'
    },
    optimizeDeps: {
        esbuildOptions: {
            define: {
                global: 'globalThis',
            },
        },
        include: [
            'buffer',
            'process',
            'stream-browserify',
            'util',
            '@solana/web3.js',
            'bn.js',
        ],
    },
});
