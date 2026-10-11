# TakeMyOrder API

Express 5 + MongoDB backend for the TakeMyOrder app. The React frontend lives in `../flavor-faves-app-main`.

## Local development

```sh
npm install
cp .env.example .env   # fill in Mongo, Google OAuth and JWT values
npm run dev
```

The API is served under `/api/v1`. Google sign-in starts at `/auth/google`. `/health` returns 200 for uptime checks.

## Configuration

| Variable | Required | Purpose |
| --- | --- | --- |
| `NODE_ENV` | prod | Set to `production` on the host. Disables localhost CORS origins and hides error details. |
| `PORT` | no | Port to listen on. Most hosts inject this. |
| `MONGO_URI` | yes | MongoDB connection string. Required in production. |
| `FRONTEND_BASE_URL` | yes | Deployed frontend origin. Used for CORS, post-login redirect and QR code links. |
| `CORS_ORIGINS` | no | Comma-separated extra allowed origins. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | yes | Google OAuth client. |
| `CALLBACK_URL` | yes | `https://<api-host>/auth/google/callback`, also added to the Google client. |
| `JWT_SECRET` | yes | Long random secret for signing session cookies. |
| `ADMIN_SIGNUP_CODE` | no | When set, admin signup needs this invite code. |

## Deploy on Vercel

The repo is set up for Vercel out of the box: `api/index.js` exports the Express app as a serverless function and `vercel.json` rewrites every path to it. Files under `public/` are served by Vercel's CDN directly.

1. Import the GitHub repo in Vercel and pick the `production` branch. Leave Framework Preset as **Other**, Build Command empty, Install Command `npm install`.
2. Add the environment variables from the table above. Use `NODE_ENV=production`, your MongoDB Atlas URI, and `CALLBACK_URL=https://<project>.vercel.app/auth/google/callback`.
3. Deploy, then open `https://<project>.vercel.app/health` to confirm it responds.
4. In the Google Cloud Console, add the callback URL to Authorized redirect URIs.
5. Point the frontend's `VITE_NODE_SERVER_APP_BASE_URL` at `https://<project>.vercel.app/api/v1`, and set the backend's `FRONTEND_BASE_URL` to the deployed frontend origin.

MongoDB Atlas: allow access from anywhere (`0.0.0.0/0`) in Network Access, since Vercel functions have no fixed IP.

Cookies are set with `SameSite=None; Secure`, so both the API and the frontend must be served over HTTPS in production.

### Other hosts (Render, Railway, Fly)

Start command `npm start` runs `src/server.js`, a normal long-running server. Node 20 or newer.

### Uploaded images

Product images are stored in MongoDB (the `images` collection) and served from `/images/<filename>`, so they persist on hosts with a read-only or ephemeral filesystem. Uploads are capped at 4 MB because Vercel rejects larger request bodies.

### Local tunnel for testing Google OAuth

```
ngrok http 3000
```
