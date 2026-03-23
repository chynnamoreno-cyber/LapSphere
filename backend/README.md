# Backend – Setup Guide

Express.js REST API for the PeakPlay e-commerce app.

## Quick Start

```bash
npm install
cp .env.example .env   # then fill in values (see below)
npm start
```

## Required Environment Variables

Create a `.env` file in this folder (never commit it). Use `.env.example` as a template.

| Key | Required | Description |
|---|---|---|
| `CONNECTION_STRING` | YES | MongoDB Atlas connection URI |
| `JWT_SECRET` | YES | Any long random secret string for signing JWTs |
| `FCM_SERVICE_ACCOUNT_PATH` | For push notifications | Filename of Firebase Admin SDK service account JSON (place the file in this folder) |
| `PORT` | No (default: 4000) | Port the server listens on |
| `DB_NAME` | No (default: ITCP_database) | MongoDB database name |
| `JWT_EXPIRES_IN` | No (default: 7d) | Token expiry |
| `CORS_ORIGIN` | No (default: *) | Allowed CORS origins |

## API Endpoints

Base path: `/api/v1`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/health` | No | Health check |
| POST | `/users/register` | No | Register new user |
| POST | `/users/login` | No | Login, returns JWT |
| GET | `/users/:id` | JWT | Get user profile |
| PUT | `/users/profile` | JWT | Update delivery address + profile |
| POST | `/users/push-token` | JWT | Register push token |
| GET | `/products` | No | List all products |
| GET | `/products/:id` | No | Single product |
| POST | `/products` | Admin JWT | Create product |
| PUT | `/products/:id` | Admin JWT | Update product |
| DELETE | `/products/:id` | Admin JWT | Delete product |
| GET | `/categories` | No | List all categories |
| POST | `/categories` | Admin JWT | Create category |
| GET | `/orders` | JWT | List orders (user sees own; admin sees all) |
| POST | `/orders` | JWT | Place order (requires complete delivery profile) |
| PUT | `/orders/:id` | Admin JWT | Update order status |
| GET | `/stock-alerts` | Admin JWT | List low-stock alerts |

## Files NOT in Git (exclude these)

- `.env` — your secrets
- `*firebase-adminsdk*.json` / `firebase-service-account*.json` — Firebase private key
- `uploads/` — runtime image uploads
- `node_modules/`

## Deploy on Render (Recommended)

1. Push this repository to GitHub.
2. In Render, create a new `Web Service` from the repo.
3. Set `Root Directory` to `backend`.
4. Build command: `npm install`
5. Start command: `npm start`
6. Add all env vars from `.env.example`.
7. For Firebase Admin credentials in cloud, prefer `FCM_SERVICE_ACCOUNT_JSON` with full JSON content from your Firebase service account key.
8. Keep `PUSH_NOTIFY_ALL_USERS=true` if you want global push fanout.
9. For persistent product/review images across deploys, set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`.

You can also use the included `render.yaml` blueprint.

## Deploy on Vercel (Alternative)

Vercel config files are included:

- `vercel.json`
- `api/index.js`

Steps:

1. Import the repository into Vercel.
2. Set project root to `backend`.
3. Add env vars from `.env.example` in Vercel settings.
4. Use `FCM_SERVICE_ACCOUNT_JSON` for Firebase Admin credentials.
5. Deploy and test `GET /api/v1/health`.
