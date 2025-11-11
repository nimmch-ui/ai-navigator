import { Settings as SettingsIcon, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export type VehicleType = "car" | "ev";

interface SettingsProps {
  ecoMode: boolean;
  onEcoModeChange: (enabled: boolean) => void;
  vehicleType: VehicleType;
  onVehicleTypeChange: (type: VehicleType) => void;
  voiceEnabled: boolean;
  onVoiceEnabledChange: (enabled: boolean) => void;
  voiceSupported: boolean;
}

export default function Settings({
  ecoMode,
  onEcoModeChange,
  vehicleType,
  onVehicleTypeChange,
  voiceEnabled,
  onVoiceEnabledChange,
  voiceSupported
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
      <PopoverContent className="w-80" data-testid="settings-panel">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-sm mb-3">Navigation Settings</h3>
          </div>

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
