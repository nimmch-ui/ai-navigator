import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ARSensorService } from '@/services/ar/ARSensorService';
import { OrientationService, type HeadingData, type OrientationMode } from '@/services/ar/OrientationService';
import { PreferencesService, type ARPermissionStatus } from '@/services/preferences';
import { useToast } from '@/hooks/use-toast';

export interface ARStreamHealth {
  active: boolean;
  trackCount: number;
  resolution?: { width: number; height: number };
}

interface ARExperienceContextValue {
  isARActive: boolean;
  cameraStream: MediaStream | null;
  heading: HeadingData | null;
  orientationMode: OrientationMode;
  permissionStatus: ARPermissionStatus;
  toggleAR: (enabled: boolean) => Promise<void>;
  isInitializing: boolean;
  streamHealth: ARStreamHealth | null;
}

const ARExperienceContext = createContext<ARExperienceContextValue | null>(null);

export function useARExperience() {
  const context = useContext(ARExperienceContext);
  if (!context) {
    throw new Error('useARExperience must be used within ARExperienceProvider');
  }
  return context;
}

interface ARExperienceProviderProps {
  children: ReactNode;
}

export function ARExperienceProvider({ children }: ARExperienceProviderProps) {
  const [isARActive, setIsARActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [heading, setHeading] = useState<HeadingData | null>(null);
  const [orientationMode, setOrientationMode] = useState<OrientationMode>("none");
  const [permissionStatus, setPermissionStatus] = useState<ARPermissionStatus>("unknown");
  const [isInitializing, setIsInitializing] = useState(false);
  const [streamHealth, setStreamHealth] = useState<ARStreamHealth | null>(null);
  
  const [cameraService] = useState(() => new ARSensorService());
  const [orientationService] = useState(() => new OrientationService());
  const { toast } = useToast();

  // Monitor camera stream health
  useEffect(() => {
    if (!cameraStream) {
      setStreamHealth(null);
      return;
    }

    const checkHealth = () => {
      const diagnostics = cameraService.getStreamDiagnostics();
      if (diagnostics) {
        setStreamHealth(diagnostics);
        
        // Alert if stream becomes inactive
        if (!diagnostics.active && isARActive) {
          toast({
            title: 'Camera Stream Lost',
            description: 'AR Preview camera stream disconnected. Try toggling AR again.',
            variant: 'destructive',
          });
        }
      }
    };

    // Check every 2 seconds
    const interval = setInterval(checkHealth, 2000);
    checkHealth(); // Initial check

    return () => clearInterval(interval);
  }, [cameraStream, isARActive, cameraService, toast]);

  // Check sensor capabilities on mount
  useEffect(() => {
    const checkCapabilities = async () => {
      const hasWebXR = await OrientationService.checkWebXRSupport();
      const hasDeviceOrientation = OrientationService.checkDeviceOrientationSupport();
      const hasCamera = ARSensorService.isSupported();
      
      PreferencesService.updatePreference('arSensorCapabilities', {
        hasWebXR,
        hasDeviceOrientation,
        hasCamera,
      });
    };

    checkCapabilities();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cameraService.stopCamera();
      orientationService.stop();
    };
  }, [cameraService, orientationService]);

  const toggleAR = useCallback(async (enabled: boolean) => {
    setIsInitializing(true);

    try {
      if (enabled) {
        // Start camera with fallback strategy
        try {
          const { stream, facingMode } = await cameraService.requestCameraWithFallback();
          setCameraStream(stream);
          setPermissionStatus('granted');
          PreferencesService.updatePreference('arPermissionStatus', 'granted');

          // Notify user if fallback to front camera was used
          if (facingMode === 'user') {
            toast({
              title: 'AR Preview: Front Camera',
              description: 'Rear camera unavailable. Using front camera instead.',
            });
          }
        } catch (error) {
          console.error('Camera access failed:', error);
          setPermissionStatus('denied');
          PreferencesService.updatePreference('arPermissionStatus', 'denied');
          
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          // Provide specific guidance based on error type
          let title = 'Camera Access Failed';
          let description = 'Unable to access camera.';
          
          if (errorMessage === 'Camera permission denied') {
            title = 'Camera Permission Denied';
            description = 'Please grant camera permissions in your browser settings to use AR Preview.';
          } else if (errorMessage === 'No camera found') {
            title = 'No Camera Detected';
            description = 'Your device does not have a camera or it is not accessible.';
          } else if (errorMessage === 'Camera not supported on this device') {
            title = 'Camera Not Supported';
            description = 'Your browser does not support camera access for AR features.';
          } else if (errorMessage === 'Camera in use') {
            title = 'Camera In Use';
            description = 'Camera is currently being used by another application. Please close other apps and try again.';
          } else if (errorMessage === 'Camera constraints not supported') {
            title = 'Camera Configuration Issue';
            description = 'Your camera does not meet the required specifications for AR mode.';
          }
          
          toast({
            title,
            description,
            variant: 'destructive',
          });
          setIsInitializing(false);
          return;
        }

        // Start orientation tracking
        try {
          const mode = await orientationService.start((headingData) => {
            setHeading(headingData);
          });
          setOrientationMode(mode);

          if (mode === "none") {
            toast({
              title: 'Limited AR Mode',
              description: 'Orientation sensors unavailable. Using basic HUD overlay.',
            });
          }
        } catch (error) {
          console.error('Orientation tracking failed:', error);
          // Continue with camera-only mode
          setOrientationMode("none");
        }

        setIsARActive(true);
        PreferencesService.updatePreference('arPreviewEnabled', true);
        
        toast({
          title: 'AR Preview Enabled',
          description: 'Camera is active. Tap again to disable.',
        });
      } else {
        // Stop AR
        cameraService.stopCamera();
        orientationService.stop();
        setCameraStream(null);
        setHeading(null);
        setOrientationMode("none");
        setIsARActive(false);
        PreferencesService.updatePreference('arPreviewEnabled', false);
        
        toast({
          title: 'AR Preview Disabled',
          description: 'Camera has been released.',
        });
      }
    } catch (error) {
      console.error('AR toggle error:', error);
      toast({
        title: 'AR Error',
        description: 'Failed to initialize AR mode. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsInitializing(false);
    }
  }, [cameraService, orientationService, toast]);

  const value: ARExperienceContextValue = {
    isARActive,
    cameraStream,
    heading,
    orientationMode,
    permissionStatus,
    toggleAR,
    isInitializing,
    streamHealth,
  };

  return (
    <ARExperienceContext.Provider value={value}>
      {children}
    </ARExperienceContext.Provider>
  );
}
