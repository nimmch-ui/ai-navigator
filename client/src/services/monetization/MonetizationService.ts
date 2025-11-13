import type { Subscription, SubscriptionTier, PricingPlan } from '@shared/schema';

const STORAGE_KEY_SUBSCRIPTION = 'ai_navigator_subscription';

export const PRICING_PLANS: PricingPlan[] = [
  {
    tier: 'free',
    name: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      'Basic navigation',
      '2D map view',
      'Voice guidance',
      'Turn-by-turn directions',
      'Basic traffic info',
    ],
    limits: {
      maxFavorites: 10,
      maxTrips: 50,
      cloudSyncEnabled: false,
    },
  },
  {
    tier: 'premium',
    name: 'Premium',
    monthlyPrice: 9.99,
    yearlyPrice: 99.99,
    features: [
      'Everything in Free',
      '3D map view',
      'Cinematic mode',
      'AR navigation preview',
      'Speed camera radar alerts',
      'Weather AI integration',
      'Advanced traffic info',
      'Offline maps',
    ],
    limits: {
      maxFavorites: 100,
      maxTrips: 500,
      cloudSyncEnabled: true,
    },
  },
  {
    tier: 'pro',
    name: 'Pro',
    monthlyPrice: 19.99,
    yearlyPrice: 199.99,
    features: [
      'Everything in Premium',
      'Fleet management',
      'Unlimited cloud sync',
      'Priority support',
      'Custom branding',
      'API access',
      'Multi-device sync',
      'Advanced analytics',
    ],
    limits: {
      maxFavorites: -1,
      maxTrips: -1,
      cloudSyncEnabled: true,
    },
  },
];

class MonetizationService {
  private subscription: Subscription | null = null;
  private listeners: Set<(subscription: Subscription | null) => void> = new Set();

  constructor() {
    this.loadSubscription();
    this.initializeSubscription();
  }

  private async initializeSubscription(): Promise<void> {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const checkoutSuccess = urlParams.get('subscription') === 'success';
      
      if (checkoutSuccess) {
        const pendingTier = localStorage.getItem('ai_navigator_pending_checkout');
        if (pendingTier) {
          localStorage.removeItem('ai_navigator_pending_checkout');
          window.history.replaceState({}, '', window.location.pathname);
        }
      }
      
      const { userDataStore } = await import('@/services/data/UserDataStore');
      const userId = await userDataStore.getIdentity();
      await this.syncWithBackend(userId);
    } catch (error) {
      console.error('[MonetizationService] Failed to initialize subscription:', error);
    }
  }

  private loadSubscription(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SUBSCRIPTION);
      if (stored) {
        this.subscription = JSON.parse(stored);
      } else {
        this.subscription = this.createFreeSubscription();
        this.saveSubscription();
      }
    } catch (error) {
      console.error('[MonetizationService] Failed to load subscription:', error);
      this.subscription = this.createFreeSubscription();
    }
  }

  private saveSubscription(): void {
    if (this.subscription) {
      localStorage.setItem(STORAGE_KEY_SUBSCRIPTION, JSON.stringify(this.subscription));
      this.notifyListeners();
    }
  }

  private createFreeSubscription(): Subscription {
    const now = Date.now();
    return {
      userId: 'local',
      tier: 'free',
      status: 'active',
      cancelAtPeriodEnd: false,
      createdAt: now,
      updatedAt: now,
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.subscription));
  }

  subscribe(listener: (subscription: Subscription | null) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  checkSubscription(): Subscription | null {
    return this.subscription;
  }

  getCurrentTier(): SubscriptionTier {
    return this.subscription?.tier ?? 'free';
  }

  hasFeature(tier: SubscriptionTier): boolean {
    const currentTier = this.getCurrentTier();
    const tierOrder: SubscriptionTier[] = ['free', 'premium', 'pro'];
    const currentIndex = tierOrder.indexOf(currentTier);
    const requiredIndex = tierOrder.indexOf(tier);
    return currentIndex >= requiredIndex;
  }

  canAccessFeature(featureTier: SubscriptionTier): boolean {
    return this.hasFeature(featureTier);
  }

  getPricingPlans(): PricingPlan[] {
    return PRICING_PLANS;
  }

  getPlanForTier(tier: SubscriptionTier): PricingPlan | undefined {
    return PRICING_PLANS.find(plan => plan.tier === tier);
  }

  async purchasePremium(tier: SubscriptionTier, billingPeriod: 'monthly' | 'yearly'): Promise<{
    success: boolean;
    checkoutUrl?: string;
    error?: string;
  }> {
    try {
      if (tier === 'free') {
        return { success: false, error: 'Cannot purchase free tier' };
      }

      const plan = this.getPlanForTier(tier);
      if (!plan) {
        return { success: false, error: 'Invalid tier' };
      }

      const amount = billingPeriod === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;

      const response = await fetch('/api/subscriptions/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, billingPeriod, amount }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.message || 'Failed to create checkout session' };
      }

      const data = await response.json();
      
      if (data.checkoutUrl) {
        localStorage.setItem('ai_navigator_pending_checkout', tier);
        window.location.href = data.checkoutUrl;
      }

      return { success: true, checkoutUrl: data.checkoutUrl };
    } catch (error) {
      console.error('[MonetizationService] Purchase failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Purchase failed',
      };
    }
  }

  async restorePurchases(): Promise<{
    success: boolean;
    subscription?: Subscription;
    error?: string;
  }> {
    try {
      const response = await fetch('/api/subscriptions/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.message || 'Failed to restore purchases' };
      }

      const data = await response.json();
      
      if (data.subscription) {
        this.subscription = data.subscription;
        this.saveSubscription();
        return { success: true, subscription: data.subscription };
      }

      return { success: false, error: 'No active subscription found' };
    } catch (error) {
      console.error('[MonetizationService] Restore failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Restore failed',
      };
    }
  }

  async syncWithBackend(userId: string): Promise<void> {
    try {
      const response = await fetch(`/api/subscriptions/status?userId=${userId}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.subscription) {
          this.subscription = data.subscription;
          this.saveSubscription();
        }
      }
    } catch (error) {
      console.error('[MonetizationService] Sync failed:', error);
    }
  }

  updateSubscription(subscription: Subscription): void {
    this.subscription = subscription;
    this.saveSubscription();
  }

  isSubscriptionActive(): boolean {
    if (!this.subscription) return false;
    if (this.subscription.tier === 'free') return true;
    if (this.subscription.status !== 'active') return false;
    
    if (this.subscription.currentPeriodEnd) {
      return Date.now() < this.subscription.currentPeriodEnd;
    }
    
    return true;
  }
}

export const monetizationService = new MonetizationService();
