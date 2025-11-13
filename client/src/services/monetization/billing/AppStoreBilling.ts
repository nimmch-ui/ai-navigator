import type { SubscriptionTier } from '@shared/schema';
import type { IBillingPlatform, PurchaseReceipt, ValidationResult } from './IBillingPlatform';

export class AppStoreBilling implements IBillingPlatform {
  readonly platformName = 'App Store';
  readonly isAvailable: boolean;
  private isDemo: boolean;

  constructor() {
    const hasWebkit = typeof window !== 'undefined' && !!(window as any).webkit?.messageHandlers;
    this.isDemo = !hasWebkit;
    this.isAvailable = true;
  }

  async initialize(): Promise<void> {
    if (this.isDemo) {
      console.log('[AppStoreBilling] Running in demo mode (web environment)');
      return;
    }

    console.log('[AppStoreBilling] Initializing native App Store billing');
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
      const productId = this.getProductId(tier, billingPeriod);
      
      const result = await (window as any).webkit.messageHandlers.purchase.postMessage({
        productId,
        tier,
        billingPeriod,
      });

      if (result.success) {
        return {
          success: true,
          receipt: {
            platform: 'app_store',
            transactionId: result.transactionId,
            productId,
            purchaseDate: Date.now(),
            expirationDate: result.expirationDate,
            rawReceipt: result.receipt,
          },
        };
      }

      return { success: false, error: result.error || 'Purchase failed' };
    } catch (error) {
      console.error('[AppStoreBilling] Purchase error:', error);
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
    console.log(`[AppStoreBilling] Demo mode purchase: ${tier} (${billingPeriod})`);
    console.log('[AppStoreBilling] In production, this would trigger native App Store purchase flow');
    
    const demoReceipt: PurchaseReceipt = {
      platform: 'app_store',
      transactionId: `demo_appstore_${Date.now()}`,
      productId: this.getProductId(tier, billingPeriod),
      purchaseDate: Date.now(),
      expirationDate: Date.now() + (billingPeriod === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000,
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
      console.log('[AppStoreBilling] Demo mode: No purchases to restore');
      return { success: true, receipts: [] };
    }

    try {
      const result = await (window as any).webkit.messageHandlers.restorePurchases.postMessage({});
      
      if (result.success) {
        const receipts: PurchaseReceipt[] = result.receipts.map((r: any) => ({
          platform: 'app_store' as const,
          transactionId: r.transactionId,
          productId: r.productId,
          purchaseDate: r.purchaseDate,
          expirationDate: r.expirationDate,
          rawReceipt: r.receipt,
        }));

        return { success: true, receipts };
      }

      return { success: false, error: result.error || 'Restore failed' };
    } catch (error) {
      console.error('[AppStoreBilling] Restore error:', error);
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
          expiresAt: receipt.expirationDate,
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
          platform: 'app_store',
          receipt: receipt.rawReceipt,
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
      console.error('[AppStoreBilling] Validation error:', error);
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
      const result = await (window as any).webkit.messageHandlers.getPendingPurchases.postMessage({});
      return result.receipts || [];
    } catch {
      return [];
    }
  }

  private getProductId(tier: SubscriptionTier, billingPeriod: 'monthly' | 'yearly'): string {
    const productIds: Record<string, string> = {
      'premium_monthly': 'com.ainavigator.premium.monthly',
      'premium_yearly': 'com.ainavigator.premium.yearly',
      'pro_monthly': 'com.ainavigator.pro.monthly',
      'pro_yearly': 'com.ainavigator.pro.yearly',
    };

    return productIds[`${tier}_${billingPeriod}`] || '';
  }
}
