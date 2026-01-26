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

  // Initialize call manager
  useEffect(() => {
    if (profile?.uid) {
      callManagerRef.current = new WebRTCCallManager(profile.uid);
      
      callManagerRef.current.setCallbacks({
        onStatusChange: (status) => {
          setCallStatus(status);
          setIsInCall(status === "active" || status === "connecting" || status === "ringing");
        },
        onRemoteStream: (stream) => {
          setRemoteStream(stream);
        },
        onCallEnd: () => {
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
    if (!profile?.uid || !db || isInCall) return;

    // Listen for call requests directed to this user
    const callsRef = collection(db, "calls");
    const q = query(
      callsRef,
      where("receiverId", "==", profile.uid),
      where("status", "==", "ringing")
    );

    const unsub = onSnapshot(q, async (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === "added" && !isInCall && !incomingCall) {
          const callData = change.doc.data();
          const callId = change.doc.id;
          
          // Get caller info
          try {
            const callerDoc = await getDoc(doc(db, "users", callData.callerId));
            const callerData = callerDoc.data();
            
            setIncomingCall({
              callId,
              callerId: callData.callerId,
              callerName: callerData?.fullName || "Unknown",
              callerAvatar: callerData?.profilePicture || callerData?.avatar || null,
              callType: callData.callType || "voice",
            });
          } catch (error) {
            console.error("Error fetching caller info:", error);
          }
        }
      });
    });

    incomingCallListenerRef.current = unsub;

    return () => {
      if (incomingCallListenerRef.current) {
        incomingCallListenerRef.current();
      }
    };
  }, [profile?.uid, isInCall, incomingCall]);

  const initiateCall = useCallback(async (receiverId: string, type: CallType) => {
    if (!callManagerRef.current || !profile?.uid) return;

    try {
      setIsCaller(true);
      setCallType(type);
      setRemoteUserId(receiverId);
      
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
      const stream = callManagerRef.current.getLocalStream();
      if (stream) {
        setLocalStream(stream);
      }
    } catch (error: any) {
      console.error("Error initiating call:", error);
      throw error;
    }
  }, [profile?.uid]);

  const acceptCall = useCallback(async (callId: string, callerId: string, type: CallType) => {
    if (!callManagerRef.current || !profile?.uid) return;

    try {
      setIsCaller(false);
      setCallType(type);
      setRemoteUserId(callerId);
      setIncomingCall(null);
      
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
      const stream = callManagerRef.current.getLocalStream();
      if (stream) {
        setLocalStream(stream);
      }
    } catch (error: any) {
      console.error("Error accepting call:", error);
      throw error;
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
    const newMuteState = callManagerRef.current.toggleMute();
    setIsMuted(!newMuteState);
  }, []);

  const toggleVideo = useCallback(() => {
    if (!callManagerRef.current) return;
    const newVideoState = callManagerRef.current.toggleVideo();
    setIsVideoOff(!newVideoState);
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
