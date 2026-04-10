import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Translator from './translator';

// Create the translator instance once (singleton)
const translatorInstance = new Translator();

// Create the context
const TranslatorContext = createContext({
  translator: translatorInstance,
  currentLocale: translatorInstance.getLocale(),
  setLocale: () => {},
  t: (phrase, ...params) => phrase
});

// Provider component
export const TranslatorProvider = ({ children }) => {
  const [currentLocale, setCurrentLocale] = useState(translatorInstance.getLocale());

  // Memoized setLocale function
  const setLocale = useCallback((locale) => {
    translatorInstance.setLocale(locale);
    setCurrentLocale(translatorInstance.getLocale());
    // Dispatch event for legacy components that use window event
    window.dispatchEvent(new Event('languageChanged'));
  }, []);

  // Translation function
  const t = useCallback((phrase, ...params) => {
    return translatorInstance.translate(phrase, ...params);
  }, [currentLocale]); // Re-create when locale changes

  // Listen for language changes from other sources
  useEffect(() => {
    const handleLanguageChange = () => {
      setCurrentLocale(translatorInstance.getLocale());
    };

    window.addEventListener('languageChanged', handleLanguageChange);
    return () => {
      window.removeEventListener('languageChanged', handleLanguageChange);
    };
  }, []);

  const value = {
    translator: translatorInstance,
    currentLocale,
    setLocale,
    t
  };

  return (
    <TranslatorContext.Provider value={value}>
      {children}
    </TranslatorContext.Provider>
  );
};

// Hook to use translator
export const useTranslator = () => {
  const context = useContext(TranslatorContext);
  if (!context) {
    console.warn('useTranslator must be used within a TranslatorProvider');
    return {
      translator: translatorInstance,
      currentLocale: 'en',
      setLocale: () => {},
      t: (phrase) => phrase
    };
  }
  return context;
};

// Export the singleton instance for legacy code
export const getTranslatorInstance = () => translatorInstance;

export default TranslatorContext;
