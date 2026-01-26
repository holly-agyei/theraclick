# Theraklick

A student mental health platform focused on Africa (starting with Ghana), providing fast, anonymous, layered mental health support.

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

- Copy `env.example` → `.env.local` and fill in values.
- If you leave Firebase keys empty, the app runs in **demo mode** (local-only session + local chat history).
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


