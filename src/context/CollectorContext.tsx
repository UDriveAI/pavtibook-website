"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface CollectorContextType {
  isCollectorMode: boolean;
  setIsCollectorMode: (val: boolean) => void;
  toggleCollectorMode: () => void;
  rememberSelections: boolean;
  setRememberSelections: (val: boolean) => void;
  autoNext: boolean;
  setAutoNext: (val: boolean) => void;
  lastPurpose: string;
  setLastPurpose: (val: string) => void;
  lastPaymentMode: string;
  setLastPaymentMode: (val: string) => void;
  lastCollectedBy: string;
  setLastCollectedBy: (val: string) => void;
}

const CollectorContext = createContext<CollectorContextType | undefined>(undefined);

const STORAGE_KEYS = {
  COLLECTOR_MODE: "pavtibook_collector_mode",
  REMEMBER_SELECTIONS: "pavtibook_collector_remember_selections",
  AUTO_NEXT: "pavtibook_collector_auto_next",
  LAST_PURPOSE: "pavtibook_collector_last_purpose",
  LAST_PAYMENT_MODE: "pavtibook_collector_last_payment_mode",
  LAST_COLLECTED_BY: "pavtibook_collector_last_collected_by",
};

export const CollectorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isCollectorMode, setIsCollectorModeState] = useState<boolean>(false);
  const [rememberSelections, setRememberSelectionsState] = useState<boolean>(true);
  const [autoNext, setAutoNextState] = useState<boolean>(false);
  const [lastPurpose, setLastPurposeState] = useState<string>("");
  const [lastPaymentMode, setLastPaymentModeState] = useState<string>("Cash");
  const [lastCollectedBy, setLastCollectedByState] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const savedMode = localStorage.getItem(STORAGE_KEYS.COLLECTOR_MODE);
        if (savedMode !== null) setIsCollectorModeState(savedMode === "true");

        const savedRemember = localStorage.getItem(STORAGE_KEYS.REMEMBER_SELECTIONS);
        if (savedRemember !== null) setRememberSelectionsState(savedRemember === "true");

        const savedAuto = localStorage.getItem(STORAGE_KEYS.AUTO_NEXT);
        if (savedAuto !== null) setAutoNextState(savedAuto === "true");

        const savedPurpose = localStorage.getItem(STORAGE_KEYS.LAST_PURPOSE);
        if (savedPurpose !== null) setLastPurposeState(savedPurpose);

        const savedPayment = localStorage.getItem(STORAGE_KEYS.LAST_PAYMENT_MODE);
        if (savedPayment !== null) setLastPaymentModeState(savedPayment);

        const savedCollector = localStorage.getItem(STORAGE_KEYS.LAST_COLLECTED_BY);
        if (savedCollector !== null) setLastCollectedByState(savedCollector);
      } catch (err) {
        console.error("Failed to load collector settings from localStorage", err);
      }
    }
  }, []);

  const setIsCollectorMode = (val: boolean) => {
    setIsCollectorModeState(val);
    try {
      localStorage.setItem(STORAGE_KEYS.COLLECTOR_MODE, String(val));
    } catch {}
  };

  const toggleCollectorMode = () => {
    setIsCollectorMode(!isCollectorMode);
  };

  const setRememberSelections = (val: boolean) => {
    setRememberSelectionsState(val);
    try {
      localStorage.setItem(STORAGE_KEYS.REMEMBER_SELECTIONS, String(val));
    } catch {}
  };

  const setAutoNext = (val: boolean) => {
    setAutoNextState(val);
    try {
      localStorage.setItem(STORAGE_KEYS.AUTO_NEXT, String(val));
    } catch {}
  };

  const setLastPurpose = (val: string) => {
    setLastPurposeState(val);
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_PURPOSE, val);
    } catch {}
  };

  const setLastPaymentMode = (val: string) => {
    setLastPaymentModeState(val);
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_PAYMENT_MODE, val);
    } catch {}
  };

  const setLastCollectedBy = (val: string) => {
    setLastCollectedByState(val);
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_COLLECTED_BY, val);
    } catch {}
  };

  return (
    <CollectorContext.Provider
      value={{
        isCollectorMode,
        setIsCollectorMode,
        toggleCollectorMode,
        rememberSelections,
        setRememberSelections,
        autoNext,
        setAutoNext,
        lastPurpose,
        setLastPurpose,
        lastPaymentMode,
        setLastPaymentMode,
        lastCollectedBy,
        setLastCollectedBy,
      }}
    >
      {children}
    </CollectorContext.Provider>
  );
};

export const useCollector = (): CollectorContextType => {
  const context = useContext(CollectorContext);
  if (!context) {
    throw new Error("useCollector must be used within a CollectorProvider");
  }
  return context;
};