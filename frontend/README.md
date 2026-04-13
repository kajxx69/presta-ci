# PrestaCI Monorepo

This repository contains two apps:

- `frontend/`: Vite + React (PWA) mobile-first UI
- `backend/`: Node.js + Express + MySQL API

## Getting Started

### Backend
1. Copy `backend/.env.example` to `backend/.env` and set your DB credentials.
2. Create database schema:
   - Import `backend/schema.sql` via MySQL Workbench or CLI.
3. Install and run:
```bash
cd backend
npm install
npm run dev
```
The API will be available at `http://localhost:4000`. Health check: `GET /api/health`.

### Frontend
1. Install and run:
```bash
cd frontend
npm install
npm run dev
```
Vite dev server runs on `http://localhost:5173` by default and proxies `/api` to `http://localhost:4000` (see `frontend/vite.config.ts`), while the runtime chooses the API base dynamically: it uses `http://localhost:4000` when you browse from localhost, `https://quantitative-shortly-happens-transparency.trycloudflare.com` when you hit the tunnel host, and you can override it by setting `VITE_API_BASE` (per mode). 
2. The checked-in `.env.production` already points `VITE_API_BASE` toward `https://quantitative-shortly-happens-transparency.trycloudflare.com`, but to preview a static build against your local API run `VITE_API_BASE=http://localhost:4000 npm run preview`.

## Notes
- Service Worker and PWA manifest live in `frontend/public/`.
- UI will be refactored progressively to call the backend API instead of local mocks.
- Development flow: run backend first, then frontend.

## 🔗 Tunnel Cloudflare (accès distant)

- **Frontend URL** : `https://lawrence-clause-airport-throat.trycloudflare.com`
- **Backend API** : `https://quantitative-shortly-happens-transparency.trycloudflare.com/api`

Le build utilise `.env.production` pour que toutes les requêtes pointent vers le tunnel backend, et le backend doit autoriser le frontend distant via `FRONTEND_ORIGIN` (voir `backend/.env`). Cela permet à vos amis éloignés de charger l'application et d'appeler l'API sans config locale.
