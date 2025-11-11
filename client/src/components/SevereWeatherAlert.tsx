import { AlertTriangle, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface SevereWeatherAlertProps {
  message: string;
  onDismiss: () => void;
}

export default function SevereWeatherAlert({ message, onDismiss }: SevereWeatherAlertProps) {
  return (
    <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950/20" data-testid="alert-severe-weather">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" data-testid="icon-weather-warning" />
        <AlertDescription className="flex-1 text-sm text-orange-900 dark:text-orange-100" data-testid="text-weather-warning">
          {message}
        </AlertDescription>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 -mt-0.5 -mr-1 hover:bg-orange-100 dark:hover:bg-orange-900/40"
          onClick={onDismiss}
          data-testid="button-dismiss-weather"
        >
          <X className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          <span className="sr-only">Dismiss weather warning</span>
        </Button>
      </div>
    </Alert>
  );
}
