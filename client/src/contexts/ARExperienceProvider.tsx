import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ARSensorService } from '@/services/ar/ARSensorService';
import { OrientationService, type HeadingData, type OrientationMode } from '@/services/ar/OrientationService';
import { PreferencesService, type ARPermissionStatus } from '@/services/preferences';
import { useToast } from '@/hooks/use-toast';

interface ARExperienceContextValue {
  isARActive: boolean;
  cameraStream: MediaStream | null;
  heading: HeadingData | null;
  orientationMode: OrientationMode;
  permissionStatus: ARPermissionStatus;
  toggleAR: (enabled: boolean) => Promise<void>;
  isInitializing: boolean;
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
  
  const [cameraService] = useState(() => new ARSensorService());
  const [orientationService] = useState(() => new OrientationService());
  const { toast } = useToast();

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
        // Start camera
        try {
          const stream = await cameraService.requestCamera('environment');
          setCameraStream(stream);
          setPermissionStatus('granted');
          PreferencesService.updatePreference('arPermissionStatus', 'granted');
        } catch (error) {
          console.error('Camera access failed:', error);
          setPermissionStatus('denied');
          PreferencesService.updatePreference('arPermissionStatus', 'denied');
          toast({
            title: 'Camera Access Denied',
            description: 'Please grant camera permissions to use AR Preview.',
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
  };

  return (
    <ARExperienceContext.Provider value={value}>
      {children}
    </ARExperienceContext.Provider>
  );
}
