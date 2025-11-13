/**
 * CurrencyService - Multi-currency support with automatic conversion
 * Supports: USD, EUR, INR, ALL (Albanian Lek), CHF (Swiss Franc)
 */

import type { Locale } from '../i18n';
import { i18n } from '../i18n';

export type Currency = 'USD' | 'EUR' | 'INR' | 'ALL' | 'CHF';

interface CurrencyConfig {
  symbol: string;
  code: Currency;
  name: string;
  decimalPlaces: number;
}

const CURRENCY_CONFIGS: Record<Currency, CurrencyConfig> = {
  USD: { symbol: '$', code: 'USD', name: 'US Dollar', decimalPlaces: 2 },
  EUR: { symbol: '€', code: 'EUR', name: 'Euro', decimalPlaces: 2 },
  INR: { symbol: '₹', code: 'INR', name: 'Indian Rupee', decimalPlaces: 0 },
  ALL: { symbol: 'L', code: 'ALL', name: 'Albanian Lek', decimalPlaces: 0 },
  CHF: { symbol: 'CHF', code: 'CHF', name: 'Swiss Franc', decimalPlaces: 2 },
};

// Exchange rates relative to USD (as of typical rates)
// In production, these would be fetched from an API
const EXCHANGE_RATES: Record<Currency, number> = {
  USD: 1.0,
  EUR: 0.92,
  INR: 83.0,
  ALL: 93.0,
  CHF: 0.88,
};

// Locale to currency mapping
const LOCALE_TO_CURRENCY: Record<Locale, Currency> = {
  'en': 'USD',
  'sq-AL': 'ALL',
  'sr': 'EUR',
  'sl-SI': 'EUR',
  'de-CH': 'CHF',
  'fr-CH': 'CHF',
  'it-CH': 'CHF',
  'hr': 'EUR',
  'tr': 'EUR',
  'es': 'EUR',
  'pt-BR': 'USD',
  'hi': 'INR',
  'bn': 'INR',
  'ar': 'USD',
  'zh-CN': 'USD',
};

class CurrencyService {
  private currentCurrency: Currency = 'USD';

  /**
   * Initialize currency based on user's locale
   */
  initialize(locale: Locale): void {
    this.currentCurrency = LOCALE_TO_CURRENCY[locale] || 'USD';
  }

  /**
   * Get current currency
   */
  getCurrency(): Currency {
    return this.currentCurrency;
  }

  /**
   * Set current currency
   */
  setCurrency(currency: Currency): void {
    this.currentCurrency = currency;
  }

  /**
   * Convert price from USD to target currency
   */
  convertFromUSD(usdPrice: number, targetCurrency?: Currency): number {
    const target = targetCurrency || this.currentCurrency;
    const rate = EXCHANGE_RATES[target];
    return usdPrice * rate;
  }

  /**
   * Format price with currency symbol using locale-appropriate number formatting
   */
  formatPrice(usdPrice: number, currency?: Currency): string {
    const target = currency || this.currentCurrency;
    const config = CURRENCY_CONFIGS[target];
    const convertedPrice = this.convertFromUSD(usdPrice, target);
    
    // Round to appropriate decimal places
    const rounded = config.decimalPlaces === 0 
      ? Math.round(convertedPrice)
      : Number(convertedPrice.toFixed(config.decimalPlaces));
    
    // Use the current i18n locale for number formatting
    const locale = i18n.getLocale() || 'en';
    const formattedNumber = rounded.toLocaleString(locale, {
      minimumFractionDigits: config.decimalPlaces,
      maximumFractionDigits: config.decimalPlaces,
    });
    
    // Place symbol correctly
    if (target === 'CHF') {
      return `${config.symbol} ${formattedNumber}`;
    }
    return `${config.symbol}${formattedNumber}`;
  }

  /**
   * Get currency config
   */
  getCurrencyConfig(currency?: Currency): CurrencyConfig {
    return CURRENCY_CONFIGS[currency || this.currentCurrency];
  }

  /**
   * Get available currencies
   */
  getAvailableCurrencies(): Currency[] {
    return Object.keys(CURRENCY_CONFIGS) as Currency[];
  }

  /**
   * Detect currency from locale
   */
  getCurrencyForLocale(locale: Locale): Currency {
    return LOCALE_TO_CURRENCY[locale] || 'USD';
  }
}

export const currencyService = new CurrencyService();
