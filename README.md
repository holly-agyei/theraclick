# Theraklick

A student mental health platform focused on Africa (starting with Ghana), providing fast, anonymous, layered mental health support.

## ⚠️ Quick Setup

**First time setup?** You need to configure Firebase:

1. Clone the repo: `git clone <your-repo-url>`
2. Install dependencies: `npm install`
3. Copy environment file: `cp env.example .env.local`
4. **Follow the complete setup guide:** See [`LLM_SETUP_GUIDE.md`](./LLM_SETUP_GUIDE.md) for detailed step-by-step instructions with all keys and configuration needed
5. Run: `npm run dev`

**Without Firebase config, the app runs in demo mode** (limited functionality).

> 💡 **For LLM-assisted setup:** Share [`LLM_SETUP_GUIDE.md`](./LLM_SETUP_GUIDE.md) with your LLM - it contains everything needed!

## Tech Stack

- **Next.js 16** (App Router)
- **React 19**
- **TypeScript**
- **Tailwind CSS**
- **Firebase** (Auth + Firestore - to be configured)
- **Lucide React** (Icons)

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:

**Step 1:** Copy `env.example` to `.env.local`:
```bash
cp env.example .env.local
```

**Step 2:** Get Firebase credentials:
- Go to [Firebase Console](https://console.firebase.google.com/)
- Create a new project (or select existing one)
- Go to Project Settings (gear icon) → General tab
- Scroll down to "Your apps" → Click the Web icon (`</>`) to add a web app
- Copy the Firebase config values into `.env.local`:
  ```
  NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
  NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
  NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
  ```

**Step 3:** Enable Firebase services:
- **Authentication**: Go to Authentication → Sign-in method → Enable Email/Password
- **Firestore**: Go to Firestore Database → Create database → Start in test mode (then update rules)
- **Storage**: Go to Storage → Get started → Start in test mode (then update rules)

**Step 4:** Install Firebase CLI (if not already installed):
```bash
npm install -g firebase-tools
firebase login
firebase init
# Select: Firestore, Storage
# Use existing project (select your Firebase project)
```

**Step 5:** Deploy Firestore rules:
```bash
firebase deploy --only firestore:rules
```

**Step 6:** Deploy Storage rules:
```bash
firebase deploy --only storage
```

**Note:** If you don't deploy the rules, you'll get permission errors. The rules files are already in the repo (`firestore.rules` and `storage.rules`).

**Note:** If you leave Firebase keys empty, the app runs in **demo mode** (local-only session + local chat history).

**Optional:**
- AI uses **Gemini** if `GEMINI_API_KEY` is set; otherwise falls back to OpenAI-compatible; otherwise uses **safe demo responses**.
- For admin approvals, also set `ADMIN_API_KEY` + Firebase Admin service account env vars (see below).

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/
│   ├── page.tsx                    # Welcome/landing page
│   ├── role-selection/             # Role selection screen
│   ├── anonymous-setup/            # Anonymous name setup
│   └── student/
│       ├── dashboard/              # Student home dashboard
│       ├── chat/                   # AI chat interface
│       ├── forums/                 # Community forums
│       └── booking/                # Counselor booking
├── components/
│   ├── ui/                         # Reusable UI components
│   ├── BottomNav.tsx               # Mobile bottom navigation
│   └── Logo.tsx                    # Theraklick logo component
└── lib/
    └── utils.ts                    # Utility functions
```

## Features (MVP)

- ✅ Welcome/landing screen
- ✅ Role selection (Student, Peer Mentor, Counselor)
- ✅ Anonymous-first setup (identity optional)
- ✅ Student dashboard
- ✅ AI chat (Next.js API route + safe fallback)
- ✅ Chat history persistence (Firestore when configured; local fallback in demo mode)
- ✅ Forums UI (static data)
- ✅ Booking UI (static data)
- ✅ Mobile-first responsive design
- ✅ Bottom navigation for mobile

## Next Steps

- Wire forums + bookings to Firestore
- Expand role dashboards (peer mentor inbox/office hours; counselor availability/notes)
- Add moderation + reporting flows for safety
- Add PWA support for mobile app wrapping

## Design Principles

- **Anonymity first**: Students can use the app without real names
- **Text-first interaction**: Chat is the default mode
- **Layered support**: AI Chat → Peer Support → Counselor → Emergency
- **Low cognitive load**: Calming UI with few choices
- **Trust over features**: Clear privacy language, no dark patterns

## Firestore Rules

There’s a starter rules file at `firestore.rules` that locks all user data to `request.auth.uid`.

## Admin Approvals

Peer Mentors and Counselors are created with `status=pending` and must be approved.

- **Admin UI**: visit `/admin` and paste your `ADMIN_API_KEY`.
- **API**:
  - `GET /api/admin/pending`
  - `POST /api/admin/users/:uid/approve`
  - `POST /api/admin/users/:uid/reject`
  - Provide header `x-admin-key: <ADMIN_API_KEY>`

### Required server env vars

Set these in `.env.local` (or your deployment environment):

- `ADMIN_API_KEY`
- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY` (replace newlines with `\n`)


