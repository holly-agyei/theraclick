# Theraklick — Product & Engineering Context

## What We Are Building
Theraklick is a student mental health platform focused on Africa (starting with Ghana).  
Its goal is to give students **fast, anonymous, layered mental health support** — especially when traditional counseling is unavailable, stigmatized, or slow.

We are replacing:
“suffering alone at 3am”  
with  
“support in your pocket, instantly.”

The product must feel:
- Safe
- Calm
- Anonymous
- Non-clinical
- Student-first

This is NOT a hospital system. It is a **support system**.

---

## Core Principles (DO NOT VIOLATE)
1. **Anonymity first**
   - Students can use the app without real names.
   - Anonymous usernames (e.g., `zebrU`) are first-class.
   - Identity is optional, never forced.

2. **Text-first interaction**
   - Chat is the default mode.
   - Audio/video is escalation, not default.
   - Works well on low bandwidth.

3. **Layered support**
   - AI Chat → Peer Support → Counselor → Emergency resources
   - Users should always have a next step.

4. **Low cognitive load**
   - UI must be calming.
   - No clutter.
   - Few choices at a time.

5. **Trust over features**
   - Clear privacy language.
   - No dark patterns.
   - No aggressive visuals.

---

## User Roles
### 1. Student (Primary user)
- Anonymous by default
- Can:
  - Chat with AI
  - Use forums
  - Chat with peer mentors
  - Book counselors
  - Join sessions

### 2. Peer Mentor
- Trained student mentors (not therapists)
- Can:
  - Accept chat requests
  - Set office hours
  - Escalate to counselors

### 3. Counselor
- Licensed professionals
- Can:
  - Chat with students
  - Set availability
  - Host sessions
  - Keep private notes

Roles must NEVER leak into each other.

---

## Core Features & Interaction Model

### AI Chat (First Contact)
- Available 24/7
- Text-based
- Empathetic tone
- Helps with:
  - Exam stress
  - Anxiety
  - Relationships
  - Career worries
- Detects crisis language and escalates safely

### Booking & Sessions
- Counselors and peer mentors set availability
- Students select time slots (not manual scheduling via chat)
- Sessions may happen via external video links (Google Meet / Zoom)
- App provides:
  - Join button
  - Reminders
  - Session context

### Forums
- Anonymous, topic-based
- Start with 4 categories:
  - Exams & Academics
  - Anxiety & Stress
  - Relationships
  - General / Vent
- Thread-based, not real-time chat
- Moderated, safety-focused

---

## UI / UX Expectations
- Mobile-first
- Responsive web
- Clean, modern, calming
- Soft green primary color
- Rounded cards
- Friendly typography
- No harsh reds
- Designed for stressed users

---

## Tech Direction
- Web-first app
- Designed to be wrapped later as:
  - Android app (Play Store)
  - iOS app
- Avoid platform-specific assumptions
- Keep components reusable and responsive

---

## Success Metric (Mental Model)
If a stressed student opens the app at night:
- They should feel safe within 5 seconds
- They should be talking to something within 10 seconds
- They should never feel judged or exposed

That is success.
