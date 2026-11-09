/**
 * @file AdmissionContext.tsx
 * @description Global React Context managing bilingual language selection (`bn` / `en`),
 * active 17-digit Student Birth Certificate Number (BCN) persistence in `localStorage`,
 * privacy masking state, active hold tracking, and cross-tab synchronization via the `storage` event.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Language, translations } from '../i18n/translations';
import { HoldDto } from '../types/admission';
import { api } from '../services/api';

/**
 * Shape of the global admission context exposed via {@link useAdmission}.
 */
interface AdmissionContextType {
  /** Currently active UI language (`'bn'` or `'en'`). */
  language: Language;
  /** Updates the active UI language and persists it to `localStorage`. */
  setLanguage: (lang: Language) => void;
  /** Localized string dictionary for the active language. */
  t: typeof translations.en;
  /** Active 17-digit Student Birth Certificate Number (BCN). */
  bcn: string;
  /** Sets and persists the active 17-digit Student BCN across tabs. */
  setBcn: (bcn: string) => void;
  /** Clears the active BCN and resets any active hold state. */
  clearBcn: () => void;
  /** Whether the displayed BCN should have its middle 9 digits masked (`2010*********0123`). */
  isBcnMasked: boolean;
  /** Toggles BCN privacy masking on or off. */
  toggleBcnMask: () => void;
  /** Currently active (`HELD`) application for the current BCN, if any. */
  activeHold: HoldDto | null;
  /** Directly updates the cached active hold. */
  setActiveHold: (hold: HoldDto | null) => void;
  /** Re-fetches the student's holds from `/me/holds` to synchronize `activeHold`. */
  refreshActiveHold: () => Promise<void>;
  /** Emits a timestamped `localStorage` event to notify other open browser tabs to refresh state. */
  broadcastSync: () => void;
}

const AdmissionContext = createContext<AdmissionContextType | undefined>(undefined);

const BCN_STORAGE_KEY = 'admission_active_bcn';
const LANG_STORAGE_KEY = 'admission_preferred_lang';

/**
 * Context provider that wraps the application to provide student BCN state,
 * bilingual translations, and multi-tab state synchronization.
 */
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

/**
 * Custom hook to access the global {@link AdmissionContextType}.
 * Throws an error if invoked outside of an {@link AdmissionProvider}.
 */
export const useAdmission = () => {
  const context = useContext(AdmissionContext);
  if (!context) {
    throw new Error('useAdmission must be used within an AdmissionProvider');
  }
  return context;
};
