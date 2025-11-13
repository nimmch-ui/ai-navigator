import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Volume2, VolumeX, AlertTriangle, Camera, Gauge, Vibrate, Sparkles, Globe, Cloud, CloudOff, RefreshCw, Trash2, LogIn, LogOut, User, Crown } from 'lucide-react';
import { EventBus } from '@/services/eventBus';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import type { TransportMode, RoutePreference, VehicleType, SpeedUnit, VoiceStyle } from '@/services/preferences';
import type { Region } from '@/services/data/types';
import { UiMode } from '@/types/ui';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { syncService } from '@/services/sync/SyncService';
import { userDataStore } from '@/services/data/UserDataStore';
import { authProvider } from '@/services/auth/AuthProvider';
import { useSubscription } from '@/hooks/useSubscription';
import { Paywall } from '@/components/Paywall';

interface SettingsProps {
  // Immersive Experience
  uiMode: UiMode;
  onUiModeChange: (mode: UiMode) => void;
  spatialAudio: boolean;
  onSpatialAudioChange: (enabled: boolean) => void;
  ambientMusic: boolean;
  onAmbientMusicChange: (enabled: boolean) => void;
  // Navigation
  transportMode: TransportMode;
  onTransportModeChange: (mode: TransportMode) => void;
  routePreference: RoutePreference;
  onRoutePreferenceChange: (pref: RoutePreference) => void;
  ecoMode: boolean;
  onEcoModeChange: (enabled: boolean) => void;
  vehicleType: VehicleType;
  onVehicleTypeChange: (type: VehicleType) => void;
  voiceEnabled: boolean;
  onVoiceEnabledChange: (enabled: boolean) => void;
  voiceVolume: number;
  onVoiceVolumeChange: (volume: number) => void;
  voiceStyle: VoiceStyle;
  onVoiceStyleChange: (style: VoiceStyle) => void;
  emotionAdaptive: boolean;
  onEmotionAdaptiveChange: (enabled: boolean) => void;
  hapticsEnabled: boolean;
  onHapticsEnabledChange: (enabled: boolean) => void;
  hapticsIntensity: number;
  onHapticsIntensityChange: (intensity: number) => void;
  hazardAlertsEnabled: boolean;
  onHazardAlertsChange: (enabled: boolean) => void;
  voiceSupported: boolean;
  hapticsSupported: boolean;
  showSpeedCameras: boolean;
  onShowSpeedCamerasChange: (enabled: boolean) => void;
  speedWarnings: boolean;
  onSpeedWarningsChange: (enabled: boolean) => void;
  speedUnit: SpeedUnit;
  onSpeedUnitChange: (unit: SpeedUnit) => void;
  // Realism Pack
  weatherLighting: boolean;
  onWeatherLightingChange: (enabled: boolean) => void;
  motionPolish: boolean;
  onMotionPolishChange: (enabled: boolean) => void;
  radarPulse: boolean;
  onRadarPulseChange: (enabled: boolean) => void;
  // Night Vision (Pro Tier)
  nightVisionIntensity: number;
  onNightVisionIntensityChange: (intensity: number) => void;
  nightVisionThermalMode: boolean;
  onNightVisionThermalModeChange: (enabled: boolean) => void;
  // Regional Data Providers
  region: Region;
  onRegionChange: (region: Region) => void;
}

export default function Settings({
  uiMode,
  onUiModeChange,
  spatialAudio,
  onSpatialAudioChange,
  ambientMusic,
  onAmbientMusicChange,
  transportMode,
  onTransportModeChange,
  routePreference,
  onRoutePreferenceChange,
  ecoMode,
  onEcoModeChange,
  vehicleType,
  onVehicleTypeChange,
  voiceEnabled,
  onVoiceEnabledChange,
  voiceVolume,
  onVoiceVolumeChange,
  voiceStyle,
  onVoiceStyleChange,
  emotionAdaptive,
  onEmotionAdaptiveChange,
  hapticsEnabled,
  onHapticsEnabledChange,
  hapticsIntensity,
  onHapticsIntensityChange,
  hazardAlertsEnabled,
  onHazardAlertsChange,
  voiceSupported,
  hapticsSupported,
  showSpeedCameras,
  onShowSpeedCamerasChange,
  speedWarnings,
  onSpeedWarningsChange,
  speedUnit,
  onSpeedUnitChange,
  weatherLighting,
  onWeatherLightingChange,
  motionPolish,
  onMotionPolishChange,
  radarPulse,
  onRadarPulseChange,
  nightVisionIntensity,
  onNightVisionIntensityChange,
  nightVisionThermalMode,
  onNightVisionThermalModeChange,
  region,
  onRegionChange
}: SettingsProps) {
  const { toast } = useToast();
  const { t, locale, changeLocale, availableLocales, getLocaleName } = useTranslation();
  
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [authState, setAuthState] = useState(authProvider.getState());
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(syncService.getLastSyncTime());
  const [showSignIn, setShowSignIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  
  const { subscription, currentTier, hasFeature } = useSubscription();

  useEffect(() => {
    setSyncEnabled(syncService.isSyncEnabled());
    userDataStore.getIdentity().then(id => setUserId(id));

    const unsubscribe = EventBus.subscribe('sync:identityChanged', ({ canonicalUserId }) => {
      console.log('[Settings] Identity changed to:', canonicalUserId);
      setUserId(canonicalUserId);
    });
    
    const authUnsubscribe = authProvider.subscribe((state) => {
      setAuthState(state);
    });
    
    const syncCompletedUnsubscribe = EventBus.subscribe('sync:completed', () => {
      setLastSyncTime(syncService.getLastSyncTime());
    });
    
    const syncEnabledUnsubscribe = EventBus.subscribe('sync:enabled', () => {
      setSyncEnabled(true);
    });
    
    const syncDisabledUnsubscribe = EventBus.subscribe('sync:disabled', () => {
      setSyncEnabled(false);
    });

    return () => {
      unsubscribe();
      authUnsubscribe();
      syncCompletedUnsubscribe();
      syncEnabledUnsubscribe();
      syncDisabledUnsubscribe();
    };
  }, []);

  const handleSyncToggle = async (enabled: boolean) => {
    syncService.setSyncEnabled(enabled);
    setSyncEnabled(enabled);
    
    if (enabled) {
      toast({
        title: 'Cloud Sync Enabled',
        description: 'Performing initial sync...',
      });
      
      setIsSyncing(true);
      const result = await syncService.syncAll();
      setIsSyncing(false);
      
      if (result.success) {
        if (result.canonicalUserId) {
          setUserId(result.canonicalUserId);
        }
        toast({
          title: 'Sync Complete',
          description: 'Your data is now synced across devices.',
        });
      } else if (result.error) {
        toast({
          title: 'Sync Failed',
          description: result.error,
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'Cloud Sync Disabled',
        description: 'Data will only be stored locally on this device.',
      });
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    const result = await syncService.syncAll();
    setIsSyncing(false);

    if (result.success) {
      if (result.canonicalUserId) {
        setUserId(result.canonicalUserId);
      }
      toast({
        title: 'Sync Complete',
        description: `Synced ${result.recordsPushed || 0} records. All data is up to date.`,
      });
    } else {
      toast({
        title: 'Sync Failed',
        description: result.error || 'Unknown error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleClearCloud = async () => {
    try {
      await syncService.clearCloudData();
      toast({
        title: 'Cloud Data Cleared',
        description: 'Your cloud backup has been removed. Local data is unchanged.',
      });
    } catch (error) {
      toast({
        title: 'Failed to Clear',
        description: 'Could not clear cloud data. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  const handleSignIn = async (method: 'email' | 'google' | 'apple') => {
    if (method === 'email') {
      if (!email || !password) {
        toast({
          title: 'Missing credentials',
          description: 'Please enter both email and password',
          variant: 'destructive',
        });
        return;
      }

      setIsLoggingIn(true);
      try {
        await authProvider.login(email, password);
        setShowSignIn(false);
        setEmail('');
        setPassword('');
        
        toast({
          title: 'Signed in successfully',
          description: 'Your data will sync automatically',
        });
      } catch (error) {
        toast({
          title: 'Sign in failed',
          description: error instanceof Error ? error.message : 'Please try again',
          variant: 'destructive',
        });
      } finally {
        setIsLoggingIn(false);
      }
    } else if (method === 'google') {
      setIsLoggingIn(true);
      try {
        await authProvider.loginWithGoogle();
        setShowSignIn(false);
        
        toast({
          title: 'Signed in with Google',
          description: 'Your data will sync automatically',
        });
      } catch (error) {
        toast({
          title: 'Google sign in failed',
          description: error instanceof Error ? error.message : 'Please try again',
          variant: 'destructive',
        });
      } finally {
        setIsLoggingIn(false);
      }
    } else if (method === 'apple') {
      setIsLoggingIn(true);
      try {
        await authProvider.loginWithApple();
        setShowSignIn(false);
        
        toast({
          title: 'Signed in with Apple',
          description: 'Your data will sync automatically',
        });
      } catch (error) {
        toast({
          title: 'Apple sign in failed',
          description: error instanceof Error ? error.message : 'Please try again',
          variant: 'destructive',
        });
      } finally {
        setIsLoggingIn(false);
      }
    }
  };
  
  const handleSignOut = async () => {
    try {
      await authProvider.logout();
      setShowSignIn(false);
      toast({
        title: 'Signed out',
        description: 'You have been signed out successfully',
      });
    } catch (error) {
      toast({
        title: 'Sign out failed',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    }
  };
  
  const formatLastSync = (timestamp: number | null): string => {
    if (!timestamp) return 'Never';
    
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  /**
   * Handle UI Mode change with AR permission request for iOS compatibility
   * iOS 13+ requires DeviceOrientation permission from user gesture
   */
  const handleUiModeChange = async (value: string) => {
    const newMode = value as UiMode;
    
    // If switching to AR mode, request orientation permission first (iOS requirement)
    if (newMode === UiMode.AR) {
      try {
        // Check if DeviceOrientationEvent.requestPermission exists (iOS 13+)
        if (typeof DeviceOrientationEvent !== 'undefined' && 
            typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
          const permission = await (DeviceOrientationEvent as any).requestPermission();
          
          if (permission !== 'granted') {
            // Store denied status for ARView to read
            localStorage.setItem('ar_orientation_permission', 'denied');
            toast({
              title: t('settings.ar_unavailable_title'),
              description: t('settings.ar_unavailable_desc'),
              variant: 'destructive',
            });
            // Stay in current mode
            return;
          }
          
          // Store granted status so ARView can read it
          localStorage.setItem('ar_orientation_permission', 'granted');
        } else {
          // Non-iOS browsers - permission not needed, mark as granted
          localStorage.setItem('ar_orientation_permission', 'granted');
        }
        
        // Permission granted or not needed (non-iOS), proceed to AR mode
        onUiModeChange(newMode);
      } catch (error) {
        console.error('[Settings] Failed to request orientation permission:', error);
        toast({
          title: t('settings.ar_error_title'),
          description: t('settings.ar_error_desc'),
          variant: 'destructive',
        });
        // Fallback to 3D mode on error
        onUiModeChange(UiMode.THREED);
      }
    } else {
      // For non-AR modes, switch directly
      onUiModeChange(newMode);
    }
  };

  return (
    <>
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          data-testid="button-open-settings"
        >
          <SettingsIcon className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 max-h-[80vh] overflow-y-auto" data-testid="settings-panel">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-sm mb-1">{t('settings.title')}</h3>
            <p className="text-xs text-muted-foreground">{t('settings.description')}</p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" />
              {t('settings.language')}
            </Label>
            <Select
              value={locale}
              onValueChange={(value) => changeLocale(value as any)}
              data-testid="select-language"
            >
              <SelectTrigger data-testid="button-language-trigger">
                <SelectValue placeholder={t('settings.language_placeholder')} />
              </SelectTrigger>
              <SelectContent>
                {availableLocales.map((loc) => (
                  <SelectItem key={loc} value={loc} data-testid={`select-language-${loc}`}>
                    {getLocaleName(loc)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-sm mb-1 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              {t('settings.immersive_experience')}
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              {t('settings.immersive_description')}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('settings.ui_mode')}</Label>
            <RadioGroup
              value={uiMode}
              onValueChange={handleUiModeChange}
              data-testid="radio-ui-mode"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={UiMode.CLASSIC} id="ui-classic" data-testid="radio-ui-classic" />
                <Label htmlFor="ui-classic" className="text-sm font-normal cursor-pointer">
                  {t('mode.classic')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={UiMode.THREED} id="ui-threed" data-testid="radio-ui-threed" />
                <Label htmlFor="ui-threed" className="text-sm font-normal cursor-pointer">
                  {t('mode.3d_mode')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={UiMode.CINEMATIC} id="ui-cinematic" data-testid="radio-ui-cinematic" />
                <Label htmlFor="ui-cinematic" className="text-sm font-normal cursor-pointer">
                  {t('mode.cinematic')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={UiMode.AR} id="ui-ar" data-testid="radio-ui-ar" />
                <Label htmlFor="ui-ar" className="text-sm font-normal cursor-pointer">
                  {t('mode.ar_preview')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={UiMode.VR} id="ui-vr" data-testid="radio-ui-vr" />
                <Label htmlFor="ui-vr" className="text-sm font-normal cursor-pointer">
                  {t('mode.vr_future')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={UiMode.ECO} id="ui-eco" data-testid="radio-ui-eco" />
                <Label htmlFor="ui-eco" className="text-sm font-normal cursor-pointer">
                  {t('mode.eco_optimized')}
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="spatial-audio" className="text-sm font-medium">
                {t('settings.spatial_audio')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('settings.spatial_audio_desc')}
              </p>
            </div>
            <Switch
              id="spatial-audio"
              checked={spatialAudio}
              onCheckedChange={onSpatialAudioChange}
              data-testid="switch-spatial-audio"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="ambient-music" className="text-sm font-medium">
                {t('settings.ambient_music')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('settings.ambient_music_desc')}
              </p>
            </div>
            <Switch
              id="ambient-music"
              checked={ambientMusic}
              onCheckedChange={onAmbientMusicChange}
              data-testid="switch-ambient-music"
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('settings.transport_mode')}</Label>
            <RadioGroup
              value={transportMode}
              onValueChange={(value) => onTransportModeChange(value as TransportMode)}
              data-testid="radio-transport-mode"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="car" id="transport-car" data-testid="radio-transport-car" />
                <Label htmlFor="transport-car" className="text-sm font-normal cursor-pointer">
                  {t('settings.transport_car')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bike" id="transport-bike" data-testid="radio-transport-bike" />
                <Label htmlFor="transport-bike" className="text-sm font-normal cursor-pointer">
                  {t('settings.transport_bike')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="walk" id="transport-walk" data-testid="radio-transport-walk" />
                <Label htmlFor="transport-walk" className="text-sm font-normal cursor-pointer">
                  {t('settings.transport_walk')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="transit" id="transport-transit" data-testid="radio-transport-transit" />
                <Label htmlFor="transport-transit" className="text-sm font-normal cursor-pointer">
                  {t('settings.transport_transit')}
                </Label>
              </div>
            </RadioGroup>
          </div>

          {(transportMode === "car" || transportMode === "bike") && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('settings.route_preference')}</Label>
                <RadioGroup
                  value={routePreference}
                  onValueChange={(value) => onRoutePreferenceChange(value as RoutePreference)}
                  data-testid="radio-route-preference"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fastest" id="route-fastest" data-testid="radio-route-fastest" />
                    <Label htmlFor="route-fastest" className="text-sm font-normal cursor-pointer">
                      {t('settings.route_fastest')}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="shortest" id="route-shortest" data-testid="radio-route-shortest" />
                    <Label htmlFor="route-shortest" className="text-sm font-normal cursor-pointer">
                      {t('settings.route_shortest')}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="eco" id="route-eco" data-testid="radio-route-eco" />
                    <Label htmlFor="route-eco" className="text-sm font-normal cursor-pointer">
                      {t('settings.route_eco')}
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </>
          )}

          {transportMode === "car" && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('settings.vehicle_type')}</Label>
                <RadioGroup
                  value={vehicleType}
                  onValueChange={(value) => onVehicleTypeChange(value as VehicleType)}
                  data-testid="radio-vehicle-type"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="car" id="vehicle-car" data-testid="radio-vehicle-car" />
                    <Label htmlFor="vehicle-car" className="text-sm font-normal cursor-pointer">
                      {t('settings.vehicle_car')}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="ev" id="vehicle-ev" data-testid="radio-vehicle-ev" />
                    <Label htmlFor="vehicle-ev" className="text-sm font-normal cursor-pointer">
                      {t('settings.vehicle_ev')}
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </>
          )}

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="eco-mode" className="text-sm font-medium">
                {t('settings.eco_mode')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('settings.eco_mode_desc')}
              </p>
            </div>
            <Switch
              id="eco-mode"
              checked={ecoMode}
              onCheckedChange={onEcoModeChange}
              data-testid="switch-eco-mode"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="voice-guidance" className="text-sm font-medium">
                {t('settings.voice_guidance')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {voiceSupported
                  ? t('settings.voice_guidance_desc')
                  : t('settings.voice_not_supported')}
              </p>
            </div>
            <Switch
              id="voice-guidance"
              checked={voiceEnabled}
              onCheckedChange={onVoiceEnabledChange}
              disabled={!voiceSupported}
              data-testid="switch-voice-guidance"
            />
          </div>

          {voiceEnabled && voiceSupported && (
            <div className="space-y-3 pl-4 border-l-2 border-muted">
              <div className="space-y-1">
                <Label htmlFor="voice-volume" className="text-xs font-medium flex items-center gap-2">
                  <Volume2 className="h-3 w-3" />
                  {t('settings.voice_volume')}: {Math.round(voiceVolume * 100)}%
                </Label>
                <Slider
                  id="voice-volume"
                  min={0}
                  max={100}
                  step={5}
                  value={[voiceVolume * 100]}
                  onValueChange={(value) => onVoiceVolumeChange(value[0] / 100)}
                  className="py-2"
                  data-testid="slider-voice-volume"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs font-medium">{t('settings.voice_style')}</Label>
                <RadioGroup
                  value={voiceStyle}
                  onValueChange={(value) => onVoiceStyleChange(value as VoiceStyle)}
                  data-testid="radio-voice-style"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="neutral" id="voice-neutral" data-testid="radio-voice-neutral" />
                    <Label htmlFor="voice-neutral" className="text-xs font-normal cursor-pointer">
                      {t('settings.voice_neutral')}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="warm" id="voice-warm" data-testid="radio-voice-warm" />
                    <Label htmlFor="voice-warm" className="text-xs font-normal cursor-pointer">
                      {t('settings.voice_warm')}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="energetic" id="voice-energetic" data-testid="radio-voice-energetic" />
                    <Label htmlFor="voice-energetic" className="text-xs font-normal cursor-pointer">
                      {t('settings.voice_energetic')}
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="emotion-adaptive" className="text-xs font-medium">
                  {t('settings.emotion_adaptive')}
                </Label>
                <Switch
                  id="emotion-adaptive"
                  checked={emotionAdaptive}
                  onCheckedChange={onEmotionAdaptiveChange}
                  data-testid="switch-emotion-adaptive"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {t('settings.emotion_adaptive_desc')}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="space-y-0.5 flex items-center gap-2">
              <Vibrate className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="haptics" className="text-sm font-medium">
                  {t('settings.haptic_feedback')}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {hapticsSupported
                    ? t('settings.haptic_feedback_desc')
                    : t('settings.haptic_not_supported')}
                </p>
              </div>
            </div>
            <Switch
              id="haptics"
              checked={hapticsEnabled}
              onCheckedChange={onHapticsEnabledChange}
              disabled={!hapticsSupported}
              data-testid="switch-haptics"
            />
          </div>

          {hapticsEnabled && hapticsSupported && (
            <div className="space-y-1 pl-4 border-l-2 border-muted">
              <Label htmlFor="haptics-intensity" className="text-xs font-medium">
                {t('settings.haptic_intensity')}: {Math.round(hapticsIntensity * 100)}%
              </Label>
              <Slider
                id="haptics-intensity"
                min={50}
                max={150}
                step={10}
                value={[hapticsIntensity * 100]}
                onValueChange={(value) => onHapticsIntensityChange(value[0] / 100)}
                className="py-2"
                data-testid="slider-haptics-intensity"
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="space-y-0.5 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="hazard-alerts" className="text-sm font-medium">
                  {t('settings.hazard_alerts')}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t('settings.hazard_alerts_desc')}
                </p>
              </div>
            </div>
            <Switch
              id="hazard-alerts"
              checked={hazardAlertsEnabled}
              onCheckedChange={onHazardAlertsChange}
              data-testid="switch-hazard-alerts"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5 flex items-center gap-2">
              <Camera className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="show-cameras" className="text-sm font-medium">
                  {t('settings.show_cameras')}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t('settings.show_cameras_desc')}
                </p>
              </div>
            </div>
            <Switch
              id="show-cameras"
              checked={showSpeedCameras}
              onCheckedChange={onShowSpeedCamerasChange}
              data-testid="switch-show-cameras"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5 flex items-center gap-2">
              <Gauge className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="speed-warnings" className="text-sm font-medium">
                  {t('settings.speed_warnings')}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t('settings.speed_warnings_desc')}
                </p>
              </div>
            </div>
            <Switch
              id="speed-warnings"
              checked={speedWarnings}
              onCheckedChange={onSpeedWarningsChange}
              data-testid="switch-speed-warnings"
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('settings.speed_unit')}</Label>
            <RadioGroup
              value={speedUnit}
              onValueChange={(value) => onSpeedUnitChange(value as SpeedUnit)}
              data-testid="radio-speed-unit"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="kmh" id="unit-kmh" data-testid="radio-unit-kmh" />
                <Label htmlFor="unit-kmh" className="text-sm font-normal cursor-pointer">
                  {t('settings.speed_unit_kmh')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="mph" id="unit-mph" data-testid="radio-unit-mph" />
                <Label htmlFor="unit-mph" className="text-sm font-normal cursor-pointer">
                  {t('settings.speed_unit_mph')}
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-sm mb-1">Regional Data Providers</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Configure data sources for maps, traffic, weather, and radar based on your region.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Region</Label>
            <Select value={region} onValueChange={(value) => onRegionChange(value as Region)}>
              <SelectTrigger data-testid="select-region">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EU" data-testid="select-region-eu">Europe (EU)</SelectItem>
                <SelectItem value="CH" data-testid="select-region-ch">China (CH)</SelectItem>
                <SelectItem value="US" data-testid="select-region-us">United States (US)</SelectItem>
                <SelectItem value="IN" data-testid="select-region-in">India (IN)</SelectItem>
                <SelectItem value="ME" data-testid="select-region-me">Middle East (ME)</SelectItem>
                <SelectItem value="GLOBAL" data-testid="select-region-global">Global (Auto-detect)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Providers are automatically selected based on your region for optimal performance.
            </p>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-sm mb-1">{t('settings.realism_pack')}</h3>
            <p className="text-xs text-muted-foreground mb-3">
              {t('settings.realism_pack_desc')}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="weather-lighting" className="text-sm font-medium">
                {t('settings.weather_lighting')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('settings.weather_lighting_desc')}
              </p>
            </div>
            <Switch
              id="weather-lighting"
              checked={weatherLighting}
              onCheckedChange={onWeatherLightingChange}
              data-testid="switch-weather-lighting"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="motion-polish" className="text-sm font-medium">
                {t('settings.motion_polish')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('settings.motion_polish_desc')}
              </p>
            </div>
            <Switch
              id="motion-polish"
              checked={motionPolish}
              onCheckedChange={onMotionPolishChange}
              data-testid="switch-motion-polish"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="radar-pulse" className="text-sm font-medium">
                {t('settings.radar_pulse')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('settings.radar_pulse_desc')}
              </p>
            </div>
            <Switch
              id="radar-pulse"
              checked={radarPulse}
              onCheckedChange={onRadarPulseChange}
              data-testid="switch-radar-pulse"
            />
          </div>

          <Separator className="my-4" />

          <div data-testid="section-night-vision">
            <h3 className="font-semibold text-sm mb-1 flex items-center gap-2">
              {t('settings.night_vision')}
              <Crown className="h-4 w-4 text-primary" />
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              {t('settings.night_vision_desc')}
            </p>
          </div>

          {uiMode === UiMode.NIGHT_VISION && hasFeature('pro') && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="night-vision-intensity" className="text-sm font-medium">
                    {t('settings.night_vision_intensity')}
                  </Label>
                  <span className="text-xs text-muted-foreground">{nightVisionIntensity}%</span>
                </div>
                <Slider
                  id="night-vision-intensity"
                  min={10}
                  max={100}
                  step={5}
                  value={[nightVisionIntensity]}
                  onValueChange={(values) => onNightVisionIntensityChange(values[0])}
                  data-testid="slider-night-vision-intensity"
                />
                <p className="text-xs text-muted-foreground">
                  {t('settings.night_vision_intensity_desc')}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="thermal-mode" className="text-sm font-medium">
                    {t('settings.thermal_mode')}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t('settings.thermal_mode_desc')}
                  </p>
                </div>
                <Switch
                  id="thermal-mode"
                  checked={nightVisionThermalMode}
                  onCheckedChange={onNightVisionThermalModeChange}
                  data-testid="switch-thermal-mode"
                />
              </div>
            </>
          )}

          {uiMode !== UiMode.NIGHT_VISION && (
            <p className="text-xs text-muted-foreground italic">
              {t('settings.night_vision_inactive')}
            </p>
          )}

          {!hasFeature('pro') && (
            <p className="text-xs text-primary italic flex items-center gap-1">
              <Crown className="h-3 w-3" />
              {t('settings.night_vision_pro_required')}
            </p>
          )}

          <Separator />

          <div>
            <h3 className="font-semibold text-sm mb-1 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              Account
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Sign in to sync your favorites, routes, and preferences across all your devices.
            </p>
          </div>

          {authState.isAuthenticated ? (
            <Card className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Signed in as</p>
                  <p className="text-sm font-medium" data-testid="text-username">
                    {authState.session?.username || 'Unknown User'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  data-testid="button-signout"
                >
                  <LogOut className="h-3.5 w-3.5 mr-1.5" />
                  Sign Out
                </Button>
              </div>

              <Separator />

              <div className="flex items-center gap-2 text-xs">
                <Cloud className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Last sync:</span>
                <span className="font-medium" data-testid="text-lastsync">
                  {formatLastSync(lastSyncTime)}
                </span>
              </div>
            </Card>
          ) : (
            <div className="space-y-2">
              {!showSignIn ? (
                <Button
                  onClick={() => setShowSignIn(true)}
                  size="sm"
                  className="w-full"
                  data-testid="button-signin"
                >
                  <LogIn className="h-3.5 w-3.5 mr-1.5" />
                  Sign In
                </Button>
              ) : (
                <div className="space-y-3 p-3 border rounded-md">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-8 text-sm"
                      data-testid="input-email"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-xs">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSignIn('email');
                        }
                      }}
                      className="h-8 text-sm"
                      data-testid="input-password"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleSignIn('email')}
                      disabled={isLoggingIn}
                      size="sm"
                      className="flex-1"
                      data-testid="button-signin-email"
                    >
                      {isLoggingIn ? 'Signing in...' : 'Sign In'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowSignIn(false);
                        setEmail('');
                        setPassword('');
                      }}
                      disabled={isLoggingIn}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                  </div>

                  <Separator />

                  <div className="space-y-1.5">
                    <Button
                      variant="outline"
                      onClick={() => handleSignIn('google')}
                      size="sm"
                      className="w-full"
                      data-testid="button-signin-google"
                    >
                      <svg className="h-3.5 w-3.5 mr-1.5" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      Google
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => handleSignIn('apple')}
                      size="sm"
                      className="w-full"
                      data-testid="button-signin-apple"
                    >
                      <svg className="h-3.5 w-3.5 mr-1.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                      </svg>
                      Apple
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground text-center">
                    No account? One will be created automatically.
                  </p>
                </div>
              )}
            </div>
          )}

          <Separator />

          <div>
            <h3 className="font-semibold text-sm mb-1 flex items-center gap-1.5">
              {syncEnabled ? <Cloud className="h-3.5 w-3.5" /> : <CloudOff className="h-3.5 w-3.5" />}
              Cloud Sync
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Keep your profile, favorites, and trip history synced across devices. Uses a local cloud simulation ready for real backend integration.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sync-enabled" className="text-sm font-medium">
                Enable multi-device sync
              </Label>
              <p className="text-xs text-muted-foreground">
                Data is stored anonymously and ready for cloud backup
              </p>
            </div>
            <Switch
              id="sync-enabled"
              checked={syncEnabled}
              onCheckedChange={handleSyncToggle}
              data-testid="switch-sync-enabled"
            />
          </div>

          {syncEnabled && (
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleSyncNow}
                disabled={isSyncing}
                data-testid="button-sync-now"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleClearCloud}
                data-testid="button-clear-cloud"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Cloud Copy
              </Button>
              
              <p className="text-xs text-muted-foreground">
                Anonymous ID: {userId.substring(0, 8)}...
              </p>
            </div>
          )}

          <Separator />

          <div>
            <h3 className="font-semibold text-sm mb-1 flex items-center gap-1.5">
              <Crown className="h-3.5 w-3.5" />
              Subscription
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Current plan: <span className="font-semibold capitalize">{currentTier}</span>
            </p>
          </div>

          <Button
            variant={currentTier === 'free' ? 'default' : 'outline'}
            size="sm"
            className="w-full"
            onClick={() => setShowPaywall(true)}
            data-testid="button-manage-subscription"
          >
            <Crown className="h-4 w-4 mr-2" />
            {currentTier === 'free' ? 'Upgrade to Premium' : 'Manage Subscription'}
          </Button>

          {subscription && subscription.currentPeriodEnd && (
            <p className="text-xs text-muted-foreground text-center">
              {subscription.cancelAtPeriodEnd
                ? `Expires on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                : `Renews on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`}
            </p>
          )}

          <Separator />

          {voiceEnabled && voiceSupported && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
              <Volume2 className="h-4 w-4" />
              <span>{t('settings.voice_announcements_enabled')}</span>
            </div>
          )}

          {!voiceSupported && (
            <div className="flex items-center gap-2 text-xs text-destructive pt-2 border-t">
              <VolumeX className="h-4 w-4" />
              <span>{t('settings.voice_not_available')}</span>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>

    {showPaywall && (
      <Paywall 
        open={showPaywall} 
        onOpenChange={setShowPaywall} 
        requiredTier="pro"
        feature="Night Vision Driving Assist"
      />
    )}
  </>
  );
}
