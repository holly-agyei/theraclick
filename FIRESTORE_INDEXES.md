# Required Firestore Indexes

This document lists all the Firestore composite indexes required for Theraclick to function properly.

## Bookings Collection

### Index 1: Counselor Bookings Query
- **Collection**: `bookings`
- **Fields**:
  - `counselorId` (Ascending)
  - `date` (Ascending)
- **Query Location**: `/app/counselor/bookings/page.tsx` and `/app/counselor/dashboard/page.tsx`
- **Create Index**: [Click here to create](https://console.firebase.google.com/v1/r/project/theracklick/firestore/indexes?create_composite=Ckxwcm9qZWN0cy90aGVyYWNrbGljay9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvYm9va2luZ3MvaW5kZXhlcy9fEAEaDwoLY291bnNlbG9ySWQQARoICgRkYXRlEAEaDAoIX19uYW1lX18QAQ)

### Index 2: Student Bookings Query
- **Collection**: `bookings`
- **Fields**:
  - `studentId` (Ascending)
  - `date` (Ascending)
- **Query Location**: `/app/student/bookings/page.tsx`
- **Create Index**: You'll need to create this manually in Firebase Console or click the link in the browser console error

## How to Create Indexes

1. **Automatic**: Click the link provided in the error message when you first encounter the error. Firebase will automatically create the index.

2. **Manual**: 
   - Go to [Firebase Console](https://console.firebase.google.com/project/theracklick/firestore/indexes)
   - Click "Create Index"
   - Select the collection (`bookings`)
   - Add the fields in the order specified above
   - Click "Create"

## Index Build Time

Indexes typically take a few minutes to build. You'll see a status indicator in the Firebase Console. Once the index is built, the queries will work automatically.

## Troubleshooting

If you see a "failed-precondition" error:
1. Check that the index has been created in Firebase Console
2. Wait for the index to finish building (status will show "Enabled")
3. Refresh the page

## Firebase Storage Rules

Don't forget to deploy storage rules for voice messages:
```bash
firebase deploy --only storage
```
