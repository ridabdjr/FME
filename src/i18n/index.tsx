import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { TRANSLATIONS, AppLanguage } from './translations';

export type { AppLanguage };

export interface I18nContextValue {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  dir: 'ltr' | 'rtl';
  isRTL: boolean;
  t: (path: string, fallback?: string) => string;
  formatDate: (date: string | Date | number, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (val: number) => string;
  availableLanguages: Array<{
    code: AppLanguage;
    label: string;
    nativeLabel: string;
    flag: string;
    dir: 'ltr' | 'rtl';
  }>;
}

const LANGUAGE_STORAGE_KEY = 'telecomops360_language_v1';

export const AVAILABLE_LANGUAGES: Array<{
  code: AppLanguage;
  label: string;
  nativeLabel: string;
  flag: string;
  dir: 'ltr' | 'rtl';
}> = [
  { code: 'en', label: 'English', nativeLabel: 'English', flag: '🇬🇧', dir: 'ltr' },
  { code: 'fr', label: 'French', nativeLabel: 'Français', flag: '🇫🇷', dir: 'ltr' },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية', flag: '🇩🇿', dir: 'rtl' },
];

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    try {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (saved === 'en' || saved === 'fr' || saved === 'ar') {
        return saved;
      }
      // Check browser language
      const navLang = navigator.language.toLowerCase();
      if (navLang.startsWith('ar')) return 'ar';
      if (navLang.startsWith('fr')) return 'fr';
      return 'en';
    } catch {
      return 'en';
    }
  });

  const dir: 'ltr' | 'rtl' = language === 'ar' ? 'rtl' : 'ltr';
  const isRTL = dir === 'rtl';

  useEffect(() => {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // Ignore storage errors
    }

    // Sync html document lang & dir attributes
    const root = document.documentElement;
    root.setAttribute('lang', language);
    root.setAttribute('dir', dir);
    if (dir === 'rtl') {
      root.classList.add('rtl-active');
    } else {
      root.classList.remove('rtl-active');
    }
  }, [language, dir]);

  const setLanguage = (lang: AppLanguage) => {
    setLanguageState(lang);
  };

  /**
   * Recursive dot-notation translation accessor
   * e.g., t('common.save') -> "Save" or "Enregistrer" or "حفظ"
   */
  const t = (path: string, fallback?: string): string => {
    const keys = path.split('.');
    let current: any = TRANSLATIONS[language];

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        // Fallback to English dictionary if key missing in current language
        let fallbackEn: any = TRANSLATIONS.en;
        for (const fKey of keys) {
          if (fallbackEn && typeof fallbackEn === 'object' && fKey in fallbackEn) {
            fallbackEn = fallbackEn[fKey];
          } else {
            fallbackEn = undefined;
            break;
          }
        }
        if (typeof fallbackEn === 'string') return fallbackEn;
        return fallback || path;
      }
    }

    if (typeof current === 'string') {
      return current;
    }

    return fallback || path;
  };

  const formatDate = (
    dateInput: string | Date | number,
    options?: Intl.DateTimeFormatOptions
  ): string => {
    try {
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return String(dateInput);
      const locale = language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-FR' : 'en-US';
      const defaultOptions: Intl.DateTimeFormatOptions = options || {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      };
      return new Intl.DateTimeFormat(locale, defaultOptions).format(d);
    } catch {
      return String(dateInput);
    }
  };

  const formatNumber = (val: number): string => {
    try {
      const locale = language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-FR' : 'en-US';
      return new Intl.NumberFormat(locale).format(val);
    } catch {
      return String(val);
    }
  };

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage,
      dir,
      isRTL,
      t,
      formatDate,
      formatNumber,
      availableLanguages: AVAILABLE_LANGUAGES,
    }),
    [language, dir, isRTL]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useTranslation = (): I18nContextValue => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
};

export const useI18n = useTranslation;

