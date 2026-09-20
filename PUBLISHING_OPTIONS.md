# Iraval - Free Publishing Options

Since this is a hobby/social impact project, here are your best free/low-cost publishing options.

---

## Option 1: Progressive Web App (PWA) - ✅ RECOMMENDED

### Cost: **FREE**
### Reach: iOS + Android + Desktop

Your web app is already set up as a PWA! Users can:
- **Install on iOS**: Share → "Add to Home Screen"
- **Install on Android**: Chrome → "Install App"
- **Work offline**: Service worker caches the app
- **Feel native**: Fullscreen, no browser chrome

### Free Hosting Options

#### 1. GitHub Pages (Easiest)
```bash
# Build the app
npm run build

# Deploy to GitHub Pages
# 1. Create a repo: github.com/yourusername/iraval-web
# 2. Push your code
# 3. Go to Settings → Pages → Select main branch
# 4. Your app is live at: https://yourusername.github.io/iraval-web
```

#### 2. Netlify (Recommended)
```bash
# 1. Go to netlify.com → Drag & drop your dist/ folder
# OR
# 1. Connect GitHub repo
# 2. Build command: npm run build
# 3. Publish directory: dist
# 4. Free custom domain available
```

#### 3. Vercel
```bash
# 1. Go to vercel.com
# 2. Import your GitHub repo
# 3. Auto-detects Vite/React
# 4. Instant deployment with free custom domain
```

### PWA Benefits for Your Use Case
- ✅ **No app store approval needed**
- ✅ **Share via URL** — no download required
- ✅ **Automatic updates** — users always see the latest version
- ✅ **Works on all devices** — iOS, Android, Desktop
- ✅ **SEO friendly** — discoverable via search
- ✅ **Zero maintenance cost**

---

## Option 2: Google Play Store (Android Only)

### Cost: **$25 one-time fee**

If you want a native Android experience:

1. Build APK/AAB from Expo
2. Create Google Play Console account
3. Upload and submit for review
4. Approval usually takes 1-3 days

---

## Option 3: Apple App Store (iOS Only)

### Cost: **$99/year**

Unfortunately, Apple does not offer a free tier:
- Requires Apple Developer Program membership
- No exceptions for hobby/non-profit projects
- Review process takes 1-2 weeks

---

## Recommended Strategy for Your Use Case

### Phase 1: Launch PWA (Month 1)
1. Deploy web app to Netlify/Vercel (FREE)
2. Share with your school/community
3. Get feedback from users

### Phase 2: Google Play (Month 2-3)
1. Build Android APK
2. Publish on Google Play ($25)
3. Expand reach to Android users

### Phase 3: Apple App Store (Month 4+)
1. Only if your iOS user base justifies it
2. Apply for Apple Education Discount (sometimes available)

---

## Sample README for Your GitHub Repo

```markdown
# 📚 Iraval - Book Exchange Community

A book exchange platform that connects readers in your community. Share, borrow, and discover books with people near you!

## Features
- 📖 Add your books to the community library
- 🔍 Search for books by title, author, or language
- 📦 Request to borrow books from readers nearby
- 👥 Connect with fellow readers
- 💬 Chat to coordinate exchanges

## Try It Now
No installation needed! Visit: https://iraval.app

## Install as App
- **iOS**: Open in Safari → Share → "Add to Home Screen"
- **Android**: Open in Chrome → Menu → "Install App"

## Built With
- React + TypeScript
- Firebase (Auth, Firestore)
- Vite + PWA

## License
MIT - Free for educational/non-profit use
```

---

## Getting Started

```bash
# 1. Clone the repo
git clone https://github.com/yourusername/iraval.git

# 2. Install dependencies
cd iraval_web_app
npm install

# 3. Configure Firebase
# Create a Firebase project at https://console.firebase.google.com
# Copy your config to src/services/firebase.ts

# 4. Start development server
npm run dev

# 5. Build for production
npm run build

# 6. Deploy to Netlify/Vercel/GitHub Pages
```
