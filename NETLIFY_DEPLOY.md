# Netlify Deployment Guide

## Prerequisites
1. Netlify account
2. Supabase project
3. Firebase project (for FCM)
4. Cloudinary account (for image uploads)
5. Google AI Studio API key (for Gemini)

## Setup Steps

### 1. Connect Repository
- Go to Netlify Dashboard > "Add new site" > "Import an existing project"
- Connect your Git provider and select this repository
- Build settings will be auto-detected from `netlify.toml`

### 2. Configure Environment Variables
Go to Site Settings > Environment Variables and add all variables from `.env.example`:

**Required for Core Functionality:**
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (client-side)

**Required for Push Notifications:**
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
- `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_VAPID_KEY`

**Required for Memory Uploads:**
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

**Required for AI Content Generation:**
- `GEMINI_API_KEY`

### 3. Configure Supabase Auth
In Supabase Dashboard > Authentication > URL Configuration:
- Site URL: `https://your-site.netlify.app`
- Redirect URLs: `https://your-site.netlify.app/auth/callback`

### 4. Configure Firebase
In Firebase Console > Project Settings > General:
- Add web app if not exists
- Copy config values to Netlify env vars
- In Cloud Messaging > Web configuration > Generate key pair for VAPID key

### 5. Configure Cloudinary
- Create upload preset (optional, but recommended)
- Set upload to "Authenticated" for private images

### 6. Deploy
- Push to main branch
- Netlify will auto-deploy
- Check Functions logs for scheduled notifications (runs daily at 06:00 UTC)

## Local Development
```bash
# Install dependencies
pnpm install

# Start dev server (client + server on port 8080)
pnpm dev

# Build for production
pnpm build

# Test production build locally
pnpm start
```

## Scheduled Notifications
The `send-due-notifications` function runs daily at 06:00 UTC via Netlify Scheduled Functions.
- Check Function logs in Netlify Dashboard > Functions > send-due-notifications
- Processes due personal messages and sends FCM push notifications

## API Routes
All API routes are available under `/.netlify/functions/api/*` and proxied via `/api/*`:
- `/api/memories` - Memory CRUD
- `/api/quote-cards` - Quote card CRUD
- `/api/daily-content` - Daily content CRUD
- `/api/ai/draft` - AI content generation (Sprint 1)

## Troubleshooting
- **Functions timeout**: Netlify Functions have 26s limit (Pro). Optimize long-running tasks.
- **CORS errors**: Check `netlify.toml` redirects and Supabase CORS settings.
- **FCM not working**: Verify VAPID key, Firebase config, and service worker registration.
- **Images not uploading**: Check Cloudinary credentials and CORS settings.