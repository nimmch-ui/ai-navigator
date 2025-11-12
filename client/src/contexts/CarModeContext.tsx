import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface CarModeContextType {
  isCarMode: boolean;
  toggleCarMode: () => void;
  setCarMode: (enabled: boolean) => void;
}

const CarModeContext = createContext<CarModeContextType | undefined>(undefined);

export function CarModeProvider({ children }: { children: ReactNode }) {
  const [isCarMode, setIsCarMode] = useState(() => {
    const saved = localStorage.getItem('carMode');
    const urlParams = new URLSearchParams(window.location.search);
    const modeParam = urlParams.get('mode');
    
    if (modeParam === 'car') {
      return true;
    }
    
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('carMode', String(isCarMode));
    
    if (isCarMode) {
      document.body.classList.add('car-mode');
    } else {
      document.body.classList.remove('car-mode');
    }
  }, [isCarMode]);

  const toggleCarMode = () => {
    setIsCarMode((prev) => !prev);
  };

  const setCarMode = (enabled: boolean) => {
    setIsCarMode(enabled);
  };

  return (
    <CarModeContext.Provider value={{ isCarMode, toggleCarMode, setCarMode }}>
      {children}
    </CarModeContext.Provider>
  );
}

export function useCarMode() {
  const context = useContext(CarModeContext);
  if (context === undefined) {
    throw new Error('useCarMode must be used within a CarModeProvider');
  }
  return context;
}
