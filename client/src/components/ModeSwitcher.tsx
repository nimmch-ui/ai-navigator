/**
 * ModeSwitcher - Persistent mode selector with 6 navigation modes
 * Compact floating bar with tooltips and keyboard/touch gestures
 */

import { useState, useEffect } from 'react';
import { UiMode } from '@/types/ui';
import { ModeService } from '@/services/mode';
import { monetizationService } from '@/services/monetization/MonetizationService';
import { featureFlagsService } from '@/services/featureFlags/FeatureFlagsService';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { 
  Navigation, 
  Box, 
  Video, 
  Camera, 
  Glasses, 
  Leaf,
  Moon,
  Lock,
  Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface ModeConfig {
  mode: UiMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  shortcuts: string[];
  requiresPremium?: boolean;
}

const MODE_CONFIGS: ModeConfig[] = [
  {
    mode: UiMode.CLASSIC,
    label: 'Classic',
    icon: Navigation,
    description: 'Traditional 2D map navigation',
    shortcuts: ['1'],
    requiresPremium: false
  },
  {
    mode: UiMode.THREED,
    label: '3D',
    icon: Box,
    description: 'Interactive 3D map with terrain',
    shortcuts: ['2'],
    requiresPremium: true
  },
  {
    mode: UiMode.CINEMATIC,
    label: 'Cinematic',
    icon: Video,
    description: 'Immersive camera following',
    shortcuts: ['3', 'c', 'C'],
    requiresPremium: true
  },
  {
    mode: UiMode.AR,
    label: 'AR',
    icon: Camera,
    description: 'Augmented reality overlay',
    shortcuts: ['4', 'a', 'A'],
    requiresPremium: true
  },
  {
    mode: UiMode.VR,
    label: 'VR',
    icon: Glasses,
    description: 'Virtual reality mode',
    shortcuts: ['5'],
    requiresPremium: false
  },
  {
    mode: UiMode.ECO,
    label: 'Eco',
    icon: Leaf,
    description: 'Energy-efficient minimal UI',
    shortcuts: ['6', 'e', 'E'],
    requiresPremium: false
  },
  {
    mode: UiMode.NIGHT_VISION,
    label: 'Night Vision',
    icon: Moon,
    description: 'AI-powered night driving assist',
    shortcuts: ['7', 'n', 'N'],
    requiresPremium: true
  }
];

interface ModeSwitcherProps {
  className?: string;
  onModeChange?: (mode: UiMode) => void;
  onUpgradeClick?: () => void;
}

export function ModeSwitcher({ className, onModeChange, onUpgradeClick }: ModeSwitcherProps) {
  const [currentMode, setCurrentMode] = useState<UiMode>(ModeService.getMode());
  const [canUsePremium, setCanUsePremium] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkEntitlements = () => {
      const canUse = monetizationService.canUse3D();
      setCanUsePremium(canUse);
      
      // If entitlements revoked and user is in a premium mode, force downgrade
      // Query ModeService directly to avoid stale React state
      const actualMode = ModeService.getMode();
      const currentConfig = MODE_CONFIGS.find(c => c.mode === actualMode);
      
      // Night Vision requires Pro tier specifically, other premium modes require Premium tier
      if (actualMode === UiMode.NIGHT_VISION) {
        const hasProTier = monetizationService.hasFeature('pro');
        if (!hasProTier) {
          ModeService.setMode(UiMode.CLASSIC);
        }
      } else if (!canUse && currentConfig?.requiresPremium && actualMode !== UiMode.CLASSIC) {
        // Only downgrade if needed - prevents infinite loops
        ModeService.setMode(UiMode.CLASSIC);
      }
    };

    checkEntitlements();
    const unsubscribe = monetizationService.subscribe(() => {
      checkEntitlements();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Subscribe to mode changes from service
    const unsubscribe = ModeService.onChange((mode) => {
      setCurrentMode(mode);
      onModeChange?.(mode);
      
      // Validate entitlements on every mode change (use passed mode param to avoid race)
      // Only validate if switching TO a premium mode (not FROM one)
      if (mode !== UiMode.CLASSIC) {
        // Night Vision requires Pro tier specifically
        if (mode === UiMode.NIGHT_VISION) {
          const hasProTier = monetizationService.hasFeature('pro');
          if (!hasProTier) {
            ModeService.setMode(UiMode.CLASSIC);
          }
        } else {
          const canUse = monetizationService.canUse3D();
          const modeConfig = MODE_CONFIGS.find(c => c.mode === mode);
          if (!canUse && modeConfig?.requiresPremium) {
            // Force downgrade if user switched to a premium mode without access
            ModeService.setMode(UiMode.CLASSIC);
          }
        }
      }
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
      const config = MODE_CONFIGS.find(c => c.shortcuts.includes(key));
      
      if (config) {
        e.preventDefault();
        handleModeSelect(config.mode, config);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [canUsePremium, onUpgradeClick]);

  const handleModeSelect = (mode: UiMode, config: ModeConfig) => {
    // Check regional availability first
    const isRegionallyAvailable = featureFlagsService.isModeAvailable(mode);
    if (!isRegionallyAvailable) {
      toast({
        title: `${config.label} Not Available`,
        description: `This feature is not available in your region.`,
        variant: 'destructive',
      });
      return;
    }

    // Check premium access - Night Vision requires Pro tier specifically
    if (mode === UiMode.NIGHT_VISION) {
      const hasProTier = monetizationService.hasFeature('pro');
      if (!hasProTier) {
        toast({
          title: 'Pro Tier Required',
          description: 'Night Vision is a Pro-exclusive feature. Upgrade to unlock AI-powered night driving assistance.',
          variant: 'destructive',
        });
        onUpgradeClick?.();
        return;
      }
    } else if (config.requiresPremium && !canUsePremium) {
      onUpgradeClick?.();
      return;
    }
    
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
        // Night Vision requires Pro tier specifically
        const isLocked = config.mode === UiMode.NIGHT_VISION 
          ? !monetizationService.hasFeature('pro')
          : config.requiresPremium && !canUsePremium;

        return (
          <Tooltip key={config.mode}>
            <TooltipTrigger asChild>
              <div className="relative">
                <Button
                  size="icon"
                  variant={isActive ? "default" : "ghost"}
                  onClick={() => handleModeSelect(config.mode, config)}
                  aria-pressed={isActive}
                  aria-label={`${config.label} mode (${config.shortcuts.join('/')})`}
                  className={cn(
                    "h-9 w-9 transition-all",
                    isActive && "shadow-sm",
                    isLocked && "opacity-60"
                  )}
                  data-testid={`button-mode-${config.mode.toLowerCase()}`}
                >
                  {isLocked ? (
                    <Lock className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </Button>
                {isLocked && (
                  <Badge 
                    variant="secondary" 
                    className="absolute -top-1 -right-1 h-3 w-3 p-0 flex items-center justify-center text-[8px] pointer-events-none"
                    data-testid={`badge-premium-${config.mode.toLowerCase()}`}
                  >
                    P
                  </Badge>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              <div className="font-medium flex items-center gap-1">
                {config.label}
                {isLocked && <Lock className="h-3 w-3 text-primary" />}
              </div>
              <div className="text-muted-foreground">{config.description}</div>
              {isLocked ? (
                <div className="text-primary mt-1 font-medium">
                  {config.mode === UiMode.NIGHT_VISION ? 'Pro feature - Click to upgrade' : 'Premium feature - Click to upgrade'}
                </div>
              ) : (
                <div className="text-muted-foreground mt-1">
                  Press {config.shortcuts.map((key, i) => (
                    <span key={key}>
                      {i > 0 && ' or '}
                      <kbd className="px-1 py-0.5 bg-muted rounded text-xs">{key}</kbd>
                    </span>
                  ))}
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
export function ModeSwitcherCompact({ className, onModeChange, onUpgradeClick }: ModeSwitcherProps) {
  const [currentMode, setCurrentMode] = useState<UiMode>(ModeService.getMode());
  const [canUsePremium, setCanUsePremium] = useState(false);

  useEffect(() => {
    const checkEntitlements = () => {
      const canUse = monetizationService.canUse3D();
      setCanUsePremium(canUse);
      
      // If entitlements revoked and user is in a premium mode, force downgrade
      // Query ModeService directly to avoid stale React state
      const actualMode = ModeService.getMode();
      const currentConfig = MODE_CONFIGS.find(c => c.mode === actualMode);
      
      // Night Vision requires Pro tier specifically, other premium modes require Premium tier
      if (actualMode === UiMode.NIGHT_VISION) {
        const hasProTier = monetizationService.hasFeature('pro');
        if (!hasProTier) {
          ModeService.setMode(UiMode.CLASSIC);
        }
      } else if (!canUse && currentConfig?.requiresPremium && actualMode !== UiMode.CLASSIC) {
        // Only downgrade if needed - prevents infinite loops
        ModeService.setMode(UiMode.CLASSIC);
      }
    };

    checkEntitlements();
    const unsubscribe = monetizationService.subscribe(() => {
      checkEntitlements();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = ModeService.onChange((mode) => {
      setCurrentMode(mode);
      onModeChange?.(mode);
      
      // Validate entitlements on every mode change (use passed mode param to avoid race)
      // Only validate if switching TO a premium mode (not FROM one)
      if (mode !== UiMode.CLASSIC) {
        // Night Vision requires Pro tier specifically
        if (mode === UiMode.NIGHT_VISION) {
          const hasProTier = monetizationService.hasFeature('pro');
          if (!hasProTier) {
            ModeService.setMode(UiMode.CLASSIC);
          }
        } else {
          const canUse = monetizationService.canUse3D();
          const modeConfig = MODE_CONFIGS.find(c => c.mode === mode);
          if (!canUse && modeConfig?.requiresPremium) {
            // Force downgrade if user switched to a premium mode without access
            ModeService.setMode(UiMode.CLASSIC);
          }
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [onModeChange]);

  const handleModeSelect = (mode: UiMode, config: ModeConfig) => {
    // Check regional availability first
    const isRegionallyAvailable = featureFlagsService.isModeAvailable(mode);
    if (!isRegionallyAvailable) {
      return; // Silently ignore for compact mode (no space for toast)
    }

    // Check premium access - Night Vision requires Pro tier specifically
    if (mode === UiMode.NIGHT_VISION) {
      const hasProTier = monetizationService.hasFeature('pro');
      if (!hasProTier) {
        onUpgradeClick?.();
        return;
      }
    } else if (config.requiresPremium && !canUsePremium) {
      onUpgradeClick?.();
      return;
    }
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
          // Night Vision requires Pro tier specifically
          const isLocked = config.mode === UiMode.NIGHT_VISION 
            ? !monetizationService.hasFeature('pro')
            : config.requiresPremium && !canUsePremium;
          
          return (
            <button
              key={config.mode}
              onClick={() => handleModeSelect(config.mode, config)}
              aria-pressed={isActive}
              aria-label={`${config.label}${isLocked ? ' (Premium)' : ''}`}
              className={cn(
                "h-1.5 w-1.5 rounded-full transition-all",
                isActive ? "bg-primary w-4" : isLocked ? "bg-muted-foreground/50 hover:bg-primary/50" : "bg-muted hover:bg-muted-foreground/30"
              )}
              data-testid={`button-mode-dot-${config.mode.toLowerCase()}-${index}`}
            />
          );
        })}
      </div>
    </div>
  );
}
