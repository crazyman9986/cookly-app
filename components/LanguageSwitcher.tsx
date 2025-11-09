
import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ChevronDownIcon } from './icons/ChevronDownIcon';

const languages = {
  en: { name: 'English', flag: 'gb', code: 'EN' },
  es: { name: 'Español', flag: 'es', code: 'ES' },
  fr: { name: 'Français', flag: 'fr', code: 'FR' },
  de: { name: 'Deutsch', flag: 'de', code: 'DE' },
  it: { name: 'Italiano', flag: 'it', code: 'IT' },
  hi: { name: 'हिन्दी', flag: 'in', code: 'HI' },
  ja: { name: '日本語', flag: 'jp', code: 'JA' },
  ru: { name: 'Русский', flag: 'ru', code: 'RU' },
  pt: { name: 'Português', flag: 'pt', code: 'PT' },
  tr: { name: 'Türkçe', flag: 'tr', code: 'TR' },
  az: { name: 'Azərbaycanca', flag: 'az', code: 'AZ' },
  pl: { name: 'Polski', flag: 'pl', code: 'PL' },
  zh: { name: '中文', flag: 'cn', code: 'ZH' },
  ar: { name: 'العربية', flag: 'sa', code: 'AR' },
};

type LanguageCode = keyof typeof languages;

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);

  const handleLanguageChange = (lang: LanguageCode) => {
    setLanguage(lang);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 p-2 rounded-lg text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-800 transition-colors"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={`Change language, current language ${languages[language].name}`}
      >
        <span className="font-semibold text-sm w-6 text-center">{languages[language].code}</span>
        <ChevronDownIcon className={`w-4 h-4 text-gray-500 dark:text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-xl ring-1 ring-black ring-opacity-5 z-30 overflow-hidden animate-fade-in"
          role="menu"
          aria-orientation="vertical"
        >
          <div className="p-1 max-h-72 overflow-y-auto" role="none">
            {Object.entries(languages).map(([code, { name, flag }]) => (
              <button
                key={code}
                onClick={() => handleLanguageChange(code as LanguageCode)}
                className={`w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors text-gray-700 dark:text-slate-200
                  ${language === code 
                    ? 'bg-indigo-50 dark:bg-indigo-900/30' 
                    : 'hover:bg-gray-100 dark:hover:bg-slate-700'
                  }`}
                role="menuitem"
              >
                <img src={`https://flagcdn.com/w40/${flag}.png`} alt={name} className="w-6 h-auto rounded-sm object-cover" />
                <span className={`${language === code ? 'font-semibold' : ''}`}>{name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
