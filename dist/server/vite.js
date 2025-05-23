import fs from "fs";
import path from "path";
import { createServer } from "vite";
import { resolve } from 'path';
import { createLogger } from './logger.js';
import express from 'express';
// Import du fichier de config Vite en utilisant un chemin relatif direct
// au lieu de faire confiance à la résolution de module qui peut échouer
import viteConfig from "../vite.config.js";
const viteLogger = createLogger();
export function log(message, source = "express") {
    const formattedTime = new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
    });
    console.log(`${formattedTime} [${source}] ${message}`);
}
export async function setupVite(app, server) {
    const serverOptions = {
        middlewareMode: true,
        hmr: { server },
        allowedHosts: ['localhost', '127.0.0.1']
    };
    // En mode développement, on utilise la configuration Vite pour le HMR
    if (process.env.NODE_ENV !== 'production') {
        const vite = await createServer({
            ...viteConfig,
            configFile: false,
            customLogger: {
                ...viteLogger,
                error: (msg, options) => {
                    viteLogger.error(msg, options);
                    process.exit(1);
                },
            },
            server: serverOptions,
            appType: "custom",
        });
        app.use(vite.middlewares);
        app.use("*", async (req, res, next) => {
            const url = req.originalUrl;
            try {
                // Utilisations un chemin absolu pour trouver le template client
                const clientTemplate = path.resolve(process.cwd(), "client", "index.html");
                console.log("Loading client template from (dev):", clientTemplate);
                // Vérifier que le fichier existe
                if (!fs.existsSync(clientTemplate)) {
                    console.error("Client template not found at:", clientTemplate);
                    return next(new Error(`Client template not found at: ${clientTemplate}`));
                }
                // Reload the index.html file and transform it with Vite
                let template = await fs.promises.readFile(clientTemplate, "utf-8");
                const page = await vite.transformIndexHtml(url, template);
                res.status(200).set({ "Content-Type": "text/html" }).end(page);
            }
            catch (e) {
                console.error("Error serving HTML:", e);
                vite.ssrFixStacktrace(e);
                next(e);
            }
        });
    }
    else {
        // En production, on sert directement les fichiers statiques
        serveStatic(app);
    }
}
export function serveStatic(app) {
    const distPath = path.resolve(process.cwd(), "dist", "public");
    if (!fs.existsSync(distPath)) {
        throw new Error(`Could not find the build directory: ${distPath}, make sure to build the client first`);
    }
    console.log("Serving static files from:", distPath);
    // Servir d'abord les assets explicitement pour s'assurer qu'ils sont accessibles
    app.use("/assets", express.static(path.join(distPath, "assets"), {
        maxAge: '1d',
        index: false
    }));
    // Puis servir tous les autres fichiers statiques
    app.use(express.static(distPath, {
        index: false
    }));
    // Toutes les autres routes renvoient vers index.html
    app.use("*", (_req, res) => {
        const indexPath = path.resolve(distPath, "index.html");
        console.log("Serving index.html for route:", _req.originalUrl);
        res.sendFile(indexPath);
    });
}
export async function createViteServer() {
    const vite = await createServer({
        root: resolve(process.cwd(), 'client'),
        server: {
            middlewareMode: true,
            hmr: true,
            watch: {
                usePolling: true
            }
        }
    });
    return vite;
}
