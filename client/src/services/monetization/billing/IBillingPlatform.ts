import type { SubscriptionTier } from '@shared/schema';

export interface PurchaseReceipt {
  platform: 'app_store' | 'play_store' | 'stripe';
  transactionId: string;
  productId: string;
  purchaseDate: number;
  expirationDate?: number;
  rawReceipt: string;
}

export interface ValidationResult {
  valid: boolean;
  tier?: SubscriptionTier;
  expiresAt?: number;
  error?: string;
}

export interface IBillingPlatform {
  readonly platformName: string;
  readonly isAvailable: boolean;
  
  initialize(): Promise<void>;
  
  purchase(tier: SubscriptionTier, billingPeriod: 'monthly' | 'yearly'): Promise<{
    success: boolean;
    receipt?: PurchaseReceipt;
    error?: string;
  }>;
  
  restorePurchases(): Promise<{
    success: boolean;
    receipts?: PurchaseReceipt[];
    error?: string;
  }>;
  
  validateReceipt(receipt: PurchaseReceipt): Promise<ValidationResult>;
  
  getPendingPurchases(): Promise<PurchaseReceipt[]>;
}
