// GO7 Delivery Replay Controls Component
// Professional playback controls with timeline, speed adjustment, and seeking

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  FastForward,
  Rewind,
  Clock,
  Gauge
} from 'lucide-react';

const SPEED_OPTIONS = [0.5, 1, 2, 4, 8];

export default function ReplayControls({
  isPlaying,
  speed,
  currentTs,
  startTs,
  endTs,
  onPlay,
  onPause,
  onSpeedChange,
  onSeek,
  onStepForward,
  onStepBackward
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(0);
  const sliderRef = useRef(null);

  // Calculate progress percentage
  const progress = startTs && endTs ? 
    ((currentTs - startTs) / (endTs - startTs)) * 100 : 0;

  // Format timestamp to readable time
  const formatTime = (timestamp) => {
    if (!timestamp) return '00:00';
    const date = new Date(timestamp);
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  // Format duration
  const formatDuration = (ms) => {
    if (!ms) return '0s';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Calculate elapsed and remaining time
  const elapsedTime = currentTs - startTs;
  const remainingTime = endTs - currentTs;
  const totalDuration = endTs - startTs;

  // Handle slider mouse events
  const handleSliderMouseDown = (e) => {
    if (!sliderRef.current) return;
    setIsDragging(true);
    updateSliderValue(e);
  };

  const handleSliderMouseMove = (e) => {
    if (!isDragging || !sliderRef.current) return;
    updateSliderValue(e);
  };

  const handleSliderMouseUp = () => {
    if (isDragging) {
      const newTs = startTs + (dragValue / 100) * (endTs - startTs);
      onSeek(newTs);
    }
    setIsDragging(false);
  };

  const updateSliderValue = (e) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    setDragValue(percent);
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          isPlaying ? onPause() : onPlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          onStepBackward();
          break;
        case 'ArrowRight':
          e.preventDefault();
          onStepForward();
          break;
        case 'KeyR':
          if (e.ctrlKey) {
            e.preventDefault();
            onSeek(startTs);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isPlaying, onPlay, onPause, onStepForward, onStepBackward, onSeek, startTs]);

  // Handle mouse events for slider
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleSliderMouseMove);
      window.addEventListener('mouseup', handleSliderMouseUp);
      
      return () => {
        window.removeEventListener('mousemove', handleSliderMouseMove);
        window.removeEventListener('mouseup', handleSliderMouseUp);
      };
    }
  }, [isDragging, dragValue]);

  return (
    <div className="replay-controls bg-white border-t border-gray-200">
      {/* Timeline Slider */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span className="flex items-center space-x-1">
            <Clock className="h-4 w-4" />
            <span>{formatTime(currentTs)}</span>
          </span>
          <span className="text-gray-400">
            {formatDuration(elapsedTime)} / {formatDuration(totalDuration)}
          </span>
          <span>-{formatDuration(remainingTime)}</span>
        </div>
        
        {/* Custom Slider */}
        <div 
          ref={sliderRef}
          className="relative h-2 bg-gray-200 rounded-full cursor-pointer select-none"
          onMouseDown={handleSliderMouseDown}
        >
          {/* Progress Track */}
          <motion.div
            className="absolute left-0 top-0 h-full bg-red-600 rounded-full"
            style={{ 
              width: `${isDragging ? dragValue : progress}%`,
              transition: isDragging ? 'none' : 'width 0.1s ease-out'
            }}
          />
          
          {/* Thumb */}
          <motion.div
            className="absolute top-1/2 w-5 h-5 bg-white border-2 border-red-600 rounded-full shadow-lg cursor-grab active:cursor-grabbing"
            style={{ 
              left: `${isDragging ? dragValue : progress}%`,
              transform: 'translate(-50%, -50%)',
              transition: isDragging ? 'none' : 'left 0.1s ease-out'
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          />
          
          {/* Hover Preview */}
          {isDragging && (
            <div
              className="absolute bottom-full mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap pointer-events-none"
              style={{
                left: `${dragValue}%`,
                transform: 'translateX(-50%)'
              }}
            >
              {formatTime(startTs + (dragValue / 100) * (endTs - startTs))}
            </div>
          )}
        </div>
      </div>

      {/* Main Controls */}
      <div className="flex items-center justify-center space-x-4 mb-4">
        {/* Step Backward */}
        <motion.button
          onClick={onStepBackward}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="Step backward (← or 5s)"
        >
          <SkipBack className="h-5 w-5 text-gray-600" />
        </motion.button>

        {/* Rewind */}
        <motion.button
          onClick={() => {
            const newSpeed = speed > 1 ? speed / 2 : 0.5;
            onSpeedChange(newSpeed);
          }}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="Decrease speed"
        >
          <Rewind className="h-5 w-5 text-gray-600" />
        </motion.button>

        {/* Play/Pause */}
        <motion.button
          onClick={isPlaying ? onPause : onPlay}
          className="p-4 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title={isPlaying ? "Pause (Space)" : "Play (Space)"}
        >
          {isPlaying ? (
            <Pause className="h-6 w-6" />
          ) : (
            <Play className="h-6 w-6 ml-0.5" />
          )}
        </motion.button>

        {/* Fast Forward */}
        <motion.button
          onClick={() => {
            const newSpeed = speed < 8 ? speed * 2 : 8;
            onSpeedChange(newSpeed);
          }}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="Increase speed"
        >
          <FastForward className="h-5 w-5 text-gray-600" />
        </motion.button>

        {/* Step Forward */}
        <motion.button
          onClick={onStepForward}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="Step forward (→ or 5s)"
        >
          <SkipForward className="h-5 w-5 text-gray-600" />
        </motion.button>
      </div>

      {/* Speed Control */}
      <div className="flex items-center justify-center">
        <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
          <Gauge className="h-4 w-4 text-gray-500 ml-2" />
          <span className="text-sm text-gray-600 font-medium">Speed:</span>
          
          {SPEED_OPTIONS.map((speedOption) => (
            <motion.button
              key={speedOption}
              onClick={() => onSpeedChange(speedOption)}
              className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                speed === speedOption
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {speedOption}x
            </motion.button>
          ))}
        </div>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          Keyboard shortcuts: <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Space</kbd> Play/Pause
          {' • '}
          <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">←→</kbd> Step
          {' • '}
          <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Ctrl+R</kbd> Reset
        </p>
      </div>
    </div>
  );
}