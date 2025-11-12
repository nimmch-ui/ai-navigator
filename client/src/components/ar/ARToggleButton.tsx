import { memo, useState } from 'react';
import { Camera, CameraOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ARToggleButtonProps {
  isActive: boolean;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
}

const ARToggleButton = memo(({ isActive, onToggle, disabled = false }: ARToggleButtonProps) => {
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);

  const handleClick = () => {
    if (isActive) {
      // Turning off - no dialog needed
      onToggle(false);
    } else {
      // Turning on - show privacy notice first
      setShowPrivacyDialog(true);
    }
  };

  const handleAccept = () => {
    setShowPrivacyDialog(false);
    onToggle(true);
  };

  const handleDecline = () => {
    setShowPrivacyDialog(false);
  };

  return (
    <>
      <Button
        size="icon"
        variant={isActive ? "default" : "ghost"}
        onClick={handleClick}
        disabled={disabled}
        data-testid="button-ar-toggle"
        title={isActive ? "Disable AR Preview" : "Enable AR Preview"}
      >
        {isActive ? (
          <Camera className="h-5 w-5" />
        ) : (
          <CameraOff className="h-5 w-5" />
        )}
      </Button>

      <Dialog open={showPrivacyDialog} onOpenChange={setShowPrivacyDialog}>
        <DialogContent data-testid="dialog-ar-privacy">
          <DialogHeader>
            <DialogTitle>Enable AR Preview Mode?</DialogTitle>
            <DialogDescription className="space-y-3 pt-2">
              <p>
                AR Preview uses your device camera to overlay navigation guidance on the real world.
              </p>
              <div className="bg-muted rounded-lg p-4 space-y-2">
                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  </div>
                  <div className="text-sm">
                    <strong>Camera used locally only</strong>
                    <p className="text-muted-foreground mt-1">
                      Video is processed on your device and never transmitted or stored.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  </div>
                  <div className="text-sm">
                    <strong>Privacy first</strong>
                    <p className="text-muted-foreground mt-1">
                      You can disable AR mode at any time. No data is collected.
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                By continuing, you grant this app temporary access to your device camera.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleDecline}
              data-testid="button-ar-decline"
            >
              Not Now
            </Button>
            <Button
              onClick={handleAccept}
              data-testid="button-ar-accept"
            >
              Enable AR Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});

ARToggleButton.displayName = 'ARToggleButton';

export default ARToggleButton;
