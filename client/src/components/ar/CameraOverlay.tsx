import { useEffect, useRef, memo } from 'react';

interface CameraOverlayProps {
  stream: MediaStream | null;
  onError?: (error: Error) => void;
}

const CameraOverlay = memo(({ stream, onError }: CameraOverlayProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;

    try {
      video.srcObject = stream;
      video.play().catch((err) => {
        console.error('Failed to play video:', err);
        onError?.(new Error('Failed to start camera preview'));
      });
    } catch (err) {
      console.error('Failed to set video source:', err);
      onError?.(err as Error);
    }

    return () => {
      if (video) {
        video.pause();
        video.srcObject = null;
      }
    };
  }, [stream, onError]);

  if (!stream) {
    return (
      <div className="absolute inset-0 bg-black/90 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-lg font-medium">Camera not available</div>
          <div className="text-sm text-white/60 mt-2">
            Grant camera permissions to use AR Preview
          </div>
        </div>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      className="absolute inset-0 w-full h-full object-cover"
      autoPlay
      playsInline
      muted
      data-testid="ar-camera-feed"
    />
  );
});

CameraOverlay.displayName = 'CameraOverlay';

export default CameraOverlay;
