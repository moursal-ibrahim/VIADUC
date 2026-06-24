# Viaduc ERP

Production-ready ERP platform for **recycling and scrap trading** companies. Manage inventory across multiple warehouses, track finances, monitor container exports, and run field operations with role-based dashboards.

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React, Vite, MUI, React Router, Axios, Recharts, Lucide |
| Backend | Node.js, Express, Firebase Admin, JWT |
| Database | Firestore (with in-memory mock for local dev) |
| Auth | Firebase Auth + JWT sessions |

## Project Structure

```
VIADUC/
├── backend/          # Express API
├── frontend/       # React SPA
└── firebase/       # Firestore security rules
```

## Quick Start

### Prerequisites

- Node.js 18+
- npm

### Run everything (recommended)

From the project root `VIADUC/`:

```bash
npm install
npm run install:all
npm run dev
```

This starts **both** the backend (port 5000) and frontend (port 5173) together.

Open **http://localhost:5173**

> Login requires the backend. If you only run the frontend, login will fail with `ECONNREFUSED`.

### Or run separately (2 terminals)

**Terminal 1 — Backend**

```bash
cd backend
npm install
npm run dev
```

API runs at **http://localhost:5000**

> Without Firebase credentials, the API uses an **in-memory mock database** with seeded demo data.

**Terminal 2 — Frontend**

```bash
cd frontend
npm install
npm run dev
```

App runs at **http://localhost:5173**

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@viaduc.com | admin123 |
| Seller | seller@viaduc.com | seller123 |

## Features

### Admin Dashboard
- KPI analytics (revenue, profit, inventory value, exports)
- Charts: stock trends, warehouse performance, revenue, products
- Inventory, warehouses, finance, pricing, containers
- Reports (PDF/Excel export)
- User management, settings, dark/light mode

### Seller Dashboard (mobile-first)
- Quick product entry (warehouse, weight, money)
- Money submission
- Daily summary cards
- Activity history

### Finance Module
- Taaj transfers & bakery collections
- Expenses, salaries, transport costs
- Net profit: `Revenue - Expenses - Salaries - Transport`

### Products
Copper, Aluminium, Brass, Iron, Used Normal Batteries, Used Solar Batteries

### Warehouses
1 main + 2 secondary warehouses with analytics and transfers

## Firebase Setup (Production)

1. Create a Firebase project
2. Enable Authentication (Email/Password)
3. Create Firestore database
4. Download service account JSON → set `FIREBASE_*` in `backend/.env`
5. Deploy rules: `firebase deploy --only firestore:rules`

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/login | Login (email/password or Firebase idToken) |
| GET | /api/analytics/dashboard | Admin KPIs & charts |
| GET | /api/analytics/seller | Seller dashboard data |
| POST | /api/analytics/entries | Seller product entry |
| GET | /api/inventory | Inventory list |
| GET | /api/finance/dashboard | Finance summary |
| GET | /api/reports/export/pdf | PDF export |

## Scripts

```bash
# Backend
npm run dev      # Development with watch
npm run seed     # Seed database manually
npm start        # Production

# Frontend
npm run dev      # Vite dev server
npm run build    # Production build
```

## License

Proprietary — Viaduc ERP © 2026
