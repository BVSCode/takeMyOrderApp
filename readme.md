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

## Deploy (Render / Railway / Fly)

- Root directory: this folder
- Build command: `npm install`
- Start command: `npm start`
- Node: 20 or newer
- Set every variable from the table above. `FRONTEND_BASE_URL` must be the real frontend URL with no trailing slash.

After the first deploy:

1. Add `CALLBACK_URL` to the Google OAuth client's Authorized redirect URIs.
2. Point the frontend's `VITE_NODE_SERVER_APP_BASE_URL` at `https://<api-host>/api/v1`.

Cookies are set with `SameSite=None; Secure`, so both the API and the frontend must be served over HTTPS in production.

### Uploaded images

Product images are written to `public/images` on the server's disk. On hosts with an ephemeral filesystem (Render free tier, most containers) uploads disappear on redeploy. Attach a persistent disk or move uploads to object storage (Cloudinary, S3) before relying on this in production.

### Local tunnel for testing Google OAuth

```
ngrok http 3000
```
