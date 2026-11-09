import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Language, translations } from '../i18n/translations';
import { HoldDto } from '../types/admission';
import { api } from '../services/api';

interface AdmissionContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations.en;
  bcn: string;
  setBcn: (bcn: string) => void;
  clearBcn: () => void;
  isBcnMasked: boolean;
  toggleBcnMask: () => void;
  activeHold: HoldDto | null;
  setActiveHold: (hold: HoldDto | null) => void;
  refreshActiveHold: () => Promise<void>;
  broadcastSync: () => void;
}

const AdmissionContext = createContext<AdmissionContextType | undefined>(undefined);

const BCN_STORAGE_KEY = 'admission_active_bcn';
const LANG_STORAGE_KEY = 'admission_preferred_lang';

export const AdmissionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem(LANG_STORAGE_KEY) as Language) || 'bn';
  });

  const [bcn, setBcnState] = useState<string>(() => {
    return localStorage.getItem(BCN_STORAGE_KEY) || '';
  });

  const [isBcnMasked, setIsBcnMasked] = useState<boolean>(true);
  const [activeHold, setActiveHold] = useState<HoldDto | null>(null);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  };

  const setBcn = (newBcn: string) => {
    const trimmed = newBcn.trim();
    setBcnState(trimmed);
    if (trimmed) {
      localStorage.setItem(BCN_STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(BCN_STORAGE_KEY);
    }
    // Broadcast change to other tabs
    localStorage.setItem('admission_tab_sync', String(Date.now()));
  };

  const clearBcn = () => {
    setBcnState('');
    setActiveHold(null);
    localStorage.removeItem(BCN_STORAGE_KEY);
    localStorage.setItem('admission_tab_sync', String(Date.now()));
  };

  const toggleBcnMask = () => {
    setIsBcnMasked((prev) => !prev);
  };

  const refreshActiveHold = useCallback(async () => {
    if (!bcn || bcn.length !== 17) {
      setActiveHold(null);
      return;
    }

    try {
      const holds = await api.getMyHolds(bcn);
      // Find the first HELD hold
      const held = holds.find((h) => h.status === 'HELD');
      setActiveHold(held || null);
    } catch {
      // If server unreachable or error, activeHold is untouched
    }
  }, [bcn]);

  useEffect(() => {
    if (bcn && bcn.length === 17) {
      refreshActiveHold();
    } else {
      setActiveHold(null);
    }
  }, [bcn, refreshActiveHold]);

  // Listen for multi-tab sync
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === BCN_STORAGE_KEY) {
        setBcnState(e.newValue || '');
      } else if (e.key === 'admission_tab_sync') {
        const storedBcn = localStorage.getItem(BCN_STORAGE_KEY) || '';
        setBcnState(storedBcn);
        refreshActiveHold();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [refreshActiveHold]);

  const broadcastSync = () => {
    localStorage.setItem('admission_tab_sync', String(Date.now()));
  };

  const t = translations[language];

  return (
    <AdmissionContext.Provider
      value={{
        language,
        setLanguage,
        t,
        bcn,
        setBcn,
        clearBcn,
        isBcnMasked,
        toggleBcnMask,
        activeHold,
        setActiveHold,
        refreshActiveHold,
        broadcastSync,
      }}
    >
      {children}
    </AdmissionContext.Provider>
  );
};

export const useAdmission = () => {
  const context = useContext(AdmissionContext);
  if (!context) {
    throw new Error('useAdmission must be used within an AdmissionProvider');
  }
  return context;
};
