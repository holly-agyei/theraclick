"use client";

import React from "react";
import { useCall } from "@/context/callContext";
import { Phone, PhoneOff, Video, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";

export function IncomingCallNotification() {
  const { incomingCall, acceptCall, rejectCall } = useCall();

  if (!incomingCall) return null;

  const { callId, callerId, callerName, callerAvatar, callType } = incomingCall;
  const isVideoCall = callType === "video";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/20 bg-gradient-to-br from-gray-900 to-gray-800 p-8 shadow-2xl">
        {/* Caller info */}
        <div className="mb-6 text-center">
          {callerAvatar ? (
            <img
              src={callerAvatar}
              alt={callerName}
              className="mx-auto mb-4 h-24 w-24 rounded-full object-cover border-4 border-white/30"
            />
          ) : (
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-4xl font-bold text-white">
              {callerName[0]?.toUpperCase() || "U"}
            </div>
          )}
          <h3 className="mb-1 text-xl font-bold text-white">{callerName}</h3>
          <p className="text-sm text-gray-400">
            {isVideoCall ? "Incoming video call" : "Incoming voice call"}
          </p>
        </div>

        {/* Call type indicator */}
        <div className="mb-6 flex items-center justify-center gap-2 text-gray-300">
          {isVideoCall ? (
            <>
              <Video className="h-5 w-5" />
              <span className="text-sm">Video Call</span>
            </>
          ) : (
            <>
              <Mic className="h-5 w-5" />
              <span className="text-sm">Voice Call</span>
            </>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-4">
          <Button
            onClick={() => rejectCall(callId, callerId)}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white"
            size="lg"
          >
            <PhoneOff className="mr-2 h-5 w-5" />
            Decline
          </Button>
          <Button
            onClick={() => acceptCall(callId, callerId, callType)}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white"
            size="lg"
          >
            <Phone className="mr-2 h-5 w-5" />
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
