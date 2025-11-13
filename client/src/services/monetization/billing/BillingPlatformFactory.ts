import type { IBillingPlatform } from './IBillingPlatform';
import { AppStoreBilling } from './AppStoreBilling';
import { PlayStoreBilling } from './PlayStoreBilling';

export class BillingPlatformFactory {
  private static instance: IBillingPlatform | null = null;

  static getPlatform(): IBillingPlatform {
    if (this.instance) {
      return this.instance;
    }

    const platform = this.detectPlatform();
    
    switch (platform) {
      case 'ios':
        this.instance = new AppStoreBilling();
        break;
      case 'android':
        this.instance = new PlayStoreBilling();
        break;
      default:
        this.instance = new AppStoreBilling();
        break;
    }

    return this.instance;
  }

  private static detectPlatform(): 'ios' | 'android' | 'web' {
    if (typeof window === 'undefined') {
      return 'web';
    }

    const userAgent = window.navigator.userAgent.toLowerCase();
    
    if ((window as any).webkit?.messageHandlers || /iphone|ipad|ipod/.test(userAgent)) {
      return 'ios';
    }
    
    if ((window as any).AndroidBilling || /android/.test(userAgent)) {
      return 'android';
    }

    return 'web';
  }

  static reset(): void {
    this.instance = null;
  }
}
