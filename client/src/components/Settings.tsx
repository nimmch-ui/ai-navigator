import { Settings as SettingsIcon, Volume2, VolumeX, AlertTriangle, Camera, Gauge, Vibrate, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import type { TransportMode, RoutePreference, VehicleType, SpeedUnit } from '@/services/preferences';
import { UiMode } from '@/types/ui';

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
  hapticsEnabled: boolean;
  onHapticsEnabledChange: (enabled: boolean) => void;
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
  hapticsEnabled,
  onHapticsEnabledChange,
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
  onRadarPulseChange
}: SettingsProps) {
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
            <h3 className="font-semibold text-sm mb-1">Navigation Settings</h3>
            <p className="text-xs text-muted-foreground">Customize your navigation experience</p>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-sm mb-1 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Immersive Experience
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Choose your navigation mode
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">UI Mode</Label>
            <RadioGroup
              value={uiMode}
              onValueChange={(value) => onUiModeChange(value as UiMode)}
              data-testid="radio-ui-mode"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={UiMode.CLASSIC} id="ui-classic" data-testid="radio-ui-classic" />
                <Label htmlFor="ui-classic" className="text-sm font-normal cursor-pointer">
                  Classic
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={UiMode.THREED} id="ui-threed" data-testid="radio-ui-threed" />
                <Label htmlFor="ui-threed" className="text-sm font-normal cursor-pointer">
                  3D Mode
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={UiMode.CINEMATIC} id="ui-cinematic" data-testid="radio-ui-cinematic" />
                <Label htmlFor="ui-cinematic" className="text-sm font-normal cursor-pointer">
                  Cinematic
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={UiMode.AR} id="ui-ar" data-testid="radio-ui-ar" />
                <Label htmlFor="ui-ar" className="text-sm font-normal cursor-pointer">
                  AR Preview
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={UiMode.VR} id="ui-vr" data-testid="radio-ui-vr" />
                <Label htmlFor="ui-vr" className="text-sm font-normal cursor-pointer">
                  VR (Future)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={UiMode.ECO} id="ui-eco" data-testid="radio-ui-eco" />
                <Label htmlFor="ui-eco" className="text-sm font-normal cursor-pointer">
                  Eco Optimized
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="spatial-audio" className="text-sm font-medium">
                Spatial Audio
              </Label>
              <p className="text-xs text-muted-foreground">
                3D positional sound effects
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
                Ambient Music
              </Label>
              <p className="text-xs text-muted-foreground">
                Background music for navigation
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
            <Label className="text-sm font-medium">Transport Mode</Label>
            <RadioGroup
              value={transportMode}
              onValueChange={(value) => onTransportModeChange(value as TransportMode)}
              data-testid="radio-transport-mode"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="car" id="transport-car" data-testid="radio-transport-car" />
                <Label htmlFor="transport-car" className="text-sm font-normal cursor-pointer">
                  Car
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bike" id="transport-bike" data-testid="radio-transport-bike" />
                <Label htmlFor="transport-bike" className="text-sm font-normal cursor-pointer">
                  Bike
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="walk" id="transport-walk" data-testid="radio-transport-walk" />
                <Label htmlFor="transport-walk" className="text-sm font-normal cursor-pointer">
                  Walk
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="transit" id="transport-transit" data-testid="radio-transport-transit" />
                <Label htmlFor="transport-transit" className="text-sm font-normal cursor-pointer">
                  Public Transit
                </Label>
              </div>
            </RadioGroup>
          </div>

          {(transportMode === "car" || transportMode === "bike") && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-sm font-medium">Route Preference</Label>
                <RadioGroup
                  value={routePreference}
                  onValueChange={(value) => onRoutePreferenceChange(value as RoutePreference)}
                  data-testid="radio-route-preference"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fastest" id="route-fastest" data-testid="radio-route-fastest" />
                    <Label htmlFor="route-fastest" className="text-sm font-normal cursor-pointer">
                      Fastest Route
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="shortest" id="route-shortest" data-testid="radio-route-shortest" />
                    <Label htmlFor="route-shortest" className="text-sm font-normal cursor-pointer">
                      Shortest Distance
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="eco" id="route-eco" data-testid="radio-route-eco" />
                    <Label htmlFor="route-eco" className="text-sm font-normal cursor-pointer">
                      Eco-Friendly
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
                <Label className="text-sm font-medium">Vehicle Type</Label>
                <RadioGroup
                  value={vehicleType}
                  onValueChange={(value) => onVehicleTypeChange(value as VehicleType)}
                  data-testid="radio-vehicle-type"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="car" id="vehicle-car" data-testid="radio-vehicle-car" />
                    <Label htmlFor="vehicle-car" className="text-sm font-normal cursor-pointer">
                      Regular Car
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="ev" id="vehicle-ev" data-testid="radio-vehicle-ev" />
                    <Label htmlFor="vehicle-ev" className="text-sm font-normal cursor-pointer">
                      Electric Vehicle (EV)
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
                Eco Mode
              </Label>
              <p className="text-xs text-muted-foreground">
                Prefer fuel-efficient routes
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
                Voice Guidance
              </Label>
              <p className="text-xs text-muted-foreground">
                {voiceSupported
                  ? "Turn-by-turn voice instructions"
                  : "Not supported in this browser"}
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
            <div className="space-y-2 pl-4 border-l-2 border-muted">
              <div className="space-y-1">
                <Label htmlFor="voice-volume" className="text-xs font-medium flex items-center gap-2">
                  <Volume2 className="h-3 w-3" />
                  Voice Volume: {Math.round(voiceVolume * 100)}%
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
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="space-y-0.5 flex items-center gap-2">
              <Vibrate className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="haptics" className="text-sm font-medium">
                  Haptic Feedback
                </Label>
                <p className="text-xs text-muted-foreground">
                  {hapticsSupported
                    ? "Vibration for critical alerts"
                    : "Not supported on this device"}
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

          <div className="flex items-center justify-between">
            <div className="space-y-0.5 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="hazard-alerts" className="text-sm font-medium">
                  Hazard Alerts
                </Label>
                <p className="text-xs text-muted-foreground">
                  Warnings for speed cameras & hazards
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
                  Show Speed Cameras
                </Label>
                <p className="text-xs text-muted-foreground">
                  Display camera markers on map
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
                  Speed Limit Warnings
                </Label>
                <p className="text-xs text-muted-foreground">
                  Alert when exceeding speed limit
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
            <Label className="text-sm font-medium">Speed Unit</Label>
            <RadioGroup
              value={speedUnit}
              onValueChange={(value) => onSpeedUnitChange(value as SpeedUnit)}
              data-testid="radio-speed-unit"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="kmh" id="unit-kmh" data-testid="radio-unit-kmh" />
                <Label htmlFor="unit-kmh" className="text-sm font-normal cursor-pointer">
                  Kilometers per hour (km/h)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="mph" id="unit-mph" data-testid="radio-unit-mph" />
                <Label htmlFor="unit-mph" className="text-sm font-normal cursor-pointer">
                  Miles per hour (mph)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-sm mb-1">Realism Pack</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Advanced visual and audio enhancements
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="weather-lighting" className="text-sm font-medium">
                Weather Lighting
              </Label>
              <p className="text-xs text-muted-foreground">
                Adjust map based on weather conditions
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
                Motion Polish
              </Label>
              <p className="text-xs text-muted-foreground">
                Breathing glow and motion effects
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
                Radar Pulse
              </Label>
              <p className="text-xs text-muted-foreground">
                Pulse camera icons when nearby
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
              <span>Voice announcements enabled</span>
            </div>
          )}

          {!voiceSupported && (
            <div className="flex items-center gap-2 text-xs text-destructive pt-2 border-t">
              <VolumeX className="h-4 w-4" />
              <span>Voice guidance not available</span>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
