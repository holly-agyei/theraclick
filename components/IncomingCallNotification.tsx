"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useCall } from "@/context/callContext";
import { Phone, PhoneOff, Video, Mic } from "lucide-react";

// Generate a simple ringtone as a WAV data URL
function generateRingtoneDataUrl(): string {
  const sampleRate = 44100;
  const duration = 1.5; // seconds
  const numSamples = Math.floor(sampleRate * duration);
  
  // Create WAV header
  const numChannels = 1;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;
  
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  
  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, totalSize - 8, true);
  writeString(view, 8, 'WAVE');
  
  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true);  // audio format (PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  
  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);
  
  // Generate ringtone audio data (two-tone ring pattern)
  let offset = 44;
  const freq1 = 440; // A4
  const freq2 = 523; // C5
  
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;
    
    // Ring pattern: two quick beeps
    if ((t >= 0 && t < 0.2) || (t >= 0.4 && t < 0.6) || (t >= 1.0 && t < 1.2)) {
      // Dual-tone ring
      sample = Math.sin(2 * Math.PI * freq1 * t) * 0.3 + 
               Math.sin(2 * Math.PI * freq2 * t) * 0.3;
      
      // Apply envelope
      const envTime = t % 0.2;
      const attack = Math.min(envTime / 0.02, 1);
      const release = Math.max(0, 1 - (envTime - 0.15) / 0.05);
      sample *= attack * (envTime < 0.15 ? 1 : release);
    }
    
    // Convert to 16-bit integer
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    view.setInt16(offset, intSample, true);
    offset += 2;
  }
  
  // Convert to base64
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  
  return 'data:audio/wav;base64,' + btoa(binary);
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export function IncomingCallNotification() {
  const { incomingCall, acceptCall, rejectCall } = useCall();
  const [isVisible, setIsVisible] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [ringtoneUrl, setRingtoneUrl] = useState<string>('');

  // Generate ringtone on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setRingtoneUrl(generateRingtoneDataUrl());
    }
  }, []);

  // Play ringtone when call comes in
  useEffect(() => {
    if (!incomingCall || !ringtoneUrl) {
      // Stop audio if call ends
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setIsVisible(false);
      return;
    }

    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 50);

    // Create audio element for ringtone
    const audio = new Audio(ringtoneUrl);
    audio.loop = true;
    audio.volume = 1.0;
    audioRef.current = audio;

    // Try to play - mobile may block this
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.warn("Auto-play was blocked:", error);
        // Try again with user interaction on the page
      });
    }

    return () => {
      clearTimeout(timer);
      audio.pause();
      audio.src = '';
    };
  }, [incomingCall, ringtoneUrl]);

  // Vibrate on mobile
  useEffect(() => {
    if (!incomingCall) return;
    
    if ('vibrate' in navigator) {
      const vibratePattern = () => {
        try {
          navigator.vibrate([500, 200, 500, 200, 500]);
        } catch (e) {}
      };
      
      vibratePattern();
      const interval = setInterval(vibratePattern, 2000);
      
      return () => {
        clearInterval(interval);
        try {
          navigator.vibrate(0);
        } catch (e) {}
      };
    }
  }, [incomingCall]);

  // Try to play sound on any user interaction (helps with mobile)
  const tryPlaySound = useCallback(() => {
    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.play().catch(() => {});
    }
  }, []);

  if (!incomingCall) return null;

  const { callId, callerId, callerName, callerAvatar, callType } = incomingCall;
  const isVideoCall = callType === "video";

  const handleAccept = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    acceptCall(callId, callerId, callType);
  };

  const handleReject = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    rejectCall(callId, callerId);
  };

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={tryPlaySound}
      onTouchStart={tryPlaySound}
    >
      {/* Animated background rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <div className="h-[500px] w-[500px] rounded-full border border-green-500/10 animate-ping" style={{ animationDuration: '2s' }} />
        <div className="absolute h-[400px] w-[400px] rounded-full border border-green-500/15 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.4s' }} />
        <div className="absolute h-[300px] w-[300px] rounded-full border border-green-500/20 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.8s' }} />
      </div>

      {/* Card */}
      <div className={`relative w-full max-w-sm mx-auto rounded-3xl bg-gradient-to-b from-slate-800/95 to-slate-900/95 backdrop-blur-xl p-8 shadow-2xl ring-1 ring-white/10 transition-all duration-500 ${
        isVisible ? 'translate-y-0 scale-100' : 'translate-y-8 scale-95'
      }`}>
        
        {/* Call type badge */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <div className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold shadow-lg ${
            isVideoCall 
              ? 'bg-blue-500 text-white' 
              : 'bg-green-500 text-white'
          }`}>
            {isVideoCall ? (
              <>
                <Video className="h-3.5 w-3.5" />
                <span>Video Call</span>
              </>
            ) : (
              <>
                <Mic className="h-3.5 w-3.5" />
                <span>Voice Call</span>
              </>
            )}
          </div>
        </div>

        {/* "Incoming Call" text with tap hint for mobile */}
        <p className="text-center text-sm text-gray-400 mb-4 animate-pulse">
          Incoming call...
          <span className="block text-xs mt-1 text-gray-500">Tap anywhere for sound</span>
        </p>

        {/* Avatar with animated ring */}
        <div className="relative mx-auto mb-5 w-fit">
          {/* Pulsing ring */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-32 w-32 rounded-full bg-green-500/20 animate-ping" style={{ animationDuration: '1.2s' }} />
          </div>
          
          {callerAvatar ? (
            <img
              src={callerAvatar}
              alt={callerName}
              className="relative mx-auto h-28 w-28 rounded-full object-cover ring-4 ring-white/20 shadow-xl"
            />
          ) : (
            <div className="relative mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-5xl font-bold text-white ring-4 ring-white/20 shadow-xl">
              {callerName[0]?.toUpperCase() || "U"}
            </div>
          )}
        </div>

        {/* Caller name */}
        <h3 className="text-center text-2xl font-bold text-white mb-8">{callerName}</h3>

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-12">
          {/* Decline button */}
          <div className="text-center">
            <button
              onClick={handleReject}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/40 transition-all active:scale-95"
            >
              <PhoneOff className="h-7 w-7 text-white" />
            </button>
            <p className="mt-3 text-xs text-gray-400 font-medium">Decline</p>
          </div>

          {/* Accept button */}
          <div className="text-center">
            <button
              onClick={handleAccept}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/40 transition-all active:scale-95 animate-bounce"
              style={{ animationDuration: '0.8s' }}
            >
              <Phone className="h-7 w-7 text-white" />
            </button>
            <p className="mt-3 text-xs text-gray-400 font-medium">Accept</p>
          </div>
        </div>
      </div>
    </div>
  );
}
