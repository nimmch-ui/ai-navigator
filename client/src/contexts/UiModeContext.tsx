import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { UiMode } from "@/types/ui";
import { PreferencesService } from "@/services/preferences";
import { EventBus } from "@/services/eventBus";
import { ModeService } from "@/services/mode";

interface UiModeContextValue {
  uiMode: UiMode;
  setUiMode: (mode: UiMode) => void;
  spatialAudio: boolean;
  setSpatialAudio: (enabled: boolean) => void;
  ambientMusic: boolean;
  setAmbientMusic: (enabled: boolean) => void;
  hapticsEnabled: boolean;
  setHapticsEnabled: (enabled: boolean) => void;
}

const UiModeContext = createContext<UiModeContextValue | undefined>(undefined);

export function UiModeProvider({ children }: { children: React.ReactNode }) {
  const [uiMode, setUiModeState] = useState<UiMode>(() => {
    // Delegate to ModeService for initial state
    return ModeService.getMode();
  });

  const [spatialAudio, setSpatialAudioState] = useState<boolean>(() => {
    const prefs = PreferencesService.getPreferences();
    return prefs.spatialAudio;
  });

  const [ambientMusic, setAmbientMusicState] = useState<boolean>(() => {
    const prefs = PreferencesService.getPreferences();
    return prefs.ambientMusic;
  });

  const [hapticsEnabled, setHapticsEnabledState] = useState<boolean>(() => {
    const prefs = PreferencesService.getPreferences();
    return prefs.hapticsEnabled;
  });

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedSave = useCallback((updates: Partial<{
    uiMode: UiMode;
    spatialAudio: boolean;
    ambientMusic: boolean;
    hapticsEnabled: boolean;
  }>) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      PreferencesService.savePreferences(updates);
    }, 300);
  }, []);

  const setUiMode = useCallback((mode: UiMode) => {
    const previousMode = uiMode;
    if (mode === previousMode) return;

    // Delegate to ModeService which handles persistence and EventBus
    ModeService.setMode(mode);
    
    // Update local state (will also be updated by onChange subscriber)
    setUiModeState(mode);

    EventBus.emit('immersion:levelChanged', {
      level: calculateImmersionLevel(mode, spatialAudio, ambientMusic, hapticsEnabled),
      settings: {
        spatialAudio,
        ambientMusic,
        hapticsEnabled
      }
    });
  }, [uiMode, spatialAudio, ambientMusic, hapticsEnabled]);

  const setSpatialAudio = useCallback((enabled: boolean) => {
    if (enabled === spatialAudio) return;
    setSpatialAudioState(enabled);
    debouncedSave({ spatialAudio: enabled });

    EventBus.emit('immersion:levelChanged', {
      level: calculateImmersionLevel(uiMode, enabled, ambientMusic, hapticsEnabled),
      settings: {
        spatialAudio: enabled,
        ambientMusic,
        hapticsEnabled
      }
    });
  }, [spatialAudio, uiMode, ambientMusic, hapticsEnabled, debouncedSave]);

  const setAmbientMusic = useCallback((enabled: boolean) => {
    if (enabled === ambientMusic) return;
    setAmbientMusicState(enabled);
    debouncedSave({ ambientMusic: enabled });

    EventBus.emit('immersion:levelChanged', {
      level: calculateImmersionLevel(uiMode, spatialAudio, enabled, hapticsEnabled),
      settings: {
        spatialAudio,
        ambientMusic: enabled,
        hapticsEnabled
      }
    });
  }, [ambientMusic, uiMode, spatialAudio, hapticsEnabled, debouncedSave]);

  const setHapticsEnabled = useCallback((enabled: boolean) => {
    if (enabled === hapticsEnabled) return;
    setHapticsEnabledState(enabled);
    debouncedSave({ hapticsEnabled: enabled });

    EventBus.emit('immersion:levelChanged', {
      level: calculateImmersionLevel(uiMode, spatialAudio, ambientMusic, enabled),
      settings: {
        spatialAudio,
        ambientMusic,
        hapticsEnabled: enabled
      }
    });
  }, [hapticsEnabled, uiMode, spatialAudio, ambientMusic, debouncedSave]);

  // Subscribe to ModeService changes (from keyboard shortcuts, etc.)
  useEffect(() => {
    const unsubscribe = ModeService.onChange((mode) => {
      setUiModeState(mode);
      
      EventBus.emit('immersion:levelChanged', {
        level: calculateImmersionLevel(mode, spatialAudio, ambientMusic, hapticsEnabled),
        settings: {
          spatialAudio,
          ambientMusic,
          hapticsEnabled
        }
      });
    });

    return () => {
      unsubscribe();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [spatialAudio, ambientMusic, hapticsEnabled]);

  const value: UiModeContextValue = {
    uiMode,
    setUiMode,
    spatialAudio,
    setSpatialAudio,
    ambientMusic,
    setAmbientMusic,
    hapticsEnabled,
    setHapticsEnabled
  };

  return (
    <UiModeContext.Provider value={value}>
      {children}
    </UiModeContext.Provider>
  );
}

export function useUiMode(): UiModeContextValue {
  const context = useContext(UiModeContext);
  if (!context) {
    throw new Error("useUiMode must be used within a UiModeProvider");
  }
  return context;
}

function calculateImmersionLevel(
  mode: UiMode,
  spatialAudio: boolean,
  ambientMusic: boolean,
  haptics: boolean
): number {
  let level = 0;
  
  switch (mode) {
    case UiMode.CLASSIC:
      level = 1;
      break;
    case UiMode.THREED:
      level = 2;
      break;
    case UiMode.CINEMATIC:
      level = 3;
      break;
    case UiMode.AR:
      level = 4;
      break;
    case UiMode.VR:
      level = 5;
      break;
    case UiMode.ECO:
      level = 1;
      break;
  }

  if (spatialAudio) level += 0.5;
  if (ambientMusic) level += 0.3;
  if (haptics) level += 0.2;

  return Math.min(level, 6);
}
