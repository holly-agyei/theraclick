"use client";

import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2 } from "lucide-react";

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

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoaded(true);
      setError(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
    };

    const handleError = () => {
      setError(true);
      setIsPlaying(false);
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

    // Try to load the audio
    audio.load();

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("canplay", handleCanPlay);
    };
  }, [audioUrl]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        // Reset if at end
        if (audio.currentTime >= audio.duration) {
          audio.currentTime = 0;
        }
        await audio.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error("Error playing audio:", err);
      setError(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const time = parseFloat(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const formatTime = (time: number) => {
    if (!isFinite(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`flex items-center gap-3 min-w-[200px] max-w-[280px] ${
      isOwnMessage ? 'text-white' : 'text-gray-200'
    }`}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      {/* Play/Pause button */}
      <button
        onClick={togglePlay}
        disabled={error}
        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
          error 
            ? 'bg-red-500/30 cursor-not-allowed' 
            : isOwnMessage 
              ? 'bg-white/20 hover:bg-white/30' 
              : 'bg-white/10 hover:bg-white/20'
        }`}
      >
        {error ? (
          <Volume2 className="w-4 h-4 opacity-50" />
        ) : isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4 ml-0.5" />
        )}
      </button>

      {/* Progress bar and time */}
      <div className="flex-1 min-w-0">
        {/* Waveform-like visualization */}
        <div className="relative h-8 flex items-center gap-[2px]">
          {/* Fake waveform bars */}
          {[...Array(20)].map((_, i) => {
            const barProgress = (i / 20) * 100;
            const isActive = barProgress <= progress;
            const height = [60, 80, 40, 90, 50, 70, 85, 45, 75, 55, 90, 60, 80, 45, 70, 85, 50, 65, 75, 55][i];
            
            return (
              <div
                key={i}
                className={`flex-1 rounded-full transition-all ${
                  isActive 
                    ? isOwnMessage ? 'bg-white' : 'bg-blue-400' 
                    : isOwnMessage ? 'bg-white/30' : 'bg-gray-500/50'
                }`}
                style={{ height: `${height}%` }}
              />
            );
          })}
          
          {/* Hidden range input for seeking */}
          <input
            type="range"
            min="0"
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={!isLoaded || error}
          />
        </div>

        {/* Time */}
        <div className="flex justify-between text-[10px] mt-1 opacity-70">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}
