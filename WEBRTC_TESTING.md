# Testing WebRTC Calls on the Same Device

## Quick Setup

To test calls on the same device, you need **two different browser windows/tabs** with **different user accounts**.

### Method 1: Two Browser Windows (Recommended)

1. **Open two separate browser windows** (not tabs):
   - Window 1: Chrome/Edge (or any browser)
   - Window 2: Chrome Incognito/Firefox Private (or different browser)

2. **Window 1 - Student Account:**
   - Go to `http://localhost:3000`
   - Sign up or log in as a **Student**
   - Navigate to a counselor or peer mentor profile
   - Click "Call" or "Video" button

3. **Window 2 - Counselor/Peer Mentor Account:**
   - Go to `http://localhost:3000`
   - Sign up or log in as a **Counselor** or **Peer Mentor**
   - Wait for the incoming call notification
   - Click "Accept"

### Method 2: Two Different Browsers

1. **Browser 1 (e.g., Chrome):**
   - Log in as Student
   - Make a call

2. **Browser 2 (e.g., Firefox or Safari):**
   - Log in as Counselor/Peer Mentor
   - Accept the call

### Method 3: Mobile + Desktop

1. **Desktop Browser:**
   - Log in as Student
   - Make a call

2. **Mobile Browser (same WiFi):**
   - Log in as Counselor/Peer Mentor
   - Accept the call

## Important Notes

⚠️ **Same Browser Tab = Same Session**
- You cannot have two different users logged in on the same browser tab
- Each browser window/tab maintains its own session

✅ **Different Browser Windows = Different Sessions**
- Use Incognito/Private mode for the second window
- Or use a completely different browser

## Testing Checklist

- [ ] Two browser windows open
- [ ] Student logged in (Window 1)
- [ ] Counselor/Peer Mentor logged in (Window 2)
- [ ] Student clicks "Call" or "Video"
- [ ] Counselor sees incoming call notification
- [ ] Counselor clicks "Accept"
- [ ] Both see call interface
- [ ] Audio/video works (check permissions)
- [ ] Can mute/unmute
- [ ] Can toggle video (if video call)
- [ ] Can end call

## Troubleshooting

**No incoming call notification?**
- Check both users are logged in
- Verify Firestore rules are deployed
- Check browser console for errors

**Call not connecting?**
- Grant microphone/camera permissions
- Check both windows have permissions
- Try refreshing both windows

**Audio/video not working?**
- Check browser permissions (lock icon in address bar)
- Ensure no other app is using camera/mic
- Try a different browser
