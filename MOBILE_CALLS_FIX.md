# Mobile-to-Mobile Call Fix

## Problem
Mobile-to-mobile calls don't connect because mobile networks use Carrier-Grade NAT (CGNAT), which makes direct peer-to-peer connections very difficult. STUN servers alone aren't enough - you need TURN servers to relay traffic.

## What Was Fixed

### 1. Enhanced ICE Server Configuration
- Added more STUN servers for better discovery
- Added free public TURN servers as fallback (Metered.ca open relay)
- Improved ICE candidate pool size (10 candidates)
- Set `iceTransportPolicy: "all"` to try both relay and direct connections

### 2. Better Connection Handling
- Improved ICE connection state monitoring
- Better retry logic for failed connections
- Longer timeout for disconnected state (10 seconds)
- Better logging for debugging

### 3. Free TURN Servers Added
The code now includes free public TURN servers from Metered.ca as a fallback. These may have rate limits but should work for testing.

## For Production: Add Your Own TURN Server

The free TURN servers are good for testing, but for production you should use a reliable TURN service:

### Option 1: Metered.ca (Recommended - Free Tier Available)
1. Sign up at https://www.metered.ca/stun-turn
2. Get your credentials
3. Add to `.env.local`:
```bash
NEXT_PUBLIC_TURN_SERVER_URL=turn:relay.metered.ca:80
NEXT_PUBLIC_TURN_USERNAME=your_username
NEXT_PUBLIC_TURN_CREDENTIAL=your_credential
```

### Option 2: Twilio (Paid but Reliable)
1. Sign up at https://www.twilio.com/stun-turn
2. Get your credentials
3. Add to `.env.local`:
```bash
NEXT_PUBLIC_TURN_SERVER_URL=turn:global.turn.twilio.com:3478?transport=udp
NEXT_PUBLIC_TURN_USERNAME=your_twilio_username
NEXT_PUBLIC_TURN_CREDENTIAL=your_twilio_credential
```

### Option 3: Xirsys (Free Tier Available)
1. Sign up at https://xirsys.com/
2. Get your credentials
3. Add to `.env.local`:
```bash
NEXT_PUBLIC_TURN_SERVER_URL=turn:your_xirsys_url
NEXT_PUBLIC_TURN_USERNAME=your_username
NEXT_PUBLIC_TURN_CREDENTIAL=your_credential
```

## Testing

1. **Test mobile-to-mobile calls** - Should now work with the free TURN servers
2. **Check browser console** - Look for "Using ICE servers" log to see which servers are being used
3. **Monitor connection state** - Check console for ICE connection state changes

## Troubleshooting

If calls still don't work:

1. **Check console logs** - Look for ICE connection state messages
2. **Verify TURN servers** - Check that TURN servers are being used (not just STUN)
3. **Test with different networks** - Try WiFi vs mobile data
4. **Add your own TURN server** - Free public servers may have rate limits

## Current Status

✅ **Free TURN servers included** - Should work for mobile-to-mobile calls
⚠️ **Rate limits may apply** - Free servers have usage limits
🔧 **Add your own TURN server** - For production use

## Next Steps

1. Test mobile-to-mobile calls - they should work now
2. If you need production reliability, sign up for a TURN service and add credentials to `.env.local`
3. Restart your dev server after adding TURN credentials
