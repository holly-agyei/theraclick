# Phone-to-Phone Call Fix

## What Was Changed

### 1. **Prioritized TURN Servers**
- TURN servers are now listed FIRST (before STUN)
- This ensures mobile devices try relay connections first

### 2. **Mobile-Specific Configuration**
- On mobile devices, `iceTransportPolicy` is set to `"relay"` (TURN only)
- On desktop, it's set to `"all"` (tries both direct and relay)
- This forces mobile-to-mobile calls to use TURN servers

### 3. **More TURN Server Options**
- Added multiple free TURN servers as fallback
- Includes both UDP and TCP transports
- Multiple ports (80, 443) for better compatibility

## How to Verify It's Working

1. **Open browser console on both phones** when making a call
2. **Look for these logs:**
   - "Using ICE servers:" - Should show TURN servers first
   - "ICE Transport Policy:" - Should show "relay" on mobile
   - "Is Mobile Device:" - Should show "true" on phones
   - "ICE Connection State:" - Watch for "connected" or "completed"

3. **Check ICE candidates:**
   - Look for candidates with `typ relay` (not `typ host` or `typ srflx`)
   - Relay candidates mean TURN is being used

## If It Still Doesn't Work

### Option 1: Get Your Own TURN Server (Recommended)

The free TURN servers may have rate limits or be unreliable. Get your own:

**Metered.ca (Free Tier):**
1. Go to https://www.metered.ca/stun-turn
2. Sign up (free tier available)
3. Get your credentials
4. Add to `.env.local`:
```bash
NEXT_PUBLIC_TURN_SERVER_URL=turn:relay.metered.ca:80
NEXT_PUBLIC_TURN_USERNAME=your_username
NEXT_PUBLIC_TURN_CREDENTIAL=your_credential
```

**Twilio (Paid but Reliable):**
1. Go to https://www.twilio.com/stun-turn
2. Sign up and get credentials
3. Add to `.env.local`:
```bash
NEXT_PUBLIC_TURN_SERVER_URL=turn:global.turn.twilio.com:3478?transport=udp
NEXT_PUBLIC_TURN_USERNAME=your_twilio_username
NEXT_PUBLIC_TURN_CREDENTIAL=your_twilio_credential
```

### Option 2: Check Network Issues

1. **Try different networks:**
   - Test on WiFi vs mobile data
   - Try different WiFi networks
   - Some mobile carriers block WebRTC

2. **Check browser permissions:**
   - Ensure microphone is allowed
   - Check if browser blocks WebRTC (some browsers do)

3. **Test with ngrok:**
   - ngrok shouldn't affect WebRTC (it's peer-to-peer)
   - But try without ngrok to rule it out

### Option 3: Debug Steps

1. **Check console logs:**
   - Are TURN servers being used?
   - What's the ICE connection state?
   - Any errors in the console?

2. **Test connection:**
   - Try phone-to-PC first (should work)
   - Then try phone-to-phone
   - Check if both phones show "relay" policy

3. **Verify TURN servers:**
   - The free servers might be down or rate-limited
   - Get your own TURN server for reliable service

## Current Configuration

- ✅ TURN servers prioritized
- ✅ Mobile devices use relay-only policy
- ✅ Multiple free TURN servers as fallback
- ⚠️ Free servers may have rate limits

## Next Steps

1. **Test the call** - Check console logs
2. **If it works** - Great! You're done
3. **If it doesn't** - Get your own TURN server (Metered.ca free tier is recommended)
4. **Restart dev server** after adding TURN credentials

## Important Notes

- **ngrok doesn't affect WebRTC** - WebRTC is peer-to-peer, ngrok only tunnels HTTP
- **Mobile-to-mobile REQUIRES TURN** - Direct connections won't work due to carrier NAT
- **Free TURN servers are for testing** - Use a paid service for production
