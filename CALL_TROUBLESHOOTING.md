# Call Feature Troubleshooting Guide

## Quick Checks

### 1. **Check Browser Console**
Open browser console (F12) and look for:
- ✅ "Initiating call to: [userId]" - Call is starting
- ✅ "Using ICE servers: [...]" - WebRTC config loaded
- ❌ Any red error messages
- ❌ "Call manager not initialized" - CallProvider issue
- ❌ "User not logged in" - Auth issue

### 2. **Check Permissions**
- **Microphone**: Browser should ask for permission
- **Camera** (for video): Browser should ask for permission
- If denied, click the lock icon in address bar and allow

### 3. **Check Network**
- Ensure both users are online
- Check Firestore connection (should see data loading)
- For mobile-to-mobile: TURN servers required

### 4. **Check Call Buttons**
- Buttons should be visible in chat pages
- Click should trigger call (check console)
- Button should be enabled (not disabled)

## Common Issues

### Issue 1: "Call manager not initialized"
**Cause**: CallProvider not set up correctly
**Fix**: 
- Check `app/providers.tsx` includes `<CallProvider>`
- Check `app/layout.tsx` includes `<CallUI />`
- Refresh the page

### Issue 2: "User not logged in"
**Cause**: User not authenticated
**Fix**: 
- Log in first
- Check auth context is working
- Refresh page

### Issue 3: "Failed to start call"
**Cause**: Various (permissions, network, WebRTC)
**Fix**:
- Check browser console for specific error
- Grant microphone/camera permissions
- Check network connection
- Try different browser

### Issue 4: Call starts but doesn't connect
**Cause**: WebRTC connection issues
**Fix**:
- Check console for "ICE Connection State"
- For mobile-to-mobile: Need TURN servers
- Check Firestore rules allow call documents
- Wait 20 seconds (connection timeout)

### Issue 5: No incoming call notification
**Cause**: Firestore listener not working
**Fix**:
- Check Firestore rules
- Check both users are online
- Check console for Firestore errors
- Verify call document created in Firestore

## Debug Steps

### Step 1: Test Call Initiation
1. Open browser console
2. Click call button
3. Look for:
   - "Initiating call to: [userId]"
   - "Call initiated, callId: [id]"
   - "Using ICE servers: [...]"
   - Any errors

### Step 2: Test Call Acceptance
1. On receiving device, check console
2. Look for:
   - "Accepting call: [callId]"
   - "Call accepted successfully"
   - "Using ICE servers: [...]"
   - Any errors

### Step 3: Check Connection State
Watch console for:
- "ICE Connection State: checking" → "connected" or "completed"
- "Connection State: connecting" → "connected"
- If stuck on "checking" or "connecting": Connection issue

### Step 4: Check Firestore
1. Open Firebase Console
2. Go to Firestore Database
3. Check `calls` collection:
   - Should see call document when call starts
   - Should see `signals` subcollection with offer/answer/ICE candidates
4. Check `directMessages` collection for chat

## Browser-Specific Issues

### Chrome/Edge
- ✅ Best support
- Check permissions in settings
- Check if WebRTC is enabled

### Firefox
- ✅ Good support
- May need to allow permissions manually

### Safari
- ⚠️ Limited WebRTC support
- May not work on older versions
- Requires Safari 11+

### Mobile Browsers
- ⚠️ May have restrictions
- Check browser settings
- May need TURN servers for mobile-to-mobile

## Network Issues

### Same Network (PC to PC)
- ✅ Should work with STUN only
- Check firewall settings
- Check if WebRTC is blocked

### Different Networks (PC to PC)
- ✅ Should work with STUN
- May need TURN if behind strict NAT

### Mobile to Mobile
- ❌ REQUIRES TURN servers
- Free TURN servers may have limits
- Get your own TURN server for production

### Mobile to PC
- ✅ Usually works with STUN
- May need TURN if mobile on cellular

## Firestore Rules Check

Make sure your Firestore rules allow:
```javascript
match /calls/{callId} {
  allow read, write: if isSignedIn() && (
    request.auth.uid == resource.data.callerId ||
    request.auth.uid == resource.data.receiverId ||
    request.auth.uid == request.resource.data.callerId ||
    request.auth.uid == request.resource.data.receiverId
  );
  
  match /signals/{signalId} {
    allow read, write: if isSignedIn() && (
      request.auth.uid == get(/databases/$(database)/documents/calls/$(callId)).data.callerId ||
      request.auth.uid == get(/databases/$(database)/documents/calls/$(callId)).data.receiverId
    );
  }
}
```

## Still Not Working?

1. **Check all console errors** - Copy and share
2. **Test with different browsers** - Rule out browser issues
3. **Test on different networks** - Rule out network issues
4. **Check Firestore console** - Verify data is being created
5. **Check browser permissions** - Microphone/camera allowed
6. **Try incognito/private mode** - Rule out extension issues

## Getting Help

If still not working, provide:
1. Browser console errors (screenshot or copy)
2. Browser and version
3. Device type (PC/mobile)
4. Network type (WiFi/mobile data)
5. Steps to reproduce
6. Firestore rules status
