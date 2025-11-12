import { useState, useEffect } from "react";
import { i18n, type Locale, type TranslationKey, type UnitSystem } from "@/services/i18n";

export function useTranslation() {
  const [locale, setLocale] = useState<Locale>(i18n.getLocale());
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(i18n.getUnitSystem());

  useEffect(() => {
    const handleLocaleChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ locale: Locale }>;
      setLocale(customEvent.detail.locale);
      setUnitSystem(i18n.getUnitSystem());
    };

    window.addEventListener("locale-change", handleLocaleChange);

    return () => {
      window.removeEventListener("locale-change", handleLocaleChange);
    };
  }, []);

  const t = (key: TranslationKey, fallback?: string): string => {
    return i18n.t(key, fallback);
  };

  const changeLocale = async (newLocale: Locale): Promise<void> => {
    await i18n.setLocale(newLocale);
  };

  const formatSpeed = (speedKmh: number): string => {
    return i18n.formatSpeed(speedKmh);
  };

  const formatDistance = (distanceMeters: number): string => {
    return i18n.formatDistance(distanceMeters);
  };

  const formatTime = (timestamp: number | Date): string => {
    return i18n.formatTime(timestamp);
  };

  const findBestVoice = (): SpeechSynthesisVoice | null => {
    return i18n.findBestVoice();
  };

  const isRTL = i18n.isRTL();

  return {
    t,
    locale,
    unitSystem,
    isRTL,
    changeLocale,
    formatSpeed,
    formatDistance,
    formatTime,
    findBestVoice,
    availableLocales: i18n.getAvailableLocales(),
    getLocaleName: i18n.getLocaleName.bind(i18n),
  };
}
