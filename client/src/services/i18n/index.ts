import { GlobalConfig, type Region } from "@shared/global.config";
import { PreferencesService } from "@/services/preferences";
import { EventBus } from "@/services/eventBus";
import baseTranslations from "./locales/en.json";

export type Locale = 
  | "en"
  | "sq-AL"
  | "sr"
  | "sl-SI"
  | "de-CH"
  | "fr-CH"
  | "it-CH"
  | "hr"
  | "tr"
  | "es"
  | "pt-BR"
  | "hi"
  | "bn"
  | "ar"
  | "zh-CN";

export type UnitSystem = "metric" | "imperial";

/**
 * TranslationKey is derived from en.json to ensure compile-time sync
 * between the canonical translation file and TypeScript types.
 * This prevents drift and eliminates manual maintenance.
 */
export type TranslationKey = keyof typeof baseTranslations;

export type TranslationDict = Record<TranslationKey, string>;

const REGION_DEFAULT_LOCALES: Record<Region, Locale> = {
  EU: "en",
  US: "en",
  ASIA: "en",
  MENA: "ar",
  AFRICA: "en",
  LATAM: "es",
};

const IMPERIAL_REGIONS: Region[] = ["US"];

const TTS_VOICE_MAPPINGS: Record<Locale, string[]> = {
  "en": ["en-US", "en-GB", "en"],
  "sq-AL": ["sq-AL", "sq", "en"],
  "sr": ["sr-RS", "sr", "en"],
  "sl-SI": ["sl-SI", "sl", "en"],
  "de-CH": ["de-CH", "de-DE", "de", "en"],
  "fr-CH": ["fr-CH", "fr-FR", "fr", "en"],
  "it-CH": ["it-CH", "it-IT", "it", "en"],
  "hr": ["hr-HR", "hr", "en"],
  "tr": ["tr-TR", "tr", "en"],
  "es": ["es-ES", "es-MX", "es", "en"],
  "pt-BR": ["pt-BR", "pt-PT", "pt", "en"],
  "hi": ["hi-IN", "hi", "en"],
  "bn": ["bn-IN", "bn-BD", "bn", "en"],
  "ar": ["ar-SA", "ar-EG", "ar", "en"],
  "zh-CN": ["zh-CN", "zh-TW", "zh", "en"],
};

const TIME_12H_LOCALES: Locale[] = ["en"];

class I18nService {
  private currentLocale: Locale = "en";
  private currentRegion: Region = "EU";
  private translations = new Map<Locale, TranslationDict>();
  private loadedLocales = new Set<Locale>();
  private readonly STORAGE_KEY = "ai-navigator-locale";

  async initialize(userRegion?: Region): Promise<void> {
    this.currentRegion = userRegion || "EU";
    
    const prefs = PreferencesService.getPreferences();
    if (prefs.language) {
      await this.setLocale(prefs.language, false);
    } else {
      const locale = this.detectLocale(userRegion);
      await this.setLocale(locale, true);
    }
  }

  private detectLocale(userRegion?: Region): Locale {
    const stored = this.getStoredLocale();
    if (stored) return stored;

    const browserLang = navigator.language || navigator.languages?.[0];
    const normalizedLang = this.normalizeBrowserLanguage(browserLang);
    
    if (this.isValidLocale(normalizedLang)) {
      return normalizedLang as Locale;
    }

    if (userRegion) {
      return REGION_DEFAULT_LOCALES[userRegion];
    }

    return GlobalConfig.defaultLanguage as Locale;
  }

  private normalizeBrowserLanguage(browserLang: string): string {
    if (browserLang.startsWith("sq")) return "sq-AL";
    if (browserLang.startsWith("sl")) return "sl-SI";
    if (browserLang.startsWith("de") && browserLang.includes("CH")) return "de-CH";
    if (browserLang.startsWith("fr") && browserLang.includes("CH")) return "fr-CH";
    if (browserLang.startsWith("it") && browserLang.includes("CH")) return "it-CH";
    if (browserLang.startsWith("hr")) return "hr";
    if (browserLang.startsWith("pt") && browserLang.includes("BR")) return "pt-BR";
    if (browserLang.startsWith("zh")) return "zh-CN";
    
    const baseCode = browserLang.split("-")[0];
    return baseCode;
  }

  private isValidLocale(code: string): boolean {
    const validLocales: Locale[] = [
      "en", "sq-AL", "sr", "sl-SI", "de-CH", "fr-CH", "it-CH", "hr",
      "tr", "es", "pt-BR", "hi", "bn", "ar", "zh-CN"
    ];
    return validLocales.includes(code as Locale);
  }

  async setLocale(locale: Locale, saveToPreferences: boolean = true): Promise<void> {
    if (!this.loadedLocales.has(locale)) {
      await this.loadTranslations(locale);
    }

    this.currentLocale = locale;
    this.storeLocale(locale);

    if (saveToPreferences) {
      PreferencesService.updatePreference("language", locale);
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("locale-change", {
        detail: { locale },
      }));
    }

    EventBus.emit("i18n:changed", {
      locale,
      unitSystem: this.getUnitSystem(),
    });

    const isRTL = this.isRTL(locale);
    if (typeof document !== "undefined") {
      document.documentElement.dir = isRTL ? "rtl" : "ltr";
      document.documentElement.lang = locale;
    }
  }

  private async loadTranslations(locale: Locale): Promise<void> {
    try {
      const module = await import(`./locales/${locale}.json`);
      this.translations.set(locale, module.default);
      this.loadedLocales.add(locale);
    } catch (error) {
      console.warn(`[I18n] Failed to load locale ${locale}, falling back to en:`, error);
      
      if (locale !== "en") {
        const enModule = await import(`./locales/en.json`);
        this.translations.set("en", enModule.default);
        this.loadedLocales.add("en");
        this.currentLocale = "en";
      }
    }
  }

  t(key: TranslationKey, fallback?: string): string {
    const dict = this.translations.get(this.currentLocale);
    
    if (dict && dict[key]) {
      return dict[key];
    }

    const enDict = this.translations.get("en");
    if (enDict && enDict[key]) {
      return enDict[key];
    }

    return fallback || key;
  }

  getLocale(): Locale {
    return this.currentLocale;
  }

  getUnitSystem(): UnitSystem {
    return IMPERIAL_REGIONS.includes(this.currentRegion) ? "imperial" : "metric";
  }

  isRTL(locale?: Locale): boolean {
    const checkLocale = locale || this.currentLocale;
    return checkLocale === "ar";
  }

  formatSpeed(speedKmh: number): string {
    const unitSystem = this.getUnitSystem();
    
    if (unitSystem === "imperial") {
      const mph = Math.round(speedKmh * 0.621371);
      return `${mph} mph`;
    }
    
    return `${Math.round(speedKmh)} km/h`;
  }

  formatDistance(distanceMeters: number): string {
    const unitSystem = this.getUnitSystem();
    
    if (unitSystem === "imperial") {
      const feet = distanceMeters * 3.28084;
      
      if (feet < 500) {
        return `${Math.round(feet)} ft`;
      }
      
      const miles = distanceMeters / 1609.34;
      return `${miles.toFixed(1)} mi`;
    }
    
    if (distanceMeters < 1000) {
      return `${Math.round(distanceMeters)} m`;
    }
    
    const km = distanceMeters / 1000;
    return `${km.toFixed(1)} km`;
  }

  formatTime(timestamp: number | Date): string {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const prefs = PreferencesService.getPreferences();
    const use12h = prefs.timeFormat === "12h" || TIME_12H_LOCALES.includes(this.currentLocale);
    
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    
    if (use12h) {
      const period = hours >= 12 ? "PM" : "AM";
      const hours12 = hours % 12 || 12;
      return `${hours12}:${minutes} ${period}`;
    }
    
    return `${hours.toString().padStart(2, "0")}:${minutes}`;
  }

  getTTSVoice(): string | null {
    const voicePrefs = TTS_VOICE_MAPPINGS[this.currentLocale];
    
    if (typeof window === "undefined" || !window.speechSynthesis) {
      return null;
    }

    const voices = window.speechSynthesis.getVoices();
    
    for (const preferredLang of voicePrefs) {
      const voice = voices.find(v => 
        v.lang.startsWith(preferredLang) || 
        v.lang === preferredLang
      );
      if (voice) {
        return voice.lang;
      }
    }
    
    return null;
  }

  findBestVoice(): SpeechSynthesisVoice | null {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      return null;
    }

    const voices = window.speechSynthesis.getVoices();
    const voicePrefs = TTS_VOICE_MAPPINGS[this.currentLocale];
    
    for (const preferredLang of voicePrefs) {
      const voice = voices.find(v => 
        v.lang.startsWith(preferredLang) || 
        v.lang === preferredLang
      );
      if (voice) {
        return voice;
      }
    }
    
    return voices.find(v => v.lang.startsWith("en")) || voices[0] || null;
  }

  private getStoredLocale(): Locale | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored && this.isValidLocale(stored) ? (stored as Locale) : null;
    } catch {
      return null;
    }
  }

  private storeLocale(locale: Locale): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, locale);
    } catch (error) {
      console.warn("[I18n] Failed to store locale:", error);
    }
  }

  getAvailableLocales(): Locale[] {
    return [
      "en", "sq-AL", "sr", "sl-SI", "de-CH", "fr-CH", "it-CH", "hr",
      "tr", "es", "pt-BR", "hi", "bn", "ar", "zh-CN"
    ];
  }

  getLocaleName(locale: Locale): string {
    const names: Record<Locale, string> = {
      "en": "English",
      "sq-AL": "Shqip (Albania)",
      "sr": "Српски",
      "sl-SI": "Slovenščina",
      "de-CH": "Deutsch (Schweiz)",
      "fr-CH": "Français (Suisse)",
      "it-CH": "Italiano (Svizzera)",
      "hr": "Hrvatski",
      "tr": "Türkçe",
      "es": "Español",
      "pt-BR": "Português (Brasil)",
      "hi": "हिन्दी",
      "bn": "বাংলা",
      "ar": "العربية",
      "zh-CN": "中文",
    };
    return names[locale];
  }
}

export const i18n = new I18nService();
