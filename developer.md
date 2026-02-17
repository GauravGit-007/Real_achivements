# Developer Handbook & Technical Context

This guide is designed for developers or AI agents to quickly understand the architecture, technical history, and operational workflows of the Elite Dashboard.

## 1. Project Architecture (Monorepo)
- **Frontend (`/client`)**: React, Vite, TypeScript.
- **Backend (`/server`)**: Node.js, Express, Mongoose.
- **Database**: MongoDB Atlas (Cloud).
- **Tooling**: `concurrently` for local development.

## 2. Technical Milestones & Core Logic

### Database Migration (SQLite -> MongoDB)
- **Schema**: Defined in `server/models/`.
- **Legacy Compatibility**: `ObjectIds` are transformed to strings and mapped to the `id` field using `toJSON` transforms to prevent breaking the frontend.
- **Auto-Seeding**: The server automatically populates default goals on first startup if the collection is empty.

### Security & Infrastructure
- **Environment Variables**: Credentials are never hardcoded. 
    - *Local*: Stored in `server/.env`.
    - *Production*: Stored in Render/Vercel Secret settings.
- **Git Hygiene**: Root and server-level `.gitignore` files prevent leaking sensitive data or large `node_modules` folders.

### Deployment Configuration
- **Backend (Render)**:
    - **Root Directory**: `server`
    - **Build Command**: `npm install`
    - **Start Command**: `node index.js`
- **Frontend (Vercel)**:
    - **Root Directory**: `client`
    - **API Integration**: Uses `VITE_API_URL` to point to the Render backend.

## 3. Operations & Maintenance

### Keep-Alive Strategy (Preventing Render Sleep)
Render's free tier spins down after 15 minutes of inactivity.
- **Endpoint**: `GET /api/health` returns `{ "status": "ok" }`.
- **Implementation**: A cron job at [cron-job.org](https://cron-job.org) pings the health endpoint every 10 minutes to maintain 24/7 availability.

### Git Flow
- **`dev` branch**: Active development and preview testing.
- **`main` branch**: Production-ready code (Pushing here triggers live deployments).

## 4. Troubleshooting Quick-Links
- **Auth Errors**: Ensure Atlas user `Gaurav` is used (case-sensitive).
- **Connection Timed Out**: Verify `0.0.0.0/0` is whitelisted in Atlas Network Access.
- **Build Failures**: Check for explicit `.tsx` extensions in imports (not allowed).

---
*Maintained by Antigravity AI*
