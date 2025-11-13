import { useEffect, useState } from 'react';
import { Shield, AlertTriangle, AlertCircle } from 'lucide-react';
import { EventBus } from '@/services/eventBus';
import type { RiskScores, RiskFactor } from '@/services/ai/PredictiveEngine';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PredictiveSafetyBadgeProps {
  className?: string;
  showDetails?: boolean;
}

export default function PredictiveSafetyBadge({ 
  className, 
  showDetails = false 
}: PredictiveSafetyBadgeProps) {
  const [riskScores, setRiskScores] = useState<RiskScores | null>(null);
  const [factors, setFactors] = useState<RiskFactor[]>([]);
  const [isPulsing, setIsPulsing] = useState(false);

  useEffect(() => {
    const unsubscribe = EventBus.subscribe('ai:riskUpdate', ({ scores, factors }) => {
      setRiskScores(scores);
      setFactors(factors);
      
      // Trigger pulse animation on high risk
      if (scores.overall >= 50) {
        setIsPulsing(true);
        setTimeout(() => setIsPulsing(false), 1000);
      }
    });

    return () => unsubscribe();
  }, []);

  if (!riskScores) {
    return null;
  }

  const { overall } = riskScores;

  // Determine risk level and styling
  const getRiskLevel = (score: number): {
    level: 'safe' | 'low' | 'moderate' | 'high' | 'critical';
    color: string;
    bgColor: string;
    borderColor: string;
    icon: typeof Shield;
    label: string;
  } => {
    if (score < 20) {
      return {
        level: 'safe',
        color: 'text-green-600 dark:text-green-500',
        bgColor: 'bg-green-100 dark:bg-green-950',
        borderColor: 'border-green-300 dark:border-green-800',
        icon: Shield,
        label: 'Safe',
      };
    } else if (score < 35) {
      return {
        level: 'low',
        color: 'text-blue-600 dark:text-blue-500',
        bgColor: 'bg-blue-100 dark:bg-blue-950',
        borderColor: 'border-blue-300 dark:border-blue-800',
        icon: Shield,
        label: 'Low Risk',
      };
    } else if (score < 50) {
      return {
        level: 'moderate',
        color: 'text-yellow-600 dark:text-yellow-500',
        bgColor: 'bg-yellow-100 dark:bg-yellow-950',
        borderColor: 'border-yellow-400 dark:border-yellow-800',
        icon: AlertCircle,
        label: 'Moderate',
      };
    } else if (score < 75) {
      return {
        level: 'high',
        color: 'text-orange-600 dark:text-orange-500',
        bgColor: 'bg-orange-100 dark:bg-orange-950',
        borderColor: 'border-orange-400 dark:border-orange-800',
        icon: AlertTriangle,
        label: 'High Risk',
      };
    } else {
      return {
        level: 'critical',
        color: 'text-red-600 dark:text-red-500',
        bgColor: 'bg-red-100 dark:bg-red-950',
        borderColor: 'border-red-400 dark:border-red-800',
        icon: AlertTriangle,
        label: 'Critical',
      };
    }
  };

  const risk = getRiskLevel(overall);
  const RiskIcon = risk.icon;

  // Pulse animation classes
  const pulseClasses = isPulsing && overall >= 50 
    ? 'animate-pulse' 
    : '';

  return (
    <div
      className={cn('flex flex-col gap-2', className)}
      data-testid="predictive-safety-badge"
    >
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all duration-300',
          risk.bgColor,
          risk.borderColor,
          pulseClasses
        )}
        data-testid={`safety-badge-${risk.level}`}
      >
        <RiskIcon 
          className={cn('h-5 w-5', risk.color)} 
          data-testid="icon-risk-indicator"
        />
        <div className="flex-1">
          <div className={cn('font-semibold text-sm', risk.color)}>
            {risk.label}
          </div>
          {overall > 0 && (
            <div className="text-xs text-muted-foreground">
              Risk: {Math.round(overall)}%
            </div>
          )}
        </div>
      </div>

      {showDetails && factors.length > 0 && (
        <div className="flex flex-col gap-1" data-testid="risk-factors-list">
          {factors.slice(0, 3).map((factor, idx) => (
            <Badge
              key={`${factor.type}-${idx}`}
              variant={factor.severity === 'critical' || factor.severity === 'high' ? 'destructive' : 'secondary'}
              className="text-xs justify-start"
              data-testid={`risk-factor-${factor.type}`}
            >
              <span className="font-medium">{getFactorLabel(factor.type)}:</span>
              <span className="ml-1">{factor.reason}</span>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function getFactorLabel(type: string): string {
  const labels: Record<string, string> = {
    overspeed: 'Speed',
    sharpTurn: 'Curve',
    collision: 'Hazard',
    lateBraking: 'Braking',
    laneDeviation: 'Lane',
  };
  return labels[type] || type;
}
