import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, X } from 'lucide-react';
import * as Slider from '@radix-ui/react-slider';
import { cn } from '../lib/utils';

export interface VideoPlayerProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
    onClose?: () => void;
    src: string;
}

export const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(({
    className,
    onClose,
    src,
    autoPlay = false,
    loop = false,
    ...props
}, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    useImperativeHandle(ref, () => videoRef.current as HTMLVideoElement);

    const [isPlaying, setIsPlaying] = useState(autoPlay);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [showControls, setShowControls] = useState(true);

    // Auto-hide controls timer
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const toggleFullscreen = () => {
        const wrapper = videoRef.current?.parentElement?.parentElement; // Adjust for wrapper structure
        if (document.fullscreenElement) {
            document.exitFullscreen();
            setIsFullscreen(false);
        } else if (wrapper) {
            wrapper.requestFullscreen();
            setIsFullscreen(true);
        }
    };

    const cyclePlaybackRate = () => {
        if (videoRef.current) {
            const rates = [0.5, 1, 1.5, 2];
            const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
            videoRef.current.playbackRate = nextRate;
            setPlaybackRate(nextRate);
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
            setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
        }
    };

    const [wasPlayingBeforeScrub, setWasPlayingBeforeScrub] = useState(false);

    const handleScrubStart = () => {
        setWasPlayingBeforeScrub(isPlaying);
        if (isPlaying && videoRef.current) {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    };

    const handleScrubEnd = () => {
        if (wasPlayingBeforeScrub && videoRef.current) {
            videoRef.current.play();
            setIsPlaying(true);
        }
    };

    const handleSeek = (value: number[]) => {
        if (videoRef.current) {
            const newTime = (value[0] / 100) * videoRef.current.duration;
            videoRef.current.currentTime = newTime;
            setProgress(value[0]);
            setCurrentTime(newTime);
        }
    };

    const handleVolumeChange = (value: number[]) => {
        if (videoRef.current) {
            const newVol = value[0];
            videoRef.current.volume = newVol;
            setVolume(newVol);
            setIsMuted(newVol === 0);
        }
    };

    // Keep controls visible when hovering
    const handleMouseMove = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => {
            if (isPlaying) setShowControls(false);
        }, 2000);
    };

    useEffect(() => {
        // Init auto-hide
        if (autoPlay) {
            controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 2000);
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                e.preventDefault();
                togglePlay();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [autoPlay, togglePlay]);

    return (
        <div
            className={cn("group relative flex flex-col bg-black rounded-lg overflow-hidden", className)}
            onMouseMove={handleMouseMove}
            onClick={togglePlay}
        >
            {/* Main Video Area */}
            <div className="relative flex-1 flex items-center justify-center bg-black min-h-0">
                <video
                    ref={videoRef}
                    onClick={togglePlay}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={() => {
                        setIsPlaying(false);
                        setShowControls(true);
                        props.onEnded?.(undefined as any);
                    }}
                    className="max-w-full max-h-full w-auto h-auto object-contain outline-none cursor-pointer"
                    src={src}
                    autoPlay={autoPlay}
                    loop={loop}
                    {...props}
                />

                {/* Center Play Button Overlay (only when paused) */}
                {!isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/90 shadow-lg animate-in fade-in zoom-in-95 duration-200">
                            <Play size={20} fill="currentColor" className="ml-0.5" />
                        </div>
                    </div>
                )}

                {/* Close Button (if provided) */}
                {onClose && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                        }}
                        className="absolute top-3 right-3 p-1.5 rounded-full bg-black/40 text-white/70 hover:text-white hover:bg-black/60 backdrop-blur-sm transition-all duration-200 opacity-0 group-hover:opacity-100"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>

            {/* Apple-style Control Bar */}
            <div
                className={cn(
                    "flex-none h-10 px-3 flex items-center gap-3 bg-studio-panel/95 backdrop-blur-md border-t border-studio-border/10 transition-all duration-300",
                    !showControls && isPlaying ? "opacity-0 translate-y-full" : "opacity-100 translate-y-0"
                )}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Play/Pause */}
                <button
                    onClick={togglePlay}
                    className="text-studio-textSecondary hover:text-studio-text transition-colors"
                >
                    {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                </button>

                {/* Time Display */}
                <div className="text-[10px] font-medium text-studio-textSecondary tabular-nums w-[60px] text-center shrink-0">
                    {formatTime(currentTime)} / {formatTime(duration || 0)}
                </div>

                {/* Scrubber */}
                <Slider.Root
                    className="relative flex items-center select-none touch-none w-full h-4 group/slider cursor-pointer"
                    value={[progress]}
                    max={100}
                    step={0.1}
                    onValueChange={handleSeek}
                    onPointerDown={handleScrubStart}
                    onValueCommit={handleScrubEnd}
                >
                    <Slider.Track className="relative bg-studio-border/30 flex-grow rounded-full h-[3px] group-hover/slider:h-[4px] transition-all">
                        <Slider.Range className="absolute bg-studio-accent rounded-full h-full" />
                    </Slider.Track>
                    <Slider.Thumb
                        className="block w-3 h-3 bg-studio-text rounded-full shadow-lg ring-2 ring-studio-bg opacity-0 group-hover/slider:opacity-100 focus:opacity-100 transition-opacity focus:outline-none"
                        aria-label="Volume"
                    />
                </Slider.Root>

                {/* Volume */}
                <div className="flex items-center gap-2 group/vol">
                    <button
                        onClick={toggleMute}
                        className="text-studio-textSecondary hover:text-studio-text transition-colors"
                    >
                        {isMuted || volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    </button>
                    <div className="w-0 overflow-hidden group-hover/vol:w-16 transition-all duration-300 ease-out">
                        <Slider.Root
                            className="relative flex items-center select-none touch-none w-16 h-4"
                            value={[isMuted ? 0 : volume]}
                            max={1}
                            step={0.01}
                            onValueChange={handleVolumeChange}
                        >
                            <Slider.Track className="relative bg-studio-border/30 flex-grow rounded-full h-[3px]">
                                <Slider.Range className="absolute bg-studio-textSecondary rounded-full h-full" />
                            </Slider.Track>
                            <Slider.Thumb
                                className="block w-2.5 h-2.5 bg-studio-textSecondary rounded-full shadow-sm opacity-0 group-hover/vol:opacity-100 focus:opacity-100 transition-opacity focus:outline-none"
                            />
                        </Slider.Root>
                    </div>
                </div>

                <div className="w-px h-3 bg-studio-border/50 mx-1" />

                {/* Speed */}
                <button
                    onClick={cyclePlaybackRate}
                    className="flex items-center text-[10px] font-medium text-studio-textSecondary hover:text-studio-text transition-colors w-8 justify-center"
                    title="Playback Speed"
                >
                    {playbackRate}x
                </button>

                {/* Fullscreen */}
                <button
                    onClick={toggleFullscreen}
                    className="text-studio-textSecondary hover:text-studio-text transition-colors"
                >
                    {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
                </button>
            </div>
        </div>
    );
});

VideoPlayer.displayName = "VideoPlayer";
