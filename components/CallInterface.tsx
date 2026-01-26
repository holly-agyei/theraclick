"use client";

import React, { useEffect, useRef } from "react";
import { useCall } from "@/context/callContext";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CallInterface() {
  const {
    isInCall,
    callStatus,
    callType,
    remoteUserName,
    remoteUserAvatar,
    isCaller,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    endCall,
    toggleMute,
    toggleVideo,
  } = useCall();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Update video elements when streams change
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [localStream, remoteStream]);

  if (!isInCall) return null;

  const isVideoCall = callType === "video";
  const isRinging = callStatus === "ringing";
  const isConnecting = callStatus === "connecting";
  const isActive = callStatus === "active";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm">
      {/* Video containers */}
      <div className="relative h-full w-full">
        {/* Remote video (main) */}
        {isVideoCall && (
          <div className="absolute inset-0">
            {remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="h-full w-full object-cover"
                muted={false}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
                {remoteUserAvatar ? (
                  <img
                    src={remoteUserAvatar}
                    alt={remoteUserName || "User"}
                    className="h-32 w-32 rounded-full object-cover border-4 border-white/20"
                  />
                ) : (
                  <div className="flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-4xl font-bold text-white">
                    {remoteUserName?.[0]?.toUpperCase() || "U"}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Local video (picture-in-picture) */}
        {isVideoCall && isActive && localStream && (
          <div className="absolute bottom-24 right-4 h-48 w-32 overflow-hidden rounded-lg border-2 border-white/30 bg-black shadow-2xl">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              className="h-full w-full object-cover scale-x-[-1]"
              muted
            />
          </div>
        )}

        {/* Audio call UI */}
        {!isVideoCall && (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 p-8">
            <div className="mb-8">
              {remoteUserAvatar ? (
                <img
                  src={remoteUserAvatar}
                  alt={remoteUserName || "User"}
                  className="h-40 w-40 rounded-full object-cover border-4 border-white/30 shadow-2xl"
                />
              ) : (
                <div className="flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-6xl font-bold text-white shadow-2xl">
                  {remoteUserName?.[0]?.toUpperCase() || "U"}
                </div>
              )}
            </div>
            <h2 className="mb-2 text-2xl font-bold text-white">{remoteUserName || "Unknown"}</h2>
            <p className="text-gray-300">
              {isRinging && (isCaller ? "Calling..." : "Incoming call")}
              {isConnecting && "Connecting..."}
              {isActive && "Connected"}
              {callStatus === "ended" && "Call ended"}
              {callStatus === "rejected" && "Call rejected"}
              {callStatus === "missed" && "Missed call"}
            </p>
            {isConnecting && (
              <p className="mt-2 text-xs text-gray-400">
                This may take a few seconds...
              </p>
            )}
          </div>
        )}

        {/* Call status overlay for video calls */}
        {isVideoCall && (
          <div className="absolute top-8 left-8 right-8 flex items-center justify-between">
            <div className="rounded-full bg-black/50 px-4 py-2 backdrop-blur-sm">
              <p className="text-sm font-medium text-white">
                {isRinging && (isCaller ? "Calling..." : "Incoming call")}
                {isConnecting && "Connecting..."}
                {isActive && remoteUserName}
              </p>
            </div>
          </div>
        )}

        {/* Call controls */}
        <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-4 px-8">
          {/* Mute button */}
          <Button
            onClick={toggleMute}
            size="lg"
            className={`h-14 w-14 rounded-full ${
              isMuted
                ? "bg-red-500 hover:bg-red-600"
                : "bg-white/20 hover:bg-white/30 backdrop-blur-sm"
            } border-2 border-white/30 text-white transition-all`}
          >
            {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </Button>

          {/* Video toggle (only for video calls) */}
          {isVideoCall && (
            <Button
              onClick={toggleVideo}
              size="lg"
              className={`h-14 w-14 rounded-full ${
                isVideoOff
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-white/20 hover:bg-white/30 backdrop-blur-sm"
              } border-2 border-white/30 text-white transition-all`}
            >
              {isVideoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
            </Button>
          )}

          {/* End call button */}
          <Button
            onClick={endCall}
            size="lg"
            className="h-14 w-14 rounded-full bg-red-500 hover:bg-red-600 border-2 border-white/30 text-white transition-all"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>

        {/* Ringing animation */}
        {isRinging && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-64 w-64 rounded-full border-4 border-blue-400/30 animate-ping" />
              <div className="absolute h-64 w-64 rounded-full border-4 border-blue-400/20 animate-ping" style={{ animationDelay: "0.5s" }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
