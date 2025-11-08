
import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';
import { translations, Translation } from '../lib/translations';

type Language = 'en' | 'es' | 'fr' | 'de' | 'it' | 'hi' | 'ja' | 'ru' | 'pt' | 'tr' | 'az' | 'pl' | 'zh' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  translations: Translation;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const storedLang = localStorage.getItem('cookly-lang');
      return (storedLang && Object.keys(translations).includes(storedLang)) ? (storedLang as Language) : 'en';
    } catch {
      return 'en';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('cookly-lang', language);
    } catch (error) {
      console.error("Could not save language to localStorage", error);
    }
  }, [language]);

  const contextValue = useMemo(() => ({
    language,
    setLanguage,
    translations: translations[language],
  }), [language]);

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};