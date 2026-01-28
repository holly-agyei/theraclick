"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useCall } from "@/context/callContext";
import { 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Volume2, 
  VolumeX,
  SwitchCamera,
  Maximize2,
  Minimize2,
  Wifi,
  WifiOff
} from "lucide-react";

// Generate a ringback tone as a WAV data URL (what caller hears while waiting)
function generateRingbackToneDataUrl(): string {
  const sampleRate = 44100;
  const duration = 4; // seconds - longer for outgoing
  const numSamples = Math.floor(sampleRate * duration);
  
  const numChannels = 1;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;
  
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  
  // WAV header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, totalSize - 8, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);
  
  // Generate ringback tone (standard US ringback: 440Hz + 480Hz, 2s on, 4s off)
  let offset = 44;
  const freq1 = 440;
  const freq2 = 480;
  
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;
    
    // Ring pattern: 2 seconds on, 2 seconds off (within 4 second loop)
    if (t < 2) {
      sample = (Math.sin(2 * Math.PI * freq1 * t) + Math.sin(2 * Math.PI * freq2 * t)) * 0.15;
      
      // Fade in/out
      if (t < 0.05) sample *= t / 0.05;
      if (t > 1.95) sample *= (2 - t) / 0.05;
    }
    
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    view.setInt16(offset, intSample, true);
    offset += 2;
  }
  
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  
  return 'data:audio/wav;base64,' + btoa(binary);
}

// Custom hook for outgoing call ringtone
function useRingtone() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [ringbackUrl, setRingbackUrl] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setRingbackUrl(generateRingbackToneDataUrl());
    }
  }, []);

  const play = useCallback((isOutgoing: boolean) => {
    if (!ringbackUrl) return;
    
    try {
      const audio = new Audio(ringbackUrl);
      audio.loop = true;
      audio.volume = 0.5;
      audioRef.current = audio;
      
      audio.play().catch(err => {
        console.warn("Could not auto-play ringback tone:", err);
      });
    } catch (e) {
      console.warn("Could not play ringtone:", e);
    }
  }, [ringbackUrl]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
  }, []);

  return { play, stop };
}

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
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  
  const [callDuration, setCallDuration] = useState(0);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const ringtone = useRingtone();

  const isVideoCall = callType === "video";
  const isRinging = callStatus === "ringing";
  const isConnecting = callStatus === "connecting";
  const isActive = callStatus === "active";

  // Play ringtone
  useEffect(() => {
    if (isRinging) {
      ringtone.play(isCaller);
    } else {
      ringtone.stop();
    }
    return () => ringtone.stop();
  }, [isRinging, isCaller, ringtone]);

  // Handle local video
  useEffect(() => {
    const video = localVideoRef.current;
    if (!video || !localStream) return;

    video.srcObject = localStream;
    video.muted = true;
    video.play().catch(console.error);

    return () => {
      video.srcObject = null;
    };
  }, [localStream]);

  // Handle remote video/audio - CRITICAL FIX
  useEffect(() => {
    const video = remoteVideoRef.current;
    const audio = remoteAudioRef.current;

    if (!remoteStream) {
      setHasRemoteVideo(false);
      return;
    }

    console.log("Remote stream received:", {
      videoTracks: remoteStream.getVideoTracks().length,
      audioTracks: remoteStream.getAudioTracks().length,
      active: remoteStream.active
    });

    // Check if there are video tracks
    const videoTracks = remoteStream.getVideoTracks();
    setHasRemoteVideo(videoTracks.length > 0 && videoTracks.some(t => t.enabled && t.readyState === 'live'));

    // Set up video element
    if (video && isVideoCall) {
      video.srcObject = remoteStream;
      
      // Listen for video track changes
      video.onloadedmetadata = () => {
        console.log("Remote video metadata loaded");
        video.play().then(() => {
          console.log("Remote video playing successfully");
          setHasRemoteVideo(true);
        }).catch(err => {
          console.error("Error playing remote video:", err);
        });
      };

      // Also try to play immediately
      video.play().catch(() => {});
    }

    // Set up audio element
    if (audio) {
      audio.srcObject = remoteStream;
      audio.play().catch(console.error);
    }

    // Monitor track events
    remoteStream.onaddtrack = (e) => {
      console.log("Track added:", e.track.kind);
      if (e.track.kind === 'video') {
        setHasRemoteVideo(true);
        if (video) {
          video.srcObject = remoteStream;
          video.play().catch(console.error);
        }
      }
    };

    return () => {
      if (video) video.srcObject = null;
      if (audio) audio.srcObject = null;
    };
  }, [remoteStream, isVideoCall]);

  // Call duration timer
  useEffect(() => {
    if (!isActive) {
      setCallDuration(0);
      return;
    }
    
    const interval = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isActive]);

  // Auto-hide controls
  useEffect(() => {
    if (!isVideoCall || !isActive) {
      setShowControls(true);
      return;
    }
    
    const timer = setTimeout(() => setShowControls(false), 4000);
    return () => clearTimeout(timer);
  }, [isVideoCall, isActive, showControls]);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    if (isRinging) return isCaller ? "Ringing..." : "Incoming call";
    if (isConnecting) return "Connecting...";
    if (isActive) return formatDuration(callDuration);
    return callStatus;
  };

  const toggleSpeaker = () => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = isSpeakerOn;
      setIsSpeakerOn(!isSpeakerOn);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.error);
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(console.error);
      setIsFullscreen(false);
    }
  };

  const switchCamera = async () => {
    if (!localStream) return;
    
    try {
      const newMode = facingMode === 'user' ? 'environment' : 'user';
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newMode },
        audio: false
      });
      
      const newTrack = newStream.getVideoTracks()[0];
      const oldTrack = localStream.getVideoTracks()[0];
      
      if (oldTrack && newTrack) {
        oldTrack.stop();
        localStream.removeTrack(oldTrack);
        localStream.addTrack(newTrack);
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }
      }
      
      setFacingMode(newMode);
    } catch (err) {
      console.error("Error switching camera:", err);
    }
  };

  const isMobile = typeof window !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  if (!isInCall) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-black"
      onClick={() => isVideoCall && isActive && setShowControls(prev => !prev)}
    >
      {/* Audio element */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* VIDEO CALL */}
      {isVideoCall ? (
        <div className="relative h-full w-full">
          {/* Remote video - full screen */}
          <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover ${hasRemoteVideo && remoteStream ? '' : 'hidden'}`}
            />
            
            {/* Placeholder when no remote video */}
            {(!hasRemoteVideo || !remoteStream) && (
              <div className="text-center">
                {(isRinging || isConnecting) && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-64 h-64 rounded-full border-2 border-blue-500/30 animate-ping" style={{animationDuration: '1.5s'}} />
                    <div className="absolute w-48 h-48 rounded-full border-2 border-blue-500/40 animate-ping" style={{animationDuration: '1.5s', animationDelay: '0.3s'}} />
                  </div>
                )}
                
                {remoteUserAvatar ? (
                  <img src={remoteUserAvatar} alt="" className="w-32 h-32 sm:w-40 sm:h-40 rounded-full object-cover ring-4 ring-white/20 mx-auto" />
                ) : (
                  <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-5xl font-bold text-white ring-4 ring-white/20 mx-auto">
                    {remoteUserName?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <p className="mt-4 text-xl font-semibold text-white">{remoteUserName}</p>
                <p className="mt-2 text-gray-400">{getStatusText()}</p>
                
                {isActive && !hasRemoteVideo && (
                  <p className="mt-2 text-xs text-yellow-400">Camera may be off</p>
                )}
              </div>
            )}
          </div>

          {/* Local video PIP */}
          {localStream && (
            <div className={`absolute z-20 transition-all ${showControls ? 'top-4 right-4' : 'top-2 right-2'}`}>
              <div className="w-24 h-36 sm:w-32 sm:h-44 rounded-xl overflow-hidden bg-slate-800 ring-2 ring-white/20 shadow-xl">
                {!isVideoOff ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <VideoOff className="w-8 h-8 text-slate-500" />
                  </div>
                )}
                <div className="absolute bottom-1 inset-x-1 text-center">
                  <span className="text-[10px] text-white bg-black/50 px-2 py-0.5 rounded-full">You</span>
                </div>
              </div>
            </div>
          )}

          {/* Status bar */}
          <div className={`absolute top-4 left-4 z-10 transition-opacity ${showControls ? 'opacity-100' : 'opacity-0'}`}>
            <div className="flex items-center gap-2 bg-black/60 backdrop-blur rounded-full px-4 py-2">
              <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
              <span className="text-sm text-white font-medium">{getStatusText()}</span>
              {isActive && <Wifi className="w-4 h-4 text-green-400" />}
            </div>
            {isActive && <p className="mt-1 text-xs text-white/70 pl-2">{remoteUserName}</p>}
          </div>
        </div>
      ) : (
        /* VOICE CALL */
        <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-6">
          {(isRinging || isConnecting) && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-80 h-80 rounded-full border border-indigo-500/20 animate-ping" style={{animationDuration: '2s'}} />
              <div className="absolute w-60 h-60 rounded-full border border-indigo-500/30 animate-ping" style={{animationDuration: '2s', animationDelay: '0.5s'}} />
            </div>
          )}

          <div className="relative z-10 mb-6">
            {remoteUserAvatar ? (
              <img src={remoteUserAvatar} alt="" className="w-36 h-36 sm:w-44 sm:h-44 rounded-full object-cover ring-4 ring-white/20 shadow-2xl" />
            ) : (
              <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-6xl font-bold text-white ring-4 ring-white/20 shadow-2xl">
                {remoteUserName?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            {isActive && <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full ring-4 ring-slate-900" />}
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">{remoteUserName}</h2>
          <p className="text-lg text-gray-400">{getStatusText()}</p>
        </div>
      )}

      {/* CONTROLS */}
      <div className={`absolute bottom-0 inset-x-0 z-30 transition-all duration-300 ${
        showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}>
        <div className="bg-gradient-to-t from-black via-black/80 to-transparent pt-16 pb-8 sm:pb-12 px-4">
          <div className="flex items-center justify-center gap-5 sm:gap-6">
            {/* Mute */}
            <button
              onClick={(e) => { e.stopPropagation(); toggleMute(); }}
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                isMuted ? 'bg-white text-black' : 'bg-white/20 text-white'
              }`}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>

            {/* End Call */}
            <button
              onClick={(e) => { e.stopPropagation(); endCall(); }}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-red-500/40"
            >
              <PhoneOff className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            </button>

            {/* Video / Speaker */}
            {isVideoCall ? (
              <button
                onClick={(e) => { e.stopPropagation(); toggleVideo(); }}
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                  isVideoOff ? 'bg-white text-black' : 'bg-white/20 text-white'
                }`}
              >
                {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
              </button>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); toggleSpeaker(); }}
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                  !isSpeakerOn ? 'bg-white text-black' : 'bg-white/20 text-white'
                }`}
              >
                {isSpeakerOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
              </button>
            )}
          </div>

          {/* Extra controls for video */}
          {isVideoCall && isActive && (
            <div className="flex items-center justify-center gap-4 mt-4">
              {isMobile && (
                <button onClick={(e) => { e.stopPropagation(); switchCamera(); }} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white">
                  <SwitchCamera className="w-5 h-5" />
                </button>
              )}
              <button onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white">
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
              <button onClick={(e) => { e.stopPropagation(); toggleSpeaker(); }} className={`w-10 h-10 rounded-full flex items-center justify-center ${!isSpeakerOn ? 'bg-white/30' : 'bg-white/10'} text-white`}>
                {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
