# Deployment Guide

## Web Deployment

### Backend (Railway/Render/Heroku)
1. Push code to GitHub.
2. Connect repository to hosting provider.
3. Set environment variables (`MONGODB_URI`, `JWT_SECRET`).
4. Deploy.

### Frontend (Vercel/Netlify)
1. Push code to GitHub.
2. Connect repository to hosting provider.
3. Set build command: `npm run build`.
4. Set output directory: `dist`.
5. Set environment variable `VITE_API_URL` to your deployed backend URL.
6. Deploy.

## Android Deployment
See `build-android.ps1` (to be created) for automated build steps.
