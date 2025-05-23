// Importation des polyfills au tout début
import 'buffer';
// Correction de l'import process qui doit être importé directement
import process from 'process';
import 'stream-browserify';
import 'util';

// Important: les polyfills doivent être définis avant d'importer d'autres modules
// qui pourraient en dépendre
window.global = window;
window.Buffer = window.Buffer || {};
window.process = process;

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ThemeProvider } from './hooks/use-theme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

// Console log pour débugger
console.log('Application initializing...');
console.log('Buffer available:', typeof window.Buffer);
console.log('Process available:', typeof window.process);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
