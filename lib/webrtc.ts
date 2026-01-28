/**
 * WebRTC Call Manager
 * Handles peer-to-peer voice and video calls using WebRTC
 * Uses Firestore for signaling (offer/answer/ICE candidates)
 */

import { db } from "./firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  deleteDoc,
  serverTimestamp,
  Timestamp,
  updateDoc
} from "firebase/firestore";

export type CallType = "voice" | "video";
export type CallStatus = "idle" | "ringing" | "connecting" | "active" | "ended" | "rejected" | "missed";

export interface CallSignal {
  type: "offer" | "answer" | "ice-candidate" | "call-request" | "call-accept" | "call-reject" | "call-end";
  from: string;
  to: string;
  data?: any;
  timestamp: Timestamp;
}

export interface CallSession {
  callId: string;
  callerId: string;
  receiverId: string;
  callType: CallType;
  status: CallStatus;
  startTime?: Date;
  endTime?: Date;
}

export class WebRTCCallManager {
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private callId: string | null = null;
  private userId: string;
  private remoteUserId: string | null = null;
  private callType: CallType = "voice";
  private callStatus: CallStatus = "idle";
  private signalingUnsubscribers: (() => void)[] = [];
  private pendingIceCandidates: RTCIceCandidateInit[] = [];
  private onStatusChange: ((status: CallStatus) => void) | null = null;
  private onRemoteStream: ((stream: MediaStream) => void) | null = null;
  private onLocalStream: ((stream: MediaStream) => void) | null = null;
  private onCallEnd: (() => void) | null = null;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private isCleaningUp: boolean = false;
  private hasReceivedOffer: boolean = false;

  // STUN/TURN servers configuration
  private getRTCConfig(): RTCConfiguration {
    const iceServers: RTCIceServer[] = [];

    // Check for custom TURN server from environment
    const turnServerUrl = typeof window !== "undefined" 
      ? (window as any).__TURN_SERVER_URL__ || process.env.NEXT_PUBLIC_TURN_SERVER_URL
      : process.env.NEXT_PUBLIC_TURN_SERVER_URL;
    
    const turnUsername = typeof window !== "undefined"
      ? (window as any).__TURN_USERNAME__ || process.env.NEXT_PUBLIC_TURN_USERNAME
      : process.env.NEXT_PUBLIC_TURN_USERNAME;
    
    const turnCredential = typeof window !== "undefined"
      ? (window as any).__TURN_CREDENTIAL__ || process.env.NEXT_PUBLIC_TURN_CREDENTIAL
      : process.env.NEXT_PUBLIC_TURN_CREDENTIAL;

    // Add STUN servers FIRST for quick discovery
    iceServers.push(
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: "stun:stun3.l.google.com:19302" },
      { urls: "stun:stun4.l.google.com:19302" },
      { urls: "stun:stun.stunprotocol.org:3478" }
    );

    // Add configured TURN server (if provided)
    if (turnServerUrl) {
      const turnConfig: RTCIceServer = {
        urls: turnServerUrl,
      };
      if (turnUsername) turnConfig.username = turnUsername;
      if (turnCredential) turnConfig.credential = turnCredential;
      iceServers.push(turnConfig);
      console.log("Using custom TURN server:", turnServerUrl);
    } else {
      // Add free public TURN servers as fallback
      // Note: These are free servers and may have rate limits or be unavailable
      iceServers.push(
        // Metered.ca free TURN (may require signup for reliable access)
        { 
          urls: [
            "turn:a.relay.metered.ca:80",
            "turn:a.relay.metered.ca:80?transport=tcp",
            "turn:a.relay.metered.ca:443",
            "turn:a.relay.metered.ca:443?transport=tcp"
          ],
          username: "83eebabf8b4cce9d5dbcb649",
          credential: "2D7JvfkOQtBdYW3R"
        },
        // Twilio free STUN (no auth needed)
        { urls: "stun:global.stun.twilio.com:3478" }
      );
      console.log("Using free public TURN servers");
    }

    // Always use "all" policy to try both direct and relayed connections
    // This gives the best chance of connecting
    return { 
      iceServers,
      iceTransportPolicy: "all",
      iceCandidatePoolSize: 10,
      bundlePolicy: "max-bundle",
      rtcpMuxPolicy: "require"
    };
  }

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Force reset all state - use before accepting/initiating calls
   */
  forceReset(): void {
    console.log("Force resetting call manager state");
    
    // Clear timeout
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    // Stop all tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        try { track.stop(); } catch (e) { /* ignore */ }
      });
      this.localStream = null;
    }

    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((track) => {
        try { track.stop(); } catch (e) { /* ignore */ }
      });
      this.remoteStream = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.ontrack = null;
      this.peerConnection.onicecandidate = null;
      this.peerConnection.oniceconnectionstatechange = null;
      this.peerConnection.onconnectionstatechange = null;
      this.peerConnection.onicegatheringstatechange = null;
      try { this.peerConnection.close(); } catch (e) { /* ignore */ }
      this.peerConnection = null;
    }

    // Unsubscribe from signaling
    this.signalingUnsubscribers.forEach((unsub) => {
      try { unsub(); } catch (e) { /* ignore */ }
    });
    this.signalingUnsubscribers = [];

    // Reset all state
    this.callId = null;
    this.remoteUserId = null;
    this.callStatus = "idle";
    this.pendingIceCandidates = [];
    this.isCleaningUp = false;
    this.hasReceivedOffer = false;
  }

  /**
   * Check if a call is active
   */
  isCallActive(): boolean {
    return this.callId !== null && this.callStatus !== "idle" && this.callStatus !== "ended";
  }

  /**
   * Set callbacks
   */
  setCallbacks(callbacks: {
    onStatusChange?: (status: CallStatus) => void;
    onRemoteStream?: (stream: MediaStream) => void;
    onLocalStream?: (stream: MediaStream) => void;
    onCallEnd?: () => void;
  }) {
    this.onStatusChange = callbacks.onStatusChange || null;
    this.onRemoteStream = callbacks.onRemoteStream || null;
    this.onLocalStream = callbacks.onLocalStream || null;
    this.onCallEnd = callbacks.onCallEnd || null;
  }

  /**
   * Initialize call - start calling another user
   */
  async initiateCall(receiverId: string, type: CallType = "voice"): Promise<string> {
    // Force reset any existing state
    this.forceReset();

    this.callType = type;
    this.remoteUserId = receiverId;
    this.callId = `call_${this.userId}_${receiverId}_${Date.now()}`;
    
    // Initialize pending ICE candidates array
    this.pendingIceCandidates = [];

    try {
      // Get local media stream
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: type === "video",
      };
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("✓ Local stream acquired (initiateCall)");
      
      // Notify about local stream immediately
      if (this.onLocalStream && this.localStream) {
        this.onLocalStream(this.localStream);
      }

      // Create peer connection with optimized config for mobile
      const config = this.getRTCConfig();
      this.peerConnection = new RTCPeerConnection(config);
      
      // Log ICE servers for debugging
      console.log("Using ICE servers:", config.iceServers.map(s => s.urls).flat());
      console.log("ICE Transport Policy:", config.iceTransportPolicy);

      // Add local tracks to peer connection
      this.localStream.getTracks().forEach((track) => {
        if (this.localStream && this.peerConnection) {
          this.peerConnection.addTrack(track, this.localStream);
        }
      });

      // Handle remote stream - improved for video display
      this.peerConnection.ontrack = (event) => {
        console.log("=== CALLER: REMOTE TRACK ===");
        console.log("Track kind:", event.track.kind);
        console.log("Track enabled:", event.track.enabled);
        console.log("Streams count:", event.streams.length);
        
        // Use existing remote stream or create new one
        if (!this.remoteStream) {
          this.remoteStream = event.streams[0] || new MediaStream();
        }
        
        // Add the track if not already present
        const existingTrack = this.remoteStream.getTracks().find(t => t.id === event.track.id);
        if (!existingTrack) {
          this.remoteStream.addTrack(event.track);
          console.log("Caller: Added track to remote stream:", event.track.kind);
        }
        
        // Notify about updated remote stream
        if (this.onRemoteStream) {
          this.onRemoteStream(this.remoteStream);
        }
      };

      // Handle ICE connection state changes
      this.peerConnection.oniceconnectionstatechange = () => {
        const state = this.peerConnection?.iceConnectionState;
        console.log("ICE Connection State:", state);
        
        if (state === "failed") {
          console.error("ICE connection failed, attempting to restart");
          // Try to restart ICE
          if (this.peerConnection) {
            try {
              this.peerConnection.restartIce();
            } catch (e) {
              console.error("Failed to restart ICE:", e);
              // If restart fails, end the call
              this.updateStatus("ended");
              this.cleanup();
            }
          }
        } else if (state === "disconnected") {
          console.warn("ICE connection disconnected");
          // Wait a bit before ending, might reconnect
          setTimeout(() => {
            if (this.peerConnection?.iceConnectionState === "disconnected") {
              this.updateStatus("ended");
              this.cleanup();
            }
          }, 5000);
        } else if (state === "connected" || state === "completed") {
          this.updateStatus("active");
        }
      };

      // Handle connection state changes
      this.peerConnection.onconnectionstatechange = () => {
        const state = this.peerConnection?.connectionState;
        console.log("Connection State:", state);
        
        if (state === "failed") {
          console.error("Peer connection failed");
          this.updateStatus("ended");
          this.cleanup();
        } else if (state === "connected") {
          this.updateStatus("active");
        }
      };

      // Handle ICE candidates - send immediately
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.callId && db) {
          // Serialize RTCIceCandidate to plain object for Firestore
          const candidateData = {
            candidate: event.candidate.candidate,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            sdpMid: event.candidate.sdpMid,
            usernameFragment: event.candidate.usernameFragment || null,
          };
          // Send immediately without await to avoid blocking
          this.sendSignal({
            type: "ice-candidate",
            from: this.userId,
            to: receiverId,
            data: candidateData,
          }).catch((error) => {
            console.error("Error sending ICE candidate:", error);
          });
        } else if (!event.candidate) {
          console.log("All ICE candidates have been sent");
        }
      };
      
      // Handle ICE gathering state
      this.peerConnection.onicegatheringstatechange = () => {
        const state = this.peerConnection?.iceGatheringState;
        console.log("ICE Gathering State:", state);
      };

      // Create offer with better options for faster connection
      const offerOptions: RTCOfferOptions = {
        offerToReceiveAudio: true,
        offerToReceiveVideo: type === "video",
        iceRestart: false,
      };
      const offer = await this.peerConnection.createOffer(offerOptions);
      await this.peerConnection.setLocalDescription(offer);

      // Create call document in Firestore
      if (db) {
        await setDoc(doc(db, "calls", this.callId), {
          callerId: this.userId,
          receiverId: receiverId,
          callType: type,
          status: "ringing",
          createdAt: serverTimestamp(),
        });
      }

      // Listen for answer and ICE candidates FIRST (before sending signals)
      this.setupSignalingListeners(receiverId);

      // Send call request
      await this.sendSignal({
        type: "call-request",
        from: this.userId,
        to: receiverId,
        data: { callId: this.callId, callType: type },
      });

      // Send offer immediately after setting up listeners
      await this.sendSignal({
        type: "offer",
        from: this.userId,
        to: receiverId,
        data: offer,
      });

      this.updateStatus("ringing");

      // Set timeout for connection (30 seconds for ringing, then 20 seconds for connecting)
      this.connectionTimeout = setTimeout(() => {
        if (this.callStatus === "ringing") {
          console.warn("Call timeout - no answer received (30s)");
          this.updateStatus("missed");
          this.cleanup();
        } else if (this.callStatus === "connecting") {
          console.warn("Call connection timeout - failed to establish connection (30s)");
          this.updateStatus("ended");
          this.cleanup();
        }
      }, 30000);

      return this.callId;
    } catch (error: any) {
      console.error("Error initiating call:", error);
      await this.endCall();
      throw new Error(error.message || "Failed to initiate call");
    }
  }

  /**
   * Accept incoming call
   */
  async acceptCall(callId: string, callerId: string, type: CallType): Promise<void> {
    // Force reset any existing state before accepting
    this.forceReset();

    this.callId = callId;
    this.remoteUserId = callerId;
    this.callType = type;
    this.hasReceivedOffer = false;

    try {
      // Get local media stream
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: type === "video",
      };
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("✓ Local stream acquired (acceptCall)");
      
      // Notify about local stream immediately
      if (this.onLocalStream && this.localStream) {
        this.onLocalStream(this.localStream);
      }

      // Create peer connection with optimized config for mobile
      const config = this.getRTCConfig();
      this.peerConnection = new RTCPeerConnection(config);
      
      // Initialize pending ICE candidates array
      this.pendingIceCandidates = [];
      
      // Log ICE servers for debugging
      console.log("Using ICE servers:", config.iceServers.map(s => s.urls).flat());
      console.log("ICE Transport Policy:", config.iceTransportPolicy);

      // Add local tracks
      this.localStream.getTracks().forEach((track) => {
        if (this.localStream && this.peerConnection) {
          this.peerConnection.addTrack(track, this.localStream);
        }
      });

      // Handle remote stream - improved for video display
      this.peerConnection.ontrack = (event) => {
        console.log("=== RECEIVER: REMOTE TRACK ===");
        console.log("Track kind:", event.track.kind);
        console.log("Track enabled:", event.track.enabled);
        console.log("Streams count:", event.streams.length);
        
        // Use existing remote stream or create new one
        if (!this.remoteStream) {
          this.remoteStream = event.streams[0] || new MediaStream();
        }
        
        // Add the track if not already present
        const existingTrack = this.remoteStream.getTracks().find(t => t.id === event.track.id);
        if (!existingTrack) {
          this.remoteStream.addTrack(event.track);
          console.log("Receiver: Added track to remote stream:", event.track.kind);
        }
        
        // Notify about updated remote stream
        if (this.onRemoteStream) {
          this.onRemoteStream(this.remoteStream);
        }
      };

      // Handle ICE connection state changes
      this.peerConnection.oniceconnectionstatechange = () => {
        const state = this.peerConnection?.iceConnectionState;
        console.log("ICE Connection State:", state);
        
        if (state === "failed") {
          console.error("ICE connection failed, attempting restart");
          if (this.peerConnection) {
            try {
              this.peerConnection.restartIce();
              console.log("ICE restart initiated");
            } catch (e) {
              console.error("Failed to restart ICE:", e);
              setTimeout(() => {
                if (this.peerConnection?.iceConnectionState === "failed") {
                  console.error("ICE connection still failed after restart");
                  this.updateStatus("ended");
                  this.cleanup();
                }
              }, 5000);
            }
          }
        } else if (state === "disconnected") {
          console.warn("ICE connection disconnected, waiting for reconnection...");
          setTimeout(() => {
            if (this.peerConnection?.iceConnectionState === "disconnected") {
              console.error("ICE connection did not reconnect");
              this.updateStatus("ended");
              this.cleanup();
            }
          }, 10000);
        } else if (state === "connected" || state === "completed") {
          console.log("ICE connection established successfully");
          this.updateStatus("active");
        } else if (state === "checking") {
          console.log("ICE connection checking...");
        }
      };

      // Handle connection state changes
      this.peerConnection.onconnectionstatechange = () => {
        const state = this.peerConnection?.connectionState;
        console.log("Connection State:", state);
        
        if (state === "failed") {
          console.error("Peer connection failed");
          this.updateStatus("ended");
          this.cleanup();
        } else if (state === "connected") {
          this.updateStatus("active");
        }
      };

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.callId && db) {
          // Serialize RTCIceCandidate to plain object for Firestore
          const candidateData = {
            candidate: event.candidate.candidate,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            sdpMid: event.candidate.sdpMid,
            usernameFragment: event.candidate.usernameFragment || null,
          };
          this.sendSignal({
            type: "ice-candidate",
            from: this.userId,
            to: callerId,
            data: candidateData,
          });
        } else if (!event.candidate) {
          console.log("All ICE candidates have been sent");
        }
      };

      // Update call document FIRST
      if (db) {
        await setDoc(doc(db, "calls", callId), {
          callerId: callerId,
          receiverId: this.userId,
          callType: type,
          status: "connecting",
          acceptedAt: serverTimestamp(),
        }, { merge: true });
      }

      // Send accept signal
      await this.sendSignal({
        type: "call-accept",
        from: this.userId,
        to: callerId,
        data: { callId },
      });

      this.updateStatus("connecting");

      // Now listen for offer and ICE candidates - this will also process any existing signals
      this.setupSignalingListenersForReceiver(callerId);
    } catch (error: any) {
      console.error("Error accepting call:", error);
      await this.rejectCall(callId, callerId);
      throw new Error(error.message || "Failed to accept call");
    }
  }

  /**
   * Handle incoming offer
   */
  private async handleOffer(offer: RTCSessionDescriptionInit, callerId: string): Promise<void> {
    console.log("=== HANDLING OFFER ===");
    console.log("Offer type:", offer.type);
    console.log("Offer SDP length:", offer.sdp?.length || 0);
    
    if (!this.peerConnection) {
      console.error("No peer connection when handling offer");
      return;
    }

    try {
      console.log("Setting remote description (offer)...");
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      console.log("✓ Remote description set successfully");

      // Add any pending ICE candidates
      if (this.pendingIceCandidates && this.pendingIceCandidates.length > 0) {
        console.log(`Adding ${this.pendingIceCandidates.length} pending ICE candidates...`);
        for (const candidate of this.pendingIceCandidates) {
          try {
            if (candidate && candidate.candidate) {
              await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
              console.log("✓ Added pending ICE candidate");
            }
          } catch (e) {
            console.warn("Error adding pending ICE candidate:", e);
          }
        }
        this.pendingIceCandidates = [];
      }

      // Create answer
      console.log("Creating answer...");
      const answer = await this.peerConnection.createAnswer();
      console.log("✓ Answer created, SDP length:", answer.sdp?.length || 0);
      
      console.log("Setting local description (answer)...");
      await this.peerConnection.setLocalDescription(answer);
      console.log("✓ Local description set successfully");

      // Send answer immediately
      console.log("Sending answer to caller...");
      await this.sendSignal({
        type: "answer",
        from: this.userId,
        to: callerId,
        data: answer,
      });
      console.log("✓ Answer sent to caller");

      this.updateStatus("connecting");
      console.log("=== OFFER HANDLING COMPLETE ===");
    } catch (error) {
      console.error("Error handling offer:", error);
      throw error;
    }
  }

  /**
   * Handle incoming answer
   */
  private async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    console.log("=== HANDLING ANSWER ===");
    console.log("Answer type:", answer.type);
    console.log("Answer SDP length:", answer.sdp?.length || 0);
    
    if (!this.peerConnection) {
      console.error("No peer connection when handling answer");
      return;
    }

    // Check if we already have a remote description
    if (this.peerConnection.remoteDescription) {
      console.warn("Remote description already set, skipping answer");
      return;
    }

    try {
      console.log("Setting remote description (answer)...");
      console.log("Current signaling state:", this.peerConnection.signalingState);
      
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      console.log("✓ Remote description (answer) set successfully");
      console.log("New signaling state:", this.peerConnection.signalingState);
      
      // Add any pending ICE candidates now that remote description is set
      if (this.pendingIceCandidates && this.pendingIceCandidates.length > 0) {
        console.log(`Adding ${this.pendingIceCandidates.length} pending ICE candidates after answer...`);
        for (const candidate of this.pendingIceCandidates) {
          try {
            if (candidate && candidate.candidate) {
              await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
              console.log("✓ Added pending ICE candidate");
            }
          } catch (e) {
            console.warn("Error adding pending ICE candidate:", e);
          }
        }
        this.pendingIceCandidates = [];
      }
      
      this.updateStatus("connecting");
      console.log("=== ANSWER HANDLING COMPLETE ===");
    } catch (error) {
      console.error("Error handling answer:", error);
      throw error;
    }
  }

  /**
   * Handle ICE candidate
   */
  private async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) {
      console.error("No peer connection when handling ICE candidate");
      return;
    }

    // Log candidate type for debugging
    const candidateStr = candidate.candidate || "";
    let candidateType = "unknown";
    if (candidateStr.includes("typ host")) candidateType = "host";
    else if (candidateStr.includes("typ srflx")) candidateType = "srflx (STUN)";
    else if (candidateStr.includes("typ relay")) candidateType = "relay (TURN)";
    else if (candidateStr.includes("typ prflx")) candidateType = "prflx";
    
    console.log(`Received ICE candidate: ${candidateType}`);

    try {
      // Check if remote description is set
      if (!this.peerConnection.remoteDescription) {
        console.warn("Remote description not set yet, queuing ICE candidate");
        this.pendingIceCandidates.push(candidate);
        return;
      }
      
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      console.log(`✓ ICE candidate added (${candidateType})`);
    } catch (error) {
      console.error("Error adding ICE candidate:", error);
      // Don't throw - ICE candidates can fail and connection might still work
    }
  }

  /**
   * Setup signaling listeners (for caller)
   */
  private setupSignalingListeners(remoteUserId: string): void {
    if (!db || !this.callId) {
      console.error("Cannot setup signaling listener: db or callId missing");
      return;
    }

    console.log("=== SETTING UP CALLER SIGNALING LISTENER ===");
    console.log("Listening for signals from receiver:", remoteUserId);
    console.log("Call ID:", this.callId);

    // Listen for signals from remote user
    const signalsRef = collection(db, "calls", this.callId, "signals");
    
    const unsub = onSnapshot(signalsRef, (snapshot) => {
      const changes = snapshot.docChanges();
      if (changes.length > 0) {
        console.log(`[Caller] Received ${changes.length} signal changes`);
      }
      
      changes.forEach((change) => {
        if (change.type === "added") {
          const signal = change.doc.data() as CallSignal;
          
          // Process signals from the remote user (they're sending to us)
          if (signal.from === remoteUserId) {
            console.log(`[Caller] Processing signal: ${signal.type} from receiver`);
            // Signal from remote user - process it
            this.handleSignal(signal).catch((error) => {
              if (error?.name === "AbortError" || error?.code === "cancelled") {
                console.warn("Signal handling was aborted (non-critical)");
              } else {
                console.error("Error handling signal:", error);
              }
            });
          } else if (signal.to === remoteUserId && signal.from === this.userId) {
            // Signal we sent - just log for debugging
            console.log(`[Caller] Our signal confirmed: ${signal.type}`);
          }
        }
      });
    }, (error) => {
      if (error?.name === "AbortError" || error?.code === "cancelled") {
        console.warn("Signaling listener was aborted (call may have ended)");
      } else {
        console.error("Error in signaling listener:", error);
      }
    });

    this.signalingUnsubscribers.push(unsub);
  }

  /**
   * Setup signaling listeners for receiver - processes existing signals first
   */
  private setupSignalingListenersForReceiver(callerId: string): void {
    if (!db || !this.callId) {
      console.error("Cannot setup signaling listener: db or callId missing");
      return;
    }

    console.log("=== SETTING UP RECEIVER SIGNALING LISTENER ===");
    console.log("Listening for signals from caller:", callerId);
    console.log("Call ID:", this.callId);

    const signalsRef = collection(db, "calls", this.callId, "signals");
    
    // Use onSnapshot to get all existing signals AND listen for new ones
    const unsub = onSnapshot(signalsRef, async (snapshot) => {
      const changes = snapshot.docChanges();
      console.log(`Received ${changes.length} signal changes`);
      
      // Sort changes to process offer first, then ICE candidates
      const offerChanges = changes.filter(c => c.type === "added" && (c.doc.data() as CallSignal).type === "offer");
      const iceChanges = changes.filter(c => c.type === "added" && (c.doc.data() as CallSignal).type === "ice-candidate");
      const otherChanges = changes.filter(c => c.type === "added" && !["offer", "ice-candidate"].includes((c.doc.data() as CallSignal).type));
      
      console.log(`Signal breakdown: ${offerChanges.length} offers, ${iceChanges.length} ICE candidates, ${otherChanges.length} other`);
      
      // Process offers first
      for (const change of offerChanges) {
        const signal = change.doc.data() as CallSignal;
        console.log(`Offer signal - from: ${signal.from}, to: ${signal.to}, expected from: ${callerId}`);
        if (signal.from === callerId) {
          console.log("✓ Processing offer from caller");
          try {
            await this.handleSignal(signal);
            this.hasReceivedOffer = true;
          } catch (error: any) {
            if (error?.name !== "AbortError" && error?.code !== "cancelled") {
              console.error("Error handling offer:", error);
            }
          }
        } else {
          console.log("✗ Skipping offer - not from expected caller");
        }
      }
      
      // Then process ICE candidates
      for (const change of iceChanges) {
        const signal = change.doc.data() as CallSignal;
        if (signal.from === callerId) {
          try {
            await this.handleSignal(signal);
          } catch (error: any) {
            if (error?.name !== "AbortError" && error?.code !== "cancelled") {
              console.error("Error handling ICE candidate:", error);
            }
          }
        }
      }
      
      // Process other signals
      for (const change of otherChanges) {
        const signal = change.doc.data() as CallSignal;
        console.log(`Other signal type: ${signal.type}, from: ${signal.from}`);
        if (signal.from === callerId) {
          try {
            await this.handleSignal(signal);
          } catch (error: any) {
            if (error?.name !== "AbortError" && error?.code !== "cancelled") {
              console.error("Error handling signal:", error);
            }
          }
        } else if (signal.to === callerId && signal.from === this.userId) {
          console.log("Sent signal confirmed:", signal.type);
        }
      }
    }, (error) => {
      if (error?.name === "AbortError" || error?.code === "cancelled") {
        console.warn("Signaling listener was aborted (call may have ended)");
      } else {
        console.error("Error in signaling listener:", error);
      }
    });

    this.signalingUnsubscribers.push(unsub);
  }

  /**
   * Handle incoming signal
   */
  private async handleSignal(signal: CallSignal): Promise<void> {
    if (signal.from === this.userId) return; // Ignore own signals

    switch (signal.type) {
      case "offer":
        await this.handleOffer(signal.data, signal.from);
        break;
      case "answer":
        await this.handleAnswer(signal.data);
        // Update call status to active
        if (db && this.callId) {
          await updateDoc(doc(db, "calls", this.callId), {
            status: "active",
            connectedAt: serverTimestamp(),
          });
        }
        break;
      case "ice-candidate":
        await this.handleIceCandidate(signal.data);
        break;
      case "call-reject":
        this.updateStatus("rejected");
        await this.endCall();
        break;
      case "call-end":
        this.updateStatus("ended");
        await this.endCall();
        break;
    }
  }

  /**
   * Send signaling message
   */
  private async sendSignal(signal: Omit<CallSignal, "timestamp">): Promise<void> {
    if (!db || !this.callId) return;

    // Ensure data is serializable (convert RTCIceCandidate to plain object if needed)
    let serializedData = signal.data;
    if (signal.data && typeof signal.data === 'object' && signal.data !== null) {
      // Check if it's an RTCIceCandidate-like object (has candidate property and sdpMLineIndex)
      if ('candidate' in signal.data && ('sdpMLineIndex' in signal.data || 'sdpMid' in signal.data)) {
        // Serialize to plain object for Firestore
        serializedData = {
          candidate: (signal.data.candidate != null) ? String(signal.data.candidate) : null,
          sdpMLineIndex: (signal.data.sdpMLineIndex != null) ? signal.data.sdpMLineIndex : null,
          sdpMid: (signal.data.sdpMid != null) ? String(signal.data.sdpMid) : null,
          usernameFragment: (signal.data.usernameFragment != null) ? String(signal.data.usernameFragment) : null,
        };
      } else if (signal.data instanceof RTCIceCandidate || 
                 (typeof RTCIceCandidate !== 'undefined' && signal.data.constructor?.name === 'RTCIceCandidate')) {
        // Fallback: serialize RTCIceCandidate if it somehow wasn't serialized
        try {
          serializedData = {
            candidate: (signal.data.candidate != null) ? String(signal.data.candidate) : null,
            sdpMLineIndex: (signal.data.sdpMLineIndex != null) ? signal.data.sdpMLineIndex : null,
            sdpMid: (signal.data.sdpMid != null) ? String(signal.data.sdpMid) : null,
            usernameFragment: (signal.data.usernameFragment != null) ? String(signal.data.usernameFragment) : null,
          };
        } catch (e) {
          console.error("Error serializing RTCIceCandidate:", e);
          // Fallback to null if serialization fails
          serializedData = null;
        }
      }
    }

    const signalData: CallSignal = {
      ...signal,
      data: serializedData,
      timestamp: serverTimestamp() as Timestamp,
    };

    const signalRef = doc(db, "calls", this.callId, "signals", `${signal.type}_${Date.now()}`);
    await setDoc(signalRef, signalData);
  }

  /**
   * Reject call
   */
  async rejectCall(callId: string, callerId: string): Promise<void> {
    // Update call document
    if (db) {
      await setDoc(doc(db, "calls", callId), {
        status: "rejected",
        rejectedAt: serverTimestamp(),
      }, { merge: true });
    }

    await this.sendSignal({
      type: "call-reject",
      from: this.userId,
      to: callerId,
      data: { callId },
    });

    this.updateStatus("rejected");
    await this.cleanup();
  }

  /**
   * End call
   */
  async endCall(): Promise<void> {
    if (this.callId && this.remoteUserId && db) {
      // Update call document
      await setDoc(doc(db, "calls", this.callId), {
        status: "ended",
        endedAt: serverTimestamp(),
      }, { merge: true });

      await this.sendSignal({
        type: "call-end",
        from: this.userId,
        to: this.remoteUserId,
        data: { callId: this.callId },
      });
    }

    this.updateStatus("ended");
    await this.cleanup();

    if (this.onCallEnd) {
      this.onCallEnd();
    }
  }

  /**
   * Toggle mute
   * @returns boolean - true if audio is now enabled (unmuted), false if disabled (muted)
   */
  toggleMute(): boolean {
    if (!this.localStream) return false;

    const audioTracks = this.localStream.getAudioTracks();
    if (audioTracks.length > 0 && audioTracks[0]) {
      // Toggle the enabled state
      audioTracks[0].enabled = !audioTracks[0].enabled;
      // Return the new enabled state (true = unmuted, false = muted)
      return audioTracks[0].enabled;
    }
    return false;
  }

  /**
   * Toggle video
   * @returns boolean - true if video is now enabled (on), false if disabled (off)
   */
  toggleVideo(): boolean {
    if (!this.localStream) return false;

    const videoTracks = this.localStream.getVideoTracks();
    if (videoTracks.length > 0 && videoTracks[0]) {
      // Toggle the enabled state
      videoTracks[0].enabled = !videoTracks[0].enabled;
      // Return the new enabled state (true = video on, false = video off)
      return videoTracks[0].enabled;
    }
    return false;
  }

  /**
   * Get local stream
   */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /**
   * Get remote stream
   */
  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  /**
   * Get call ID
   */
  getCallId(): string | null {
    return this.callId;
  }

  /**
   * Get call status
   */
  getStatus(): CallStatus {
    return this.callStatus;
  }

  /**
   * Update status
   */
  private updateStatus(status: CallStatus): void {
    this.callStatus = status;
    
    // Clear connection timeout when call becomes active or ends
    if ((status === "active" || status === "ended" || status === "rejected" || status === "missed") && this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    if (this.onStatusChange) {
      this.onStatusChange(status);
    }
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    // Prevent double cleanup
    if (this.isCleaningUp) {
      console.log("Cleanup already in progress, skipping");
      return;
    }
    this.isCleaningUp = true;

    try {
      // Clear connection timeout
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }

      // Stop all tracks
      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (e) {
            console.warn("Error stopping local track:", e);
          }
        });
        this.localStream = null;
      }

      if (this.remoteStream) {
        this.remoteStream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (e) {
            console.warn("Error stopping remote track:", e);
          }
        });
        this.remoteStream = null;
      }

      // Close peer connection
      if (this.peerConnection) {
        // Remove event handlers to prevent callbacks during cleanup
        this.peerConnection.ontrack = null;
        this.peerConnection.onicecandidate = null;
        this.peerConnection.oniceconnectionstatechange = null;
        this.peerConnection.onconnectionstatechange = null;
        this.peerConnection.onicegatheringstatechange = null;
        
        try {
          this.peerConnection.close();
        } catch (e) {
          console.warn("Error closing peer connection:", e);
        }
        this.peerConnection = null;
      }

      // Unsubscribe from signaling
      this.signalingUnsubscribers.forEach((unsub) => {
        try {
          unsub();
        } catch (e) {
          console.warn("Error unsubscribing from signaling:", e);
        }
      });
      this.signalingUnsubscribers = [];

      // Clear pending ICE candidates
      this.pendingIceCandidates = [];

      // Clean up Firestore call document after a delay
      const callIdToCleanup = this.callId;
      if (callIdToCleanup && db) {
        setTimeout(async () => {
          try {
            const callRef = doc(db, "calls", callIdToCleanup);
            await deleteDoc(callRef);
          } catch (error) {
            // Ignore errors - document might already be deleted
            console.log("Call document cleanup:", error);
          }
        }, 5000);
      }

      this.callId = null;
      this.remoteUserId = null;
      this.hasReceivedOffer = false;
      this.updateStatus("idle");
    } finally {
      this.isCleaningUp = false;
    }
  }
}
