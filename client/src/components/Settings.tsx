import { Settings as SettingsIcon, Volume2, VolumeX, AlertTriangle, Camera, Gauge, Vibrate, Sparkles, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
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
  region,
  onRegionChange
}: SettingsProps) {
  const { toast } = useToast();
  const { t, locale, changeLocale, availableLocales, getLocaleName } = useTranslation();

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
  );
}
