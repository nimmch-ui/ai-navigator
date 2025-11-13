import { useState, useEffect } from 'react';
import { monetizationService } from '@/services/monetization/MonetizationService';
import type { Subscription, SubscriptionTier } from '@shared/schema';

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(
    monetizationService.checkSubscription()
  );

  useEffect(() => {
    const unsubscribe = monetizationService.subscribe((sub) => {
      setSubscription(sub);
    });

    return unsubscribe;
  }, []);

  return {
    subscription,
    currentTier: subscription?.tier ?? 'free',
    isActive: monetizationService.isSubscriptionActive(),
    hasFeature: (tier: SubscriptionTier) => monetizationService.hasFeature(tier),
    canAccessFeature: (tier: SubscriptionTier) => monetizationService.canAccessFeature(tier),
  };
}
