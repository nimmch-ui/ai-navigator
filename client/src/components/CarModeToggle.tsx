import { Car } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCarMode } from '@/contexts/CarModeContext';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function CarModeToggle() {
  const { isCarMode, toggleCarMode } = useCarMode();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={isCarMode ? 'default' : 'ghost'}
          size="icon"
          onClick={toggleCarMode}
          data-testid="button-toggle-car-mode"
          className={isCarMode ? 'bg-primary' : ''}
        >
          <Car className={isCarMode ? 'h-5 w-5 car-mode-icon' : 'h-5 w-5'} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{isCarMode ? 'Exit Car Mode' : 'Enter Car Mode'}</p>
      </TooltipContent>
    </Tooltip>
  );
}
