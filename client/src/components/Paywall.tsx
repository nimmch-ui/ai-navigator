import { useState, useEffect } from 'react';
import { X, Check, Zap, Star, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { monetizationService } from '@/services/monetization/MonetizationService';
import { i18n } from '@/services/i18n';
import type { SubscriptionTier } from '@shared/schema';

interface PaywallProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requiredTier?: SubscriptionTier;
  feature?: string;
}

export function Paywall({ open, onOpenChange, requiredTier, feature }: PaywallProps) {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly');
  const [isPurchasing, setIsPurchasing] = useState<SubscriptionTier | null>(null);
  const { toast } = useToast();
  const localizedPlans = monetizationService.getLocalizedPricingPlans();

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onOpenChange(false);
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [open, onOpenChange]);

  const handlePurchase = async (tier: SubscriptionTier) => {
    if (tier === 'free') {
      toast({
        title: 'Already on Free Plan',
        description: 'You are currently using the free plan.',
      });
      return;
    }

    setIsPurchasing(tier);
    
    try {
      const result = await monetizationService.purchasePremium(tier, billingPeriod);
      
      if (!result.success) {
        toast({
          title: 'Purchase Failed',
          description: result.error || 'Unable to start checkout process',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Purchase Failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsPurchasing(null);
    }
  };

  const getYearlySavings = (monthlyPrice: number, yearlyPrice: number) => {
    const monthlyCost = monthlyPrice * 12;
    const savings = monthlyCost - yearlyPrice;
    const percentage = Math.round((savings / monthlyCost) * 100);
    return { amount: savings, percentage };
  };

  const getTierIcon = (tier: SubscriptionTier) => {
    switch (tier) {
      case 'free':
        return <Zap className="h-5 w-5" />;
      case 'premium':
        return <Star className="h-5 w-5" />;
      case 'pro':
        return <Crown className="h-5 w-5" />;
    }
  };

  const getTierColor = (tier: SubscriptionTier) => {
    switch (tier) {
      case 'free':
        return 'border-muted';
      case 'premium':
        return 'border-primary';
      case 'pro':
        return 'border-accent';
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="relative w-full max-w-6xl max-h-[90vh] overflow-y-auto p-4">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-6 top-6 z-10"
          onClick={() => onOpenChange(false)}
          data-testid="button-close-paywall"
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="space-y-8 p-6">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold" data-testid="text-paywall-title">
              {requiredTier ? `${i18n.t('pricing.upgrade')} ${i18n.t(`pricing.${requiredTier}` as any)}` : i18n.t('pricing.title')}
            </h2>
            {feature && (
              <p className="text-muted-foreground" data-testid="text-paywall-feature">
                {feature} {i18n.t('pricing.feature_locked')}
              </p>
            )}
            <p className="text-muted-foreground">
              {i18n.t('pricing.subtitle')}
            </p>
          </div>

          <div className="flex items-center justify-center gap-4">
            <Label htmlFor="billing-toggle" className={billingPeriod === 'monthly' ? 'font-semibold' : ''}>
              {i18n.t('pricing.monthly')}
            </Label>
            <Switch
              id="billing-toggle"
              checked={billingPeriod === 'yearly'}
              onCheckedChange={(checked) => setBillingPeriod(checked ? 'yearly' : 'monthly')}
              data-testid="switch-billing-period"
            />
            <Label htmlFor="billing-toggle" className={billingPeriod === 'yearly' ? 'font-semibold' : ''}>
              {i18n.t('pricing.yearly')}
            </Label>
            {billingPeriod === 'yearly' && (
              <Badge variant="secondary" data-testid="badge-yearly-discount">
                {i18n.t('pricing.save_yearly')}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {localizedPlans.map((plan) => {
              const priceStr = billingPeriod === 'monthly' ? plan.localizedMonthlyPrice : plan.localizedYearlyPrice;
              const savings = billingPeriod === 'yearly' && plan.tier !== 'free'
                ? getYearlySavings(plan.monthlyPrice, plan.yearlyPrice)
                : null;
              const isRecommended = plan.tier === 'premium';

              return (
                <Card
                  key={plan.tier}
                  className={`relative ${getTierColor(plan.tier)} ${
                    isRecommended ? 'border-2' : ''
                  }`}
                  data-testid={`card-plan-${plan.tier}`}
                >
                  {isRecommended && (
                    <Badge
                      className="absolute -top-3 left-1/2 -translate-x-1/2"
                      data-testid="badge-recommended"
                    >
                      Recommended
                    </Badge>
                  )}
                  
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      {getTierIcon(plan.tier)}
                      <CardTitle data-testid={`text-plan-name-${plan.tier}`}>{plan.localizedName}</CardTitle>
                    </div>
                    <CardDescription>
                      <div className="mt-4">
                        <span className="text-4xl font-bold" data-testid={`text-price-${plan.tier}`}>
                          {priceStr}
                        </span>
                        <span className="text-muted-foreground">
                          {i18n.t(billingPeriod === 'monthly' ? 'pricing.per_month' : 'pricing.per_year')}
                        </span>
                      </div>
                      {savings && (
                        <p className="text-sm text-primary mt-1" data-testid={`text-savings-${plan.tier}`}>
                          {i18n.t('pricing.save_yearly')} ({savings.percentage}%)
                        </p>
                      )}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <Button
                      className="w-full"
                      variant={isRecommended ? 'default' : 'outline'}
                      onClick={() => handlePurchase(plan.tier)}
                      disabled={isPurchasing !== null}
                      data-testid={`button-purchase-${plan.tier}`}
                    >
                      {isPurchasing === plan.tier ? (
                        'Processing...'
                      ) : plan.tier === 'free' ? (
                        i18n.t('pricing.current_plan')
                      ) : (
                        `${i18n.t('pricing.get_plan')} ${plan.localizedName}`
                      )}
                    </Button>

                    <div className="space-y-2">
                      {plan.features.map((feature, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-2 text-sm"
                          data-testid={`feature-${plan.tier}-${index}`}
                        >
                          <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 border-t space-y-1 text-sm text-muted-foreground">
                      <p>Limits:</p>
                      <ul className="space-y-1 ml-4">
                        <li>
                          Favorites:{' '}
                          {plan.limits.maxFavorites === -1 ? 'Unlimited' : plan.limits.maxFavorites}
                        </li>
                        <li>
                          Trip History:{' '}
                          {plan.limits.maxTrips === -1 ? 'Unlimited' : plan.limits.maxTrips}
                        </li>
                        <li>
                          Cloud Sync: {plan.limits.cloudSyncEnabled ? 'Enabled' : 'Not Available'}
                        </li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>All plans include a 7-day free trial. Cancel anytime.</p>
            <p className="mt-1">Secure payment powered by Stripe</p>
          </div>
        </div>
      </div>
    </div>
  );
}
