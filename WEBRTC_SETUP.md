# WebRTC Call Feature Setup

## Overview

The WebRTC call feature allows students to make voice and video calls to counselors and peer mentors directly from the app. No separate API server is required - everything works through Firebase Firestore for signaling.

## How It Works

### Signaling (No API Required)
- **Firestore** is used for WebRTC signaling (offer/answer/ICE candidates)
- No separate signaling server needed
- Real-time updates via Firestore listeners

### Media Connection
- **STUN servers**: Free public Google STUN servers (included by default)
- **TURN servers**: Optional, for users behind strict NATs/firewalls

## Current Setup (Works Out of the Box)

✅ **No additional APIs needed** - The feature works with:
- Firebase Firestore (already configured)
- Free public STUN servers (no API keys needed)

This setup works for **most users** in typical network conditions.

## Optional: TURN Servers (For Production)

If you want better connectivity for users behind strict firewalls/NATs, you can add TURN servers:

### Option 1: Use a TURN Service (Recommended for Production)

**Twilio STUN/TURN Service:**
1. Sign up at [Twilio](https://www.twilio.com/stun-turn)
2. Get your credentials
3. Add to `.env.local`:
```bash
NEXT_PUBLIC_TURN_SERVER_URL=turn:global.turn.twilio.com:3478?transport=udp
NEXT_PUBLIC_TURN_USERNAME=your_twilio_username
NEXT_PUBLIC_TURN_CREDENTIAL=your_twilio_credential
```

**Other TURN Services:**
- [Xirsys](https://xirsys.com/)
- [Metered.ca](https://www.metered.ca/stun-turn)
- Self-hosted [coturn](https://github.com/coturn/coturn)

### Option 2: Self-Hosted TURN Server

If you want to host your own TURN server using coturn:

1. Install coturn on a server
2. Configure it with your domain
3. Add credentials to `.env.local`:
```bash
NEXT_PUBLIC_TURN_SERVER_URL=turn:your-turn-server.com:3478
NEXT_PUBLIC_TURN_USERNAME=your_username
NEXT_PUBLIC_TURN_CREDENTIAL=your_password
```

## Firestore Rules

Make sure your Firestore rules include the calls collection (already added):

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

Deploy with: `firebase deploy --only firestore:rules`

## Testing

1. **Basic Test (STUN only)**:
   - Works for most users on the same network or with standard NATs
   - No configuration needed

2. **Behind Firewall Test**:
   - If calls fail, add TURN servers
   - Test from different networks (mobile data, different WiFi)

## Troubleshooting

**Calls not connecting?**
- Check browser console for errors
- Verify microphone/camera permissions
- Try adding TURN servers if users are behind strict firewalls
- Check Firestore rules are deployed

**No audio/video?**
- Ensure browser permissions are granted
- Check browser compatibility (Chrome, Firefox, Safari 11+)
- Verify media devices are not in use by other apps

## Cost Considerations

- **STUN servers**: Free (Google public servers)
- **Firestore**: Pay-as-you-go (very low cost for signaling)
- **TURN servers**: 
  - Free tier available from some providers
  - Self-hosted: Server costs only
  - Twilio: ~$0.40 per 1,000 minutes

## Summary

✅ **Current setup works without any additional APIs**
- Uses Firestore (already configured)
- Uses free STUN servers
- Ready to use immediately

🔧 **Optional TURN servers** (only if needed):
- For users behind strict firewalls
- For production scale
- Can be added later via environment variables
