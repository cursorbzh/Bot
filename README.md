# CryptoArbitrageSniffer

Une plateforme avancée de détection et d'automatisation d'opportunités d'arbitrage sur la blockchain Solana.

## 🚀 Fonctionnalités

- **Détection d'Arbitrage en Temps Réel**
  - Surveillance multi-DEX (Jupiter, Raydium, Orca)
  - Calcul automatique des spreads et opportunités
  - Exécution automatique des trades (optionnel)

- **Token Sniper**
  - Détection de nouveaux tokens
  - Paramètres de liquidité et slippage configurables
  - Achat automatique (optionnel)

- **Copy Trading**
  - Suivi de wallets spécifiques
  - Filtrage par types de transactions
  - Réplication automatique des trades

- **Auto Trading**
  - Stratégies de trading configurables
  - Gestion des positions (stop-loss, take-profit)
  - Support multi-paires

- **Monitoring & Notifications**
  - Tableau de bord en temps réel
  - Notifications Telegram
  - Logs d'activité détaillés

## 🛠️ Technologies

- **Backend**
  - Node.js avec Express
  - WebSocket pour le temps réel
  - Drizzle ORM pour la base de données
  - Intégration multi-API (Jupiter, CoinGecko, CoinMarketCap, etc.)

- **Frontend**
  - React avec TypeScript
  - Tailwind CSS pour le style
  - Wouter pour le routing
  - WebSocket pour la synchronisation temps réel

## 📋 Prérequis

- Node.js (v18 ou supérieur)
- PostgreSQL
- Clés API pour les services externes :
  - Jupiter
  - CoinGecko
  - CoinMarketCap
  - QuickNode
  - Helius

## 🔧 Installation

1. Cloner le repository :
```bash
git clone https://github.com/votre-username/CryptoArbitrageSniffer.git
cd CryptoArbitrageSniffer
```

2. Installer les dépendances :
```bash
npm install
```

3. Configurer les variables d'environnement :
```bash
cp .env.example .env
```
Remplir le fichier `.env` avec vos clés API et configurations.

4. Initialiser la base de données :
```bash
npm run db:push
```

## 🚀 Lancement

1. Démarrer le serveur de développement :
```bash
npm run dev
```

2. Accéder à l'application :
- Frontend : http://localhost:5000
- API : http://localhost:5000/api

## 📊 Structure du Projet

```
CryptoArbitrageSniffer/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/    # Composants UI
│   │   ├── pages/        # Pages principales
│   │   ├── hooks/        # Hooks personnalisés
│   │   └── lib/          # Utilitaires
├── server/                # Backend Express
│   ├── api/              # Routes API
│   ├── services/         # Services métier
│   └── types/            # Types TypeScript
└── shared/               # Code partagé
    └── schema.ts         # Schémas de données
```

## 🔐 Sécurité

- Ne jamais exposer vos clés API privées
- Utiliser des variables d'environnement pour les secrets
- Configurer correctement les permissions de la base de données

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :
1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push sur la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📝 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## ⚠️ Avertissement

Ce logiciel est fourni à des fins éducatives uniquement. L'utilisation de ce logiciel pour le trading de crypto-monnaies comporte des risques. L'utilisateur assume l'entière responsabilité de ses actions. 