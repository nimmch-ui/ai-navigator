import type { SubscriptionTier } from '@shared/schema';
import type { IBillingPlatform, PurchaseReceipt, ValidationResult } from './IBillingPlatform';

export class PlayStoreBilling implements IBillingPlatform {
  readonly platformName = 'Google Play';
  readonly isAvailable: boolean;
  private isDemo: boolean;

  constructor() {
    this.isDemo = typeof window !== 'undefined' && !(window as any).AndroidBilling;
    this.isAvailable = this.isDemo || typeof (window as any).AndroidBilling !== 'undefined';
  }

  async initialize(): Promise<void> {
    if (this.isDemo) {
      console.log('[PlayStoreBilling] Running in demo mode (web environment)');
      return;
    }

    console.log('[PlayStoreBilling] Initializing native Google Play billing');
    
    try {
      await (window as any).AndroidBilling.initialize();
    } catch (error) {
      console.error('[PlayStoreBilling] Initialization error:', error);
    }
  }

  async purchase(tier: SubscriptionTier, billingPeriod: 'monthly' | 'yearly'): Promise<{
    success: boolean;
    receipt?: PurchaseReceipt;
    error?: string;
  }> {
    if (this.isDemo) {
      return this.demoModePurchase(tier, billingPeriod);
    }

    try {
      const skuId = this.getSkuId(tier, billingPeriod);
      
      const result = await (window as any).AndroidBilling.purchase(skuId);

      if (result.success) {
        return {
          success: true,
          receipt: {
            platform: 'play_store',
            transactionId: result.orderId,
            productId: skuId,
            purchaseDate: result.purchaseTime,
            rawReceipt: result.purchaseToken,
          },
        };
      }

      return { success: false, error: result.error || 'Purchase failed' };
    } catch (error) {
      console.error('[PlayStoreBilling] Purchase error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Purchase failed',
      };
    }
  }

  private demoModePurchase(tier: SubscriptionTier, billingPeriod: 'monthly' | 'yearly'): Promise<{
    success: boolean;
    receipt?: PurchaseReceipt;
    error?: string;
  }> {
    console.log(`[PlayStoreBilling] Demo mode purchase: ${tier} (${billingPeriod})`);
    console.log('[PlayStoreBilling] In production, this would trigger native Google Play purchase flow');
    
    const demoReceipt: PurchaseReceipt = {
      platform: 'play_store',
      transactionId: `demo_playstore_${Date.now()}`,
      productId: this.getSkuId(tier, billingPeriod),
      purchaseDate: Date.now(),
      rawReceipt: btoa(JSON.stringify({ demo: true, tier, billingPeriod })),
    };

    return Promise.resolve({
      success: true,
      receipt: demoReceipt,
    });
  }

  async restorePurchases(): Promise<{
    success: boolean;
    receipts?: PurchaseReceipt[];
    error?: string;
  }> {
    if (this.isDemo) {
      console.log('[PlayStoreBilling] Demo mode: No purchases to restore');
      return { success: true, receipts: [] };
    }

    try {
      const result = await (window as any).AndroidBilling.queryPurchases();
      
      if (result.success) {
        const receipts: PurchaseReceipt[] = result.purchases.map((p: any) => ({
          platform: 'play_store' as const,
          transactionId: p.orderId,
          productId: p.sku,
          purchaseDate: p.purchaseTime,
          rawReceipt: p.purchaseToken,
        }));

        return { success: true, receipts };
      }

      return { success: false, error: result.error || 'Restore failed' };
    } catch (error) {
      console.error('[PlayStoreBilling] Restore error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Restore failed',
      };
    }
  }

  async validateReceipt(receipt: PurchaseReceipt): Promise<ValidationResult> {
    if (this.isDemo) {
      try {
        const decoded = JSON.parse(atob(receipt.rawReceipt));
        return {
          valid: true,
          tier: decoded.tier,
        };
      } catch {
        return { valid: false, error: 'Invalid demo receipt' };
      }
    }

    try {
      const response = await fetch('/api/subscriptions/validate-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'play_store',
          receipt: receipt.rawReceipt,
          productId: receipt.productId,
        }),
      });

      if (!response.ok) {
        return { valid: false, error: 'Validation failed' };
      }

      const result = await response.json();
      return {
        valid: result.valid,
        tier: result.tier,
        expiresAt: result.expiresAt,
        error: result.error,
      };
    } catch (error) {
      console.error('[PlayStoreBilling] Validation error:', error);
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Validation failed',
      };
    }
  }

  async getPendingPurchases(): Promise<PurchaseReceipt[]> {
    if (this.isDemo) {
      return [];
    }

    try {
      const result = await (window as any).AndroidBilling.queryPurchases();
      return result.purchases || [];
    } catch {
      return [];
    }
  }

  private getSkuId(tier: SubscriptionTier, billingPeriod: 'monthly' | 'yearly'): string {
    const skuIds: Record<string, string> = {
      'premium_monthly': 'premium_monthly_subscription',
      'premium_yearly': 'premium_yearly_subscription',
      'pro_monthly': 'pro_monthly_subscription',
      'pro_yearly': 'pro_yearly_subscription',
    };

    return skuIds[`${tier}_${billingPeriod}`] || '';
  }
}
