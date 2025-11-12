/**
 * ModeSwitcher - Persistent mode selector with 6 navigation modes
 * Compact floating bar with tooltips and keyboard/touch gestures
 */

import { useState, useEffect } from 'react';
import { UiMode } from '@/types/ui';
import { ModeService } from '@/services/mode';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Navigation, 
  Box, 
  Video, 
  Camera, 
  Glasses, 
  Leaf 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModeConfig {
  mode: UiMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  shortcut?: string;
}

const MODE_CONFIGS: ModeConfig[] = [
  {
    mode: UiMode.CLASSIC,
    label: 'Classic',
    icon: Navigation,
    description: 'Traditional 2D map navigation',
    shortcut: '1'
  },
  {
    mode: UiMode.THREED,
    label: '3D',
    icon: Box,
    description: 'Interactive 3D map with terrain',
    shortcut: '2'
  },
  {
    mode: UiMode.CINEMATIC,
    label: 'Cinematic',
    icon: Video,
    description: 'Immersive camera following',
    shortcut: '3'
  },
  {
    mode: UiMode.AR,
    label: 'AR',
    icon: Camera,
    description: 'Augmented reality overlay',
    shortcut: '4'
  },
  {
    mode: UiMode.VR,
    label: 'VR',
    icon: Glasses,
    description: 'Virtual reality mode',
    shortcut: '5'
  },
  {
    mode: UiMode.ECO,
    label: 'Eco',
    icon: Leaf,
    description: 'Energy-efficient minimal UI',
    shortcut: '6'
  }
];

interface ModeSwitcherProps {
  className?: string;
  onModeChange?: (mode: UiMode) => void;
}

export function ModeSwitcher({ className, onModeChange }: ModeSwitcherProps) {
  const [currentMode, setCurrentMode] = useState<UiMode>(ModeService.getMode());

  useEffect(() => {
    // Subscribe to mode changes from service
    const unsubscribe = ModeService.onChange((mode) => {
      setCurrentMode(mode);
      onModeChange?.(mode);
    });

    return () => {
      unsubscribe();
    };
  }, [onModeChange]);

  useEffect(() => {
    // Keyboard shortcuts
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only if not typing in input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = e.key;
      const config = MODE_CONFIGS.find(c => c.shortcut === key);
      
      if (config) {
        e.preventDefault();
        handleModeSelect(config.mode);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const handleModeSelect = (mode: UiMode) => {
    ModeService.setMode(mode);
  };

  return (
    <div 
      className={cn(
        "flex items-center gap-1 bg-card/95 backdrop-blur-sm border border-card-border rounded-lg p-1.5 shadow-lg",
        className
      )}
      role="toolbar"
      aria-label="Navigation mode selector"
      data-testid="mode-switcher"
    >
      {MODE_CONFIGS.map((config) => {
        const Icon = config.icon;
        const isActive = currentMode === config.mode;

        return (
          <Tooltip key={config.mode}>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant={isActive ? "default" : "ghost"}
                onClick={() => handleModeSelect(config.mode)}
                aria-pressed={isActive}
                aria-label={`${config.label} mode${config.shortcut ? ` (${config.shortcut})` : ''}`}
                className={cn(
                  "h-9 w-9 transition-all",
                  isActive && "shadow-sm"
                )}
                data-testid={`button-mode-${config.mode.toLowerCase()}`}
              >
                <Icon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              <div className="font-medium">{config.label}</div>
              <div className="text-muted-foreground">{config.description}</div>
              {config.shortcut && (
                <div className="text-muted-foreground mt-1">
                  Press <kbd className="px-1 py-0.5 bg-muted rounded text-xs">{config.shortcut}</kbd>
                </div>
              )}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

/**
 * Compact version for mobile (bottom sheet style)
 */
export function ModeSwitcherCompact({ className, onModeChange }: ModeSwitcherProps) {
  const [currentMode, setCurrentMode] = useState<UiMode>(ModeService.getMode());

  useEffect(() => {
    const unsubscribe = ModeService.onChange((mode) => {
      setCurrentMode(mode);
      onModeChange?.(mode);
    });

    return () => {
      unsubscribe();
    };
  }, [onModeChange]);

  const handleModeSelect = (mode: UiMode) => {
    ModeService.setMode(mode);
  };

  const currentConfig = MODE_CONFIGS.find(c => c.mode === currentMode);
  const CurrentIcon = currentConfig?.icon || Navigation;

  return (
    <div 
      className={cn(
        "flex items-center gap-2 bg-card/95 backdrop-blur-sm border border-card-border rounded-full px-3 py-2 shadow-lg",
        className
      )}
      data-testid="mode-switcher-compact"
    >
      <div className="flex items-center gap-1.5">
        <CurrentIcon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{currentConfig?.label}</span>
      </div>
      
      <div className="flex items-center gap-0.5">
        {MODE_CONFIGS.map((config, index) => {
          const isActive = currentMode === config.mode;
          
          return (
            <button
              key={config.mode}
              onClick={() => handleModeSelect(config.mode)}
              aria-pressed={isActive}
              aria-label={config.label}
              className={cn(
                "h-1.5 w-1.5 rounded-full transition-all",
                isActive ? "bg-primary w-4" : "bg-muted hover:bg-muted-foreground/30"
              )}
              data-testid={`button-mode-dot-${config.mode.toLowerCase()}-${index}`}
            />
          );
        })}
      </div>
    </div>
  );
}
