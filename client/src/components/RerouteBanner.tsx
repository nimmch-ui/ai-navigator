import { RerouteOption } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertTriangle, Navigation, X, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface RerouteBannerProps {
  rerouteOption: RerouteOption | null;
  onAccept: () => void;
  onIgnore: () => void;
}

export function RerouteBanner({ rerouteOption, onAccept, onIgnore }: RerouteBannerProps) {
  if (!rerouteOption) return null;

  const getReasonText = (reason: RerouteOption['reason']): string => {
    switch (reason) {
      case 'traffic_incident':
        return 'Traffic incident ahead';
      case 'gps_deviation':
        return 'Off route detected';
      case 'eta_increase':
        return 'ETA increased significantly';
      case 'manual':
        return 'Alternative route available';
      default:
        return 'Alternative route available';
    }
  };

  const getReasonIcon = (reason: RerouteOption['reason']) => {
    switch (reason) {
      case 'traffic_incident':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'gps_deviation':
        return <Navigation className="w-5 h-5 text-blue-500" />;
      case 'eta_increase':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <Navigation className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
        data-testid="reroute-banner"
      >
        <Card className="p-4 shadow-lg border-2 border-primary/20 bg-card">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {getReasonIcon(rerouteOption.reason)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-sm font-medium text-foreground">
                  {getReasonText(rerouteOption.reason)}
                </p>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={onIgnore}
                  className="h-6 w-6 flex-shrink-0"
                  data-testid="button-ignore-reroute"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <p className="text-lg font-bold text-primary mb-3">
                Faster by {rerouteOption.timeSavingsMinutes} min
              </p>
              
              <div className="flex gap-2">
                <Button
                  onClick={onAccept}
                  className="flex-1"
                  data-testid="button-accept-reroute"
                >
                  Accept Route
                </Button>
                <Button
                  onClick={onIgnore}
                  variant="outline"
                  className="flex-1"
                  data-testid="button-dismiss-reroute"
                >
                  Keep Current
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
