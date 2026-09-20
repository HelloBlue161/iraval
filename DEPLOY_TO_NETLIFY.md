# Deploy Iraval PWA to Netlify - 5 Minute Guide

## Step 1: Push Code to GitHub

```bash
# If you haven't already
cd /home/palanivelg/palanivelg/iraval_web_app
git add .
git commit -m "Prepare for Netlify deployment"
git push origin main
```

## Step 2: Create Netlify Account

1. Go to https://www.netlify.com
2. Click "Sign up"
3. Sign up with GitHub (recommended)

## Step 3: Connect Your Repository

1. Click "Add new site" → "Import an existing project"
2. Connect your GitHub account
3. Select your `iraval_web_app` repository
4. Build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. Click "Deploy site"

## Step 4: Done!

Netlify will automatically:
- Build your app
- Deploy it
- Give you a URL like: `https://iraval-xxx.netlify.app`

## Step 5: Configure Custom Domain (Optional)

1. Go to Site settings → Domain management
2. Click "Add custom domain"
3. Enter your domain (e.g., `iraval.app`)
4. Follow Netlify's DNS instructions

## Step 6: Share Your App!

Tell users:
1. Open `https://your-app.netlify.app`
2. Tap **Share** → **Add to Home Screen**
3. It appears like a native app!

---

## Environment Variables (Firebase Config)

Your Firebase config is already in the code:
```typescript
// src/services/firebase.ts
const firebaseConfig = {
  apiKey: 'AIzaSyDsXJbZ7ksX9UWHpLIU7RBLfGOjsSYb2EA',
  projectId: 'iraval-7733e',
  // ... etc
};
```

No additional environment variables needed for now.

---

## Verify Deployment

After deploying, test:
1. Open your Netlify URL
2. Login with test user: `alice_test@iraval.app` / `Test#12345!`
3. Test all features
4. Add to home screen on your phone
5. Verify it opens fullscreen

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Build fails | Check console for errors |
| Firebase not connecting | Verify API key in firebase.ts |
| Pages not loading | Netlify redirects should handle this |
| PWA not installing | Make sure HTTPS is enabled (Netlify does this by default) |
