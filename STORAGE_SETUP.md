# Firebase Storage Setup Guide

## Issue: Upload Timeout

If you're experiencing upload timeouts even with strong internet, it's likely a **Firebase Storage configuration issue**, not your internet connection.

## Quick Fix

### Step 1: Deploy Storage Rules

You need to deploy the storage rules to Firebase. The rules file is at `storage.rules`.

**Option A: Using Firebase CLI (Recommended)**

1. Install Firebase CLI if you haven't:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase in your project (if not already done):
   ```bash
   firebase init storage
   ```
   - Select your project: `theracklick`
   - Use the existing `storage.rules` file

4. Deploy the rules:
   ```bash
   firebase deploy --only storage
   ```

**Option B: Using Firebase Console (Manual)**

1. Go to [Firebase Console - Storage Rules](https://console.firebase.google.com/project/theracklick/storage/rules)
2. Click "Edit rules"
3. Copy and paste the contents of `storage.rules`:
   ```javascript
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /profile-pictures/{userId}/{allPaths=**} {
         allow read: if request.auth != null;
         allow write: if request.auth != null && request.auth.uid == userId;
       }
       match /{allPaths=**} {
         allow read, write: if false;
       }
     }
   }
   ```
4. Click "Publish"

### Step 2: Verify Storage is Enabled

1. Go to [Firebase Console - Storage](https://console.firebase.google.com/project/theracklick/storage)
2. Make sure Storage is enabled
3. If not, click "Get started" and choose a location (choose the same region as your Firestore)

### Step 3: Check Your Environment Variables

Make sure your `.env.local` has:
```
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=theracklick.firebasestorage.app
```

Or whatever your storage bucket name is (check Firebase Console → Storage → Files → the bucket name is shown at the top).

## Testing

After deploying the rules:

1. Open browser console (F12)
2. Try uploading a profile picture
3. Check the console logs - you should see:
   - "Starting upload..."
   - "Uploading bytes..."
   - "Upload complete, getting download URL..."
   - "Profile picture saved successfully!"

If you see an error, the console will show the exact error code and message.

## Common Error Codes

- `storage/unauthorized` or `storage/permission-denied`: Storage rules not deployed or incorrect
- `storage/unauthenticated`: User not logged in
- `storage/object-not-found`: Storage bucket not configured correctly
- `storage/quota-exceeded`: Firebase Storage quota exceeded

## Need Help?

Check the browser console (F12 → Console tab) for detailed error messages. The improved error handling will show you exactly what's wrong.
