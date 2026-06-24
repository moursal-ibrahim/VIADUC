# Deploy Viaduc (Render + Netlify)

## Prerequisites

- Code pushed to GitHub repo **VIADUC** (private)
- Firebase: Firestore + Email/Password auth enabled
- Firebase service account values (from `backend/serviceAccountKey.json` — **never commit this file**)

---

## 1. GitHub

Repo: `https://github.com/YOUR_USERNAME/VIADUC` (private)

---

## 2. Render (backend API)

1. [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint** (uses `render.yaml`)  
   **or** **Web Service** → connect repo → set **Root Directory** to `backend`
2. Settings:

   | Setting | Value |
   |---------|--------|
   | Root Directory | `backend` |
   | Build Command | `npm install` |
   | Start Command | `npm start` |
   | Plan | Free |

3. **Environment variables** (Render → Environment):

   | Key | Value |
   |-----|--------|
   | `NODE_ENV` | `production` |
   | `JWT_SECRET` | Strong random secret (store only in Render) |
   | `CLIENT_URL` | Your Netlify URL, e.g. `https://viaduc.netlify.app` |
   | `FIREBASE_PROJECT_ID` | From service account JSON `project_id` |
   | `FIREBASE_CLIENT_EMAIL` | From service account JSON `client_email` |
   | `FIREBASE_PRIVATE_KEY` | Full private key; paste with `\n` for line breaks |

4. Deploy → copy your API URL, e.g. `https://viaduc-api.onrender.com`

> **Free tier:** API sleeps after ~15 min idle. First request after sleep may take 30–60 seconds.

---

## 3. Netlify (frontend)

1. [Netlify](https://app.netlify.com) → **Add new site** → **Import from Git** → select **VIADUC**
2. Netlify reads `netlify.toml` at repo root (base `frontend`, publish `dist`)
3. **Environment variables** (Site settings → Environment variables):

   | Key | Value |
   |-----|--------|
   | `VITE_API_URL` | `https://YOUR-API.onrender.com/api` |

4. Deploy site → copy URL, e.g. `https://viaduc.netlify.app`

---

## 4. Final wiring

1. Set Render `CLIENT_URL` to your **exact** Netlify URL (with `https://`, no trailing slash)
2. Redeploy Render if needed
3. Trigger **Clear cache and deploy** on Netlify (rebuild picks up `VITE_API_URL`)

---

## 5. Verify

- Open Netlify URL → login with `admin@viaduc.com` / `admin123`
- If login fails: check browser Network tab for API URL and CORS errors
- Test a seller route, e.g. `/seller/dashboard`

---

## Demo credentials (change after go-live)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@viaduc.com | admin123 |
| Seller | seller@viaduc.com | seller123 |

---

## Optional: Firestore rules

From project root (with Firebase CLI):

```bash
firebase deploy --only firestore:rules
```

Rules live in `firebase/`.
