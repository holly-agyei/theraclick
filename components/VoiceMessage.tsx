"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, AlertTriangle } from "lucide-react";

interface VoiceMessageProps {
  audioUrl: string;
  isOwnMessage?: boolean;
}

export function VoiceMessage({ audioUrl, isOwnMessage = false }: VoiceMessageProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [showNativeFallback, setShowNativeFallback] = useState(false);

  // Reset state when URL changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsLoaded(false);
    setError(false);
    setShowNativeFallback(false);
  }, [audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    const handleLoadedMetadata = () => {
      // Some formats report Infinity — try to work around it
      let dur = audio.duration;
      if (!isFinite(dur) || isNaN(dur)) {
        dur = 0;
      }
      setDuration(dur);
      setIsLoaded(true);
      setError(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      // Lazy-fix duration if it was Infinity at load
      if (duration === 0 && isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
    };

    const handleError = () => {
      console.error("VoiceMessage: audio failed to load", audioUrl?.slice(0, 80));
      setError(true);
      setIsPlaying(false);
      // Show native fallback so the browser tries its own codecs
      setShowNativeFallback(true);
    };

    const handleCanPlay = () => {
      setIsLoaded(true);
      setError(false);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    audio.addEventListener("canplay", handleCanPlay);

    // Kick-start the load
    audio.load();

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("canplay", handleCanPlay);
    };
  }, [audioUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        if (audio.currentTime >= audio.duration) {
          audio.currentTime = 0;
        }
        await audio.play();
        setIsPlaying(true);
        setError(false);
      }
    } catch (err) {
      console.error("VoiceMessage: play() rejected", err);
      setError(true);
      setShowNativeFallback(true);
    }
  }, [isPlaying]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const time = parseFloat(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const formatTime = (time: number) => {
    if (!isFinite(time) || isNaN(time) || time < 0) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // ── Fallback: native <audio controls> ──
  if (showNativeFallback) {
    return (
      <div className="min-w-[200px] max-w-[280px]">
        <audio
          controls
          src={audioUrl}
          crossOrigin="anonymous"
          className="w-full h-10 rounded-lg"
          style={{ filter: isOwnMessage ? "invert(1) brightness(2)" : "none" }}
        />
      </div>
    );
  }

  // Fake waveform bar heights — deterministic pattern
  const barHeights = [60, 80, 40, 90, 50, 70, 85, 45, 75, 55, 90, 60, 80, 45, 70, 85, 50, 65, 75, 55];

  return (
    <div className={`flex items-center gap-3 min-w-[200px] max-w-[280px] ${
      isOwnMessage ? "text-white" : "text-gray-200"
    }`}>
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        crossOrigin="anonymous"
      />

      {/* Play / Pause */}
      <button
        onClick={togglePlay}
        disabled={error}
        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
          error
            ? "bg-red-500/30 cursor-not-allowed"
            : isOwnMessage
              ? "bg-white/20 hover:bg-white/30 active:scale-90"
              : "bg-white/10 hover:bg-white/20 active:scale-90"
        }`}
      >
        {error ? (
          <AlertTriangle className="w-4 h-4 opacity-60" />
        ) : isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4 ml-0.5" />
        )}
      </button>

      {/* Waveform + time */}
      <div className="flex-1 min-w-0">
        <div className="relative h-8 flex items-center gap-[2px]">
          {barHeights.map((height, i) => {
            const barProgress = (i / barHeights.length) * 100;
            const isActive = barProgress <= progress;
            return (
              <div
                key={i}
                className={`flex-1 rounded-full transition-colors ${
                  isActive
                    ? isOwnMessage ? "bg-white" : "bg-[#2BB5A0]"
                    : isOwnMessage ? "bg-white/30" : "bg-white/10"
                }`}
                style={{ height: `${height}%` }}
              />
            );
          })}

          {/* Invisible seek slider */}
          <input
            type="range"
            min="0"
            max={duration || 1}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={!isLoaded || error}
          />
        </div>

        <div className="flex justify-between text-[10px] mt-0.5 opacity-60">
          <span>{formatTime(currentTime)}</span>
          <span>{duration > 0 ? formatTime(duration) : "--:--"}</span>
        </div>
      </div>
    </div>
  );
}
