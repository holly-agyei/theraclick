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
  private signalingUnsubscribers: (() => void)[] = [];
  private onStatusChange: ((status: CallStatus) => void) | null = null;
  private onRemoteStream: ((stream: MediaStream) => void) | null = null;
  private onCallEnd: (() => void) | null = null;

  // STUN/TURN servers configuration
  private getRTCConfig(): RTCConfiguration {
    const iceServers: RTCIceServer[] = [
      // Free public STUN servers (always included)
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
    ];

    // Add TURN servers if configured (optional, for better connectivity behind NATs)
    const turnServerUrl = typeof window !== "undefined" 
      ? (window as any).__TURN_SERVER_URL__ || process.env.NEXT_PUBLIC_TURN_SERVER_URL
      : process.env.NEXT_PUBLIC_TURN_SERVER_URL;
    
    const turnUsername = typeof window !== "undefined"
      ? (window as any).__TURN_USERNAME__ || process.env.NEXT_PUBLIC_TURN_USERNAME
      : process.env.NEXT_PUBLIC_TURN_USERNAME;
    
    const turnCredential = typeof window !== "undefined"
      ? (window as any).__TURN_CREDENTIAL__ || process.env.NEXT_PUBLIC_TURN_CREDENTIAL
      : process.env.NEXT_PUBLIC_TURN_CREDENTIAL;

    if (turnServerUrl) {
      iceServers.push({
        urls: turnServerUrl,
        username: turnUsername || undefined,
        credential: turnCredential || undefined,
      });
    }

    return { iceServers };
  }

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Set callbacks
   */
  setCallbacks(callbacks: {
    onStatusChange?: (status: CallStatus) => void;
    onRemoteStream?: (stream: MediaStream) => void;
    onCallEnd?: () => void;
  }) {
    this.onStatusChange = callbacks.onStatusChange || null;
    this.onRemoteStream = callbacks.onRemoteStream || null;
    this.onCallEnd = callbacks.onCallEnd || null;
  }

  /**
   * Initialize call - start calling another user
   */
  async initiateCall(receiverId: string, type: CallType = "voice"): Promise<string> {
    if (this.callId) {
      throw new Error("A call is already in progress");
    }

    this.callType = type;
    this.remoteUserId = receiverId;
    this.callId = `call_${this.userId}_${receiverId}_${Date.now()}`;

    try {
      // Get local media stream
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: type === "video",
      };
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Create peer connection
      this.peerConnection = new RTCPeerConnection(this.getRTCConfig());

      // Add local tracks to peer connection
      this.localStream.getTracks().forEach((track) => {
        if (this.localStream && this.peerConnection) {
          this.peerConnection.addTrack(track, this.localStream);
        }
      });

      // Handle remote stream
      this.peerConnection.ontrack = (event) => {
        this.remoteStream = event.streams[0];
        if (this.onRemoteStream) {
          this.onRemoteStream(this.remoteStream);
        }
      };

      // Handle ICE connection state changes
      this.peerConnection.oniceconnectionstatechange = () => {
        const state = this.peerConnection?.iceConnectionState;
        console.log("ICE Connection State:", state);
        
        if (state === "failed" || state === "disconnected") {
          console.error("ICE connection failed or disconnected");
          // Try to restart ICE
          if (this.peerConnection && state === "failed") {
            this.peerConnection.restartIce();
          }
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

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.callId && db) {
          this.sendSignal({
            type: "ice-candidate",
            from: this.userId,
            to: receiverId,
            data: event.candidate,
          });
        } else if (!event.candidate) {
          console.log("All ICE candidates have been sent");
        }
      };

      // Create offer
      const offer = await this.peerConnection.createOffer();
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

      // Send call request
      await this.sendSignal({
        type: "call-request",
        from: this.userId,
        to: receiverId,
        data: { callId: this.callId, callType: type },
      });

      // Send offer
      await this.sendSignal({
        type: "offer",
        from: this.userId,
        to: receiverId,
        data: offer,
      });

      // Listen for answer and ICE candidates
      this.setupSignalingListeners(receiverId);

      this.updateStatus("ringing");

      // Set timeout for connection (30 seconds)
      setTimeout(() => {
        if (this.callStatus === "ringing" || this.callStatus === "connecting") {
          console.warn("Call connection timeout");
          this.endCall();
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
    if (this.callId) {
      throw new Error("A call is already in progress");
    }

    this.callId = callId;
    this.remoteUserId = callerId;
    this.callType = type;

    try {
      // Get local media stream
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: type === "video",
      };
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Create peer connection
      this.peerConnection = new RTCPeerConnection(this.getRTCConfig());

      // Add local tracks
      this.localStream.getTracks().forEach((track) => {
        if (this.localStream && this.peerConnection) {
          this.peerConnection.addTrack(track, this.localStream);
        }
      });

      // Handle remote stream
      this.peerConnection.ontrack = (event) => {
        this.remoteStream = event.streams[0];
        if (this.onRemoteStream) {
          this.onRemoteStream(this.remoteStream);
        }
      };

      // Handle ICE connection state changes
      this.peerConnection.oniceconnectionstatechange = () => {
        const state = this.peerConnection?.iceConnectionState;
        console.log("ICE Connection State:", state);
        
        if (state === "failed" || state === "disconnected") {
          console.error("ICE connection failed or disconnected");
          if (this.peerConnection && state === "failed") {
            this.peerConnection.restartIce();
          }
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

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.callId && db) {
          this.sendSignal({
            type: "ice-candidate",
            from: this.userId,
            to: callerId,
            data: event.candidate,
          });
        } else if (!event.candidate) {
          console.log("All ICE candidates have been sent");
        }
      };

      // Listen for offer and ICE candidates
      this.setupSignalingListeners(callerId);

      // Update call document
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
    if (!this.peerConnection) {
      console.error("No peer connection when handling offer");
      return;
    }

    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      console.log("Remote description set successfully");

      // Add any pending ICE candidates
      for (const candidate of this.pendingIceCandidates) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn("Error adding pending ICE candidate:", e);
        }
      }
      this.pendingIceCandidates = [];

      // Create answer
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      console.log("Local description set successfully");

      // Send answer
      await this.sendSignal({
        type: "answer",
        from: this.userId,
        to: callerId,
        data: answer,
      });

      this.updateStatus("connecting");
    } catch (error) {
      console.error("Error handling offer:", error);
      throw error;
    }
  }

  /**
   * Handle incoming answer
   */
  private async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) {
      console.error("No peer connection when handling answer");
      return;
    }

    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      console.log("Remote description (answer) set successfully");
      this.updateStatus("connecting");
      // Status will be updated to "active" when connection state changes
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

    try {
      // Check if remote description is set
      if (!this.peerConnection.remoteDescription) {
        console.warn("Remote description not set yet, queuing ICE candidate");
        // Queue the candidate to add later
        this.pendingIceCandidates.push(candidate);
        return;
      }
      
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      console.log("ICE candidate added successfully");
    } catch (error) {
      console.error("Error adding ICE candidate:", error);
      // Don't throw - ICE candidates can fail and connection might still work
    }
  }

  /**
   * Setup signaling listeners
   */
  private setupSignalingListeners(remoteUserId: string): void {
    if (!db || !this.callId) return;

    // Listen for signals from remote user
    const signalsRef = collection(db, "calls", this.callId, "signals");
    
    const unsub = onSnapshot(signalsRef, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const signal = change.doc.data() as CallSignal;
          
          // Only process signals from/to the remote user
          if (signal.from === remoteUserId || signal.to === remoteUserId) {
            this.handleSignal(signal).catch((error) => {
              console.error("Error handling signal:", error);
            });
          }
        }
      });
    }, (error) => {
      console.error("Error in signaling listener:", error);
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

    const signalData: CallSignal = {
      ...signal,
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
   */
  toggleMute(): boolean {
    if (!this.localStream) return false;

    const audioTracks = this.localStream.getAudioTracks();
    if (audioTracks.length > 0) {
      const isMuted = !audioTracks[0].enabled;
      audioTracks[0].enabled = isMuted;
      return isMuted;
    }
    return false;
  }

  /**
   * Toggle video
   */
  toggleVideo(): boolean {
    if (!this.localStream) return false;

    const videoTracks = this.localStream.getVideoTracks();
    if (videoTracks.length > 0) {
      const isVideoOff = !videoTracks[0].enabled;
      videoTracks[0].enabled = isVideoOff;
      return isVideoOff;
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
    if (this.onStatusChange) {
      this.onStatusChange(status);
    }
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    // Stop all tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((track) => track.stop());
      this.remoteStream = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Unsubscribe from signaling
    this.signalingUnsubscribers.forEach((unsub) => unsub());
    this.signalingUnsubscribers = [];

    // Clear pending ICE candidates
    this.pendingIceCandidates = [];

    // Clean up Firestore call document after a delay
    if (this.callId && db) {
      setTimeout(async () => {
        try {
          const callRef = doc(db, "calls", this.callId!);
          await deleteDoc(callRef);
        } catch (error) {
          console.error("Error cleaning up call document:", error);
        }
      }, 5000);
    }

    this.callId = null;
    this.remoteUserId = null;
    this.updateStatus("idle");
  }
}
