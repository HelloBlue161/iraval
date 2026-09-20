export const meta = {
  name: 'complete-iraval',
  description: 'Review, secure, redesign, and test Iraval web app',
  phases: [
    { title: 'Review: Bugs & Logic', detail: 'Find bugs in services and screens' },
    { title: 'Review: Security', detail: 'Find security vulnerabilities' },
    { title: 'Review: UX & Completeness', detail: 'Find UX issues and missing features' },
    { title: 'Implement: Fixes & Security', detail: 'Apply bug fixes and security' },
    { title: 'Implement: Feature Completion', detail: 'Complete broken features' },
    { title: 'Implement: UI Redesign', detail: 'Book-themed fancy UI' },
    { title: 'Implement: Tests', detail: 'Unit tests with Vitest' },
    { title: 'Verify', detail: 'Build and type-check everything' },
  ],
}

// ── Shared schemas ──
const BUG_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      file: { type: 'string' },
      line: { type: 'integer' },
      severity: { type: 'string', enum: ['critical', 'major', 'minor'] },
      description: { type: 'string' },
      fix: { type: 'string' },
    },
    required: ['file', 'severity', 'description', 'fix'],
  },
}
const SEC_SCHEMA = { type: 'array', items: BUG_SCHEMA.items }
const UX_SCHEMA = { type: 'array', items: BUG_SCHEMA.items }
const SUMMARY_SCHEMA = {
  type: 'object',
  properties: {
    files_created: { type: 'array', items: { type: 'string' } },
    files_modified: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
  },
  required: ['files_created', 'files_modified', 'summary'],
}
const TEST_SCHEMA = {
  type: 'object',
  properties: {
    test_files: { type: 'array', items: { type: 'string' } },
    passed: { type: 'number' },
    failed: { type: 'number' },
    summary: { type: 'string' },
  },
  required: ['test_files', 'passed', 'failed', 'summary'],
}

log('Phase 1: Code Reviews')

const bugsResult = await agent(
  'Review the Iraval web app at /home/palanivelg/palanivelg/iraval_web_app/src for BUGS and LOGIC errors.\nFocus on:\n1. firestoreService.ts - sendMessage creates docs without IDs (setDoc without path ID)\n2. LibraryView.tsx - edit book does not persist to Firestore (handleSaveEdit just updates state)\n3. FriendRequestView.tsx - friends list is hardcoded to []\n4. ChatListView.tsx - friends list loading is a no-op\n5. SearchView.tsx - findUsers is a placeholder\n6. AuthContext.tsx - loginByUsername does not handle errors gracefully\n7. Any other logic bugs, race conditions, or missing error handling\n\nBe thorough. Find every bug.',
  { schema: BUG_SCHEMA, phase: 'Review: Bugs & Logic' }
)

const securityResult = await agent(
  'Review the Iraval web app at /home/palanivelg/palanivelg/iraval_web_app/src for SECURITY vulnerabilities.\nFocus on:\n1. No rate limiting on auth attempts\n2. No password recovery mechanism\n3. Firebase config exposed (client-side, acceptable but note it)\n4. XSS risks in message display\n5. Input validation on all forms\n6. Missing email verification flow\n7. No content moderation for messages\n8. The 5-digit numeric password is extremely weak\n\nRecommend: Add password recovery with verification code sent to email. Use proper passwords.',
  { schema: SEC_SCHEMA, phase: 'Review: Security' }
)

const uxResult = await agent(
  'Review the Iraval web app at /home/palanivelg/palanivelg/iraval_web_app/src for UX/UI improvements and INCOMPLETE FEATURES.\nFocus on:\n1. ChatView has no route in App.tsx (used as modal only)\n2. No book exchange offer/acceptance workflow\n3. UI is generic - needs book-themed redesign\n4. No book cover images in some views\n5. Empty states need better copy and icons\n6. No loading skeletons\n7. Navbar tabs use state instead of router for navigation consistency\n8. No nearby books or radius-based filtering\n9. Add book modal should search Google Books directly\n10. Edit book does not save to Firestore',
  { schema: UX_SCHEMA, phase: 'Review: UX & Completeness' }
)

log('Reviews complete: ' + JSON.stringify({ bugs: bugsResult?.length, security: securityResult?.length, ux: uxResult?.length }))

log('Phase 2: Implementing security features and password recovery.')

const securityFixes = await agent(
  'IMPLEMENT security and password recovery features for the Iraval web app.\n\nWorking directory: /home/palanivelg/palanivelg/iraval_web_app\n\nDO THE FOLLOWING:\n\n1. Create src/lib/recoveryUtils.ts:\n   - generateRecoveryCode(): returns 6-digit random code string\n   - validateCodeFormat(code): checks 6 digits\n   - isCodeExpired(timestamp_ms): true if > 10 minutes old\n\n2. Create src/lib/passwordUtils.ts:\n   - calculatePasswordStrength(password): returns { score: 0-4, label: string, color: string }\n   - isValidPassword(password): minimum 6 chars, at least 1 letter and 1 number\n\n3. Create src/services/passwordRecovery.ts with:\n   - sendRecoveryCode(email, newPassword): generates 6-digit code, stores in Firestore recoveryCodes/{emailHash} with timestamp and hashed code, expires after 10 min\n   - verifyRecoveryCode(email, code): verifies code matches and not expired, returns true/false\n   - resetPassword(email, newPassword): uses Firebase auth to reset password after successful code verification\n   - recordFailedAttempt(emailHash): tracks failed attempts (max 5 per 10 min)\n\n4. Create src/screens/PasswordRecoveryView.tsx with multi-step wizard:\n   - Step 1: Enter email\n   - Step 2: Enter 6-digit code with countdown timer (10 min)\n   - Step 3: New password with strength meter\n   - Step 4: Success screen\n\n5. Update src/screens/LoginView.tsx:\n   - Add "Forgot Password?" link below form, links to /forgot-password\n\n6. Update src/screens/SignupView.tsx:\n   - Change from 5-digit numeric password to proper password (min 6 chars)\n   - Add password strength meter in signup form\n   - Show strength label: Weak / Fair / Good / Strong\n\n7. Update src/contexts/AuthContext.tsx:\n   - Export resetPassword and recovery functions\n\n8. Update src/types/index.ts to include new types\n\n9. Update App.tsx to add /forgot-password route\n\nFollow existing code style. Use Firebase. TypeScript. Match patterns.\n\nReturn summary of files created and modified.',
  { schema: SUMMARY_SCHEMA, phase: 'Implement: Fixes & Security' }
)

log('Phase 2 complete. Phase 3: Bug fixes and feature completion.')

const fixResult = await agent(
  'FIX bugs and complete incomplete features in the Iraval web app.\n\nWorking directory: /home/palanivelg/palanivelg/iraval_web_app\n\nCRITICAL BUGS TO FIX:\n\n1. FIX firestoreService.ts sendMessage(): Change setDoc(doc(db, "chats", chatId, "messages"), message) to setDoc(doc(db, "chats", chatId, "messages", "msg_" + Date.now()), message)\n\n2. FIX LibraryView.tsx handleSaveEdit(): Add updateBook() to firestoreService.ts and wire it up\n\n3. FIX FriendRequestView.tsx: Load real friends by querying friendRequests with status "accepted"\n\n4. FIX ChatListView.tsx: Load friends with accepted requests and show conversations\n\n5. FIX SearchView.tsx findUsers(): Query Firestore for users who have the selected book. Maintain a simple index.\n\nNEW FEATURES TO ADD:\n\n6. Add book exchange workflow:\n   - src/types/index.ts: Add Exchange interface and ExchangeStatus type\n   - src/services/firestoreService.ts: addExchange, onUserExchanges, acceptExchange, declineExchange\n   - src/screens/ExchangeRequestView.tsx: Request book exchange when viewing a user\n   - src/screens/MyExchangesView.tsx: List your exchange requests with accept/decline\n\n7. Create toast notification system:\n   - src/components/Toast.tsx: Styled toast component with auto-dismiss\n   - src/contexts/ToastContext.tsx: createContext + provideToast + useToast\n   - Replace all alert() calls with toast notifications\n\n8. Create reusable components:\n   - src/components/BookCard.tsx: Book card with cover, title, author, hover effect\n   - src/components/BookShelf.tsx: Shelf container for library\n   - src/components/LoadingSkeleton.tsx: Skeleton loaders\n\n9. Update src/components/Navbar.tsx to include new tabs\n\n10. Update App.tsx with new routes\n\nFollow existing patterns. TypeScript. Firebase.\nReturn summary.',
  { schema: SUMMARY_SCHEMA, phase: 'Implement: Feature Completion' }
)

log('Phase 3 complete. Phase 4: Book-themed UI Redesign.')

const uiResult = await agent(
  'REDESIGN the Iraval web app UI with a beautiful book-themed visual identity.\n\nWorking directory: /home/palanivelg/palanivelg/iraval_web_app\n\nTHEME: Warm cozy library. Leather-bound books, parchment, ink. Earth tones: deep browns, warm golds, forest greens, cream backgrounds. Elegant typography.\n\nDO THE FOLLOWING:\n\n1. Update index.html to import Google Fonts: Playfair Display (headings) + Inter (body)\n\n2. Redesign src/index.css:\n   - Import Google Fonts\n   - Define book-themed color palette\n   - Custom animations (page turn, book float)\n   - Book-themed card styles\n\n3. Redesign ALL screen components with book theme:\n   - LoginView: Parchment card, animated book illustration, warm gradients\n   - SignupView: Same theme, page-turn animation\n   - LibraryView: Bookshelf-style grid with spine effects\n   - SearchView: Library card catalog aesthetic\n   - FriendRequestView: Book club members style\n   - ChatListView: Bookmark-style chat list\n   - ChatView: Letter/marginalia style messages\n   - UserProfileView: Reading profile aesthetic\n   - SettingsView: Library card style\n   - TermsView: Manuscript/parchment style\n   - PasswordRecoveryView: Wax seal / secret scroll aesthetic\n   - ExchangeRequestView, MyExchangesView: Letter exchange style\n\n4. Redesign Navbar.tsx:\n   - Sidebar styled like bookshelf\n   - Active tab like a bookmark\n\n5. Redesign existing components (BookCard, Toast, LoadingSkeleton) with theme\n\n6. Update public/favicon.svg to a book icon\n\n7. Add ambient book-themed decorative elements throughout\n\nMake it genuinely beautiful and polished. Apple-level polish with a bookish soul.\nReturn summary.',
  { schema: SUMMARY_SCHEMA, phase: 'Implement: UI Redesign' }
)

log('Phase 4 complete. Phase 5: Unit tests.')

const testResult = await agent(
  'SET UP unit testing and write comprehensive tests for the Iraval web app.\n\nWorking directory: /home/palanivelg/palanivelg/iraval_web_app\n\n1. Install test dependencies:\n   npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom\n\n2. Create vitest.config.ts:\n   import { defineConfig } from "vitest/config"\n   import react from "@vitejs/plugin-react"\n   export default defineConfig({\n     plugins: [react()],\n     test: { globals: true, environment: "jsdom", setupFiles: "./src/test/setup.ts" },\n   })\n\n3. Create src/test/setup.ts: import "@testing-library/jest-dom"\n\n4. Write tests:\n   a. src/test/utils.test.ts: getChatId ordering, ZIP_CITY_MAP, password strength, recovery code gen\n   b. src/test/components/LoginView.test.tsx: renders fields, validates password, error messages, forgot password link\n   c. src/test/components/SignupView.test.tsx: validation, password match, age check, zip city\n   d. src/test/components/BookCard.test.tsx: renders title/author, cover image\n   e. src/test/components/Navbar.test.tsx: shows tabs, active styling, logout\n   f. src/test/components/PasswordRecoveryView.test.tsx: multi-step flow, code verification\n\n5. Run: npm run test:run\n6. Fix any failures until all tests pass\n\nReport results.",
  { schema: TEST_SCHEMA, phase: 'Implement: Tests' }
)

log('Phase 5 complete. Phase 6: Verification.')

await agent('Run `npx tsc --noEmit` and `npx vite build`. Report success or any errors.', { phase: 'Verify', label: 'Type check and build' })

log('Workflow complete!')
