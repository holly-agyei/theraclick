"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { WebRTCCallManager, CallStatus, CallType } from "@/lib/webrtc";
import { useAuth } from "./auth";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";

interface CallContextValue {
  // Call state
  isInCall: boolean;
  callStatus: CallStatus;
  callType: CallType | null;
  remoteUserId: string | null;
  remoteUserName: string | null;
  remoteUserAvatar: string | null;
  isCaller: boolean;
  
  // Media streams
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  
  // Call controls
  isMuted: boolean;
  isVideoOff: boolean;
  
  // Actions
  initiateCall: (receiverId: string, type: CallType) => Promise<void>;
  acceptCall: (callId: string, callerId: string, type: CallType) => Promise<void>;
  rejectCall: (callId: string, callerId: string) => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => void;
  toggleVideo: () => void;
  
  // Incoming call
  incomingCall: {
    callId: string;
    callerId: string;
    callerName: string;
    callerAvatar: string | null;
    callType: CallType;
  } | null;
}

const CallContext = createContext<CallContextValue | null>(null);

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const [isInCall, setIsInCall] = useState(false);
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [callType, setCallType] = useState<CallType | null>(null);
  const [remoteUserId, setRemoteUserId] = useState<string | null>(null);
  const [remoteUserName, setRemoteUserName] = useState<string | null>(null);
  const [remoteUserAvatar, setRemoteUserAvatar] = useState<string | null>(null);
  const [isCaller, setIsCaller] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [incomingCall, setIncomingCall] = useState<CallContextValue["incomingCall"]>(null);
  
  const callManagerRef = useRef<WebRTCCallManager | null>(null);
  const incomingCallListenerRef = useRef<(() => void) | null>(null);
  const incomingCallDocListenerRef = useRef<(() => void) | null>(null);

  // Initialize call manager
  useEffect(() => {
    if (profile?.uid) {
      callManagerRef.current = new WebRTCCallManager(profile.uid);
      
      callManagerRef.current.setCallbacks({
        onStatusChange: (status) => {
          console.log("Call status changed:", status);
          setCallStatus(status);
          setIsInCall(status === "active" || status === "connecting" || status === "ringing");
        },
        onLocalStream: (stream) => {
          console.log("Local stream received via callback");
          setLocalStream(stream);
        },
        onRemoteStream: (stream) => {
          console.log("Remote stream received via callback");
          setRemoteStream(stream);
        },
        onCallEnd: () => {
          console.log("Call ended");
          setIsInCall(false);
          setCallStatus("idle");
          setCallType(null);
          setRemoteUserId(null);
          setRemoteUserName(null);
          setRemoteUserAvatar(null);
          setIsCaller(false);
          setLocalStream(null);
          setRemoteStream(null);
          setIsMuted(false);
          setIsVideoOff(false);
        },
      });
    }

    return () => {
      if (callManagerRef.current) {
        callManagerRef.current.endCall().catch(console.error);
      }
    };
  }, [profile?.uid]);

  // Listen for incoming calls
  useEffect(() => {
    if (!profile?.uid || !db) return;

    // Don't listen if already in a call or have an incoming call
    if (isInCall || incomingCall) {
      return;
    }

    // Listen for call requests directed to this user
    const callsRef = collection(db, "calls");
    const q = query(
      callsRef,
      where("receiverId", "==", profile.uid),
      where("status", "==", "ringing")
    );

    let isMounted = true;

    const unsub = onSnapshot(q, async (snapshot) => {
      for (const change of snapshot.docChanges()) {
        // Only process if still mounted and not in a call
        if (!isMounted) return;
        
        if (change.type === "added") {
          const callData = change.doc.data();
          const callId = change.doc.id;
          
          // Get caller info
          try {
            const callerDoc = await getDoc(doc(db, "users", callData.callerId));
            if (!isMounted) return; // Check again after async operation
            
            const callerData = callerDoc.data();
            
            setIncomingCall({
              callId,
              callerId: callData.callerId,
              callerName: callerData?.fullName || "Unknown",
              callerAvatar: callerData?.profilePicture || callerData?.avatar || null,
              callType: callData.callType || "voice",
            });
            
            // Only process the first incoming call
            break;
          } catch (error) {
            console.error("Error fetching caller info:", error);
          }
        }
      }
    }, (error) => {
      // Handle Firestore listener errors gracefully
      if (error?.code !== "cancelled") {
        console.error("Error in incoming call listener:", error);
      }
    });

    incomingCallListenerRef.current = unsub;

    return () => {
      isMounted = false;
      if (incomingCallListenerRef.current) {
        incomingCallListenerRef.current();
        incomingCallListenerRef.current = null;
      }
    };
  }, [profile?.uid, isInCall, incomingCall]);

  // Listen for incoming call status changes (caller cancelled, etc.)
  useEffect(() => {
    if (!incomingCall || !db) return;

    const callDocRef = doc(db, "calls", incomingCall.callId);
    
    const unsub = onSnapshot(callDocRef, (snapshot) => {
      if (!snapshot.exists()) {
        // Call document was deleted - caller cancelled
        console.log("Incoming call cancelled by caller");
        setIncomingCall(null);
        return;
      }
      
      const callData = snapshot.data();
      if (callData?.status === "ended" || callData?.status === "rejected" || callData?.status === "missed") {
        // Call was ended/rejected/missed
        console.log("Incoming call ended with status:", callData?.status);
        setIncomingCall(null);
      }
    }, (error) => {
      if (error?.code !== "cancelled") {
        console.error("Error listening to incoming call status:", error);
      }
    });

    incomingCallDocListenerRef.current = unsub;

    return () => {
      if (incomingCallDocListenerRef.current) {
        incomingCallDocListenerRef.current();
        incomingCallDocListenerRef.current = null;
      }
    };
  }, [incomingCall]);

  const initiateCall = useCallback(async (receiverId: string, type: CallType) => {
    if (!callManagerRef.current) {
      console.error("Call manager not initialized");
      alert("Call feature not ready. Please refresh the page.");
      return;
    }
    
    if (!profile?.uid) {
      console.error("User not logged in");
      alert("Please log in to make calls.");
      return;
    }

    try {
      console.log("Initiating call to:", receiverId, "Type:", type);
      
      // Set call state immediately
      setIsCaller(true);
      setCallType(type);
      setRemoteUserId(receiverId);
      setIsInCall(true);
      setCallStatus("ringing");
      
      // Get receiver info
      if (db) {
        try {
          const receiverDoc = await getDoc(doc(db, "users", receiverId));
          const receiverData = receiverDoc.data();
          setRemoteUserName(receiverData?.fullName || "Unknown");
          setRemoteUserAvatar(receiverData?.profilePicture || receiverData?.avatar || null);
        } catch (error) {
          console.error("Error fetching receiver info:", error);
        }
      }

      const callId = await callManagerRef.current.initiateCall(receiverId, type);
      console.log("Call initiated, callId:", callId);
      
      const stream = callManagerRef.current.getLocalStream();
      if (stream) {
        setLocalStream(stream);
        console.log("Local stream set");
      } else {
        console.warn("No local stream available");
      }
    } catch (error: any) {
      console.error("Error initiating call:", error);
      alert(`Failed to start call: ${error?.message || "Unknown error"}`);
      // Reset all state on error
      setIsCaller(false);
      setCallType(null);
      setRemoteUserId(null);
      setRemoteUserName(null);
      setRemoteUserAvatar(null);
      setIsInCall(false);
      setCallStatus("idle");
    }
  }, [profile?.uid]);

  const acceptCall = useCallback(async (callId: string, callerId: string, type: CallType) => {
    if (!callManagerRef.current) {
      console.error("Call manager not initialized");
      alert("Call feature not ready. Please refresh the page.");
      return;
    }
    
    if (!profile?.uid) {
      console.error("User not logged in");
      alert("Please log in to accept calls.");
      return;
    }

    try {
      console.log("Accepting call:", callId, "From:", callerId, "Type:", type);
      
      // Clear incoming call state FIRST to prevent re-triggering
      setIncomingCall(null);
      
      // Set call state
      setIsCaller(false);
      setCallType(type);
      setRemoteUserId(callerId);
      setIsInCall(true);
      setCallStatus("connecting");
      
      // Get caller info
      if (db) {
        try {
          const callerDoc = await getDoc(doc(db, "users", callerId));
          const callerData = callerDoc.data();
          setRemoteUserName(callerData?.fullName || "Unknown");
          setRemoteUserAvatar(callerData?.profilePicture || callerData?.avatar || null);
        } catch (error) {
          console.error("Error fetching caller info:", error);
        }
      }

      await callManagerRef.current.acceptCall(callId, callerId, type);
      console.log("Call accepted successfully");
      
      const stream = callManagerRef.current.getLocalStream();
      if (stream) {
        setLocalStream(stream);
        console.log("Local stream set");
      } else {
        console.warn("No local stream available");
      }
    } catch (error: any) {
      console.error("Error accepting call:", error);
      alert(`Failed to accept call: ${error?.message || "Unknown error"}`);
      // Reset all state on error
      setIncomingCall(null);
      setIsInCall(false);
      setCallStatus("idle");
      setCallType(null);
      setRemoteUserId(null);
      setRemoteUserName(null);
      setRemoteUserAvatar(null);
    }
  }, [profile?.uid]);

  const rejectCall = useCallback(async (callId: string, callerId: string) => {
    if (!callManagerRef.current) return;

    try {
      await callManagerRef.current.rejectCall(callId, callerId);
      setIncomingCall(null);
    } catch (error: any) {
      console.error("Error rejecting call:", error);
    }
  }, []);

  const endCall = useCallback(async () => {
    if (!callManagerRef.current) return;

    try {
      await callManagerRef.current.endCall();
    } catch (error: any) {
      console.error("Error ending call:", error);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (!callManagerRef.current) return;
    const isNowEnabled = callManagerRef.current.toggleMute();
    // If audio is enabled, we're NOT muted. If disabled, we ARE muted.
    setIsMuted(!isNowEnabled);
  }, []);

  const toggleVideo = useCallback(() => {
    if (!callManagerRef.current) return;
    const isNowEnabled = callManagerRef.current.toggleVideo();
    // If video is enabled, video is NOT off. If disabled, video IS off.
    setIsVideoOff(!isNowEnabled);
  }, []);

  const value: CallContextValue = {
    isInCall,
    callStatus,
    callType,
    remoteUserId,
    remoteUserName,
    remoteUserAvatar,
    isCaller,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    incomingCall,
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within <CallProvider />");
  return ctx;
}
