import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import ErrorToast from '../components/ErrorToast';

interface ErrorToastData {
  id: string;
  message: string;
  type?: 'error' | 'warning' | 'info' | 'success';
  duration?: number;
}

interface ErrorContextType {
  showError: (message: string, type?: 'error' | 'warning' | 'info' | 'success', duration?: number) => void;
  clearError: (id: string) => void;
  clearAllErrors: () => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export const useError = () => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError deve ser usado dentro de ErrorProvider');
  }
  return context;
};

export const ErrorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [errors, setErrors] = useState<ErrorToastData[]>([]);

  const showError = useCallback((
    message: string,
    type: 'error' | 'warning' | 'info' | 'success' = 'error',
    duration: number = 5000
  ) => {
    const id = `error-${Date.now()}-${Math.random()}`;
    setErrors(prev => [...prev, { id, message, type, duration }]);
  }, []);

  const clearError = useCallback((id: string) => {
    setErrors(prev => prev.filter(e => e.id !== id));
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors([]);
  }, []);

  return (
    <ErrorContext.Provider value={{ showError, clearError, clearAllErrors }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {errors.map(error => (
          <div key={error.id} className="pointer-events-auto">
            <ErrorToast
              message={error.message}
              type={error.type}
              duration={error.duration}
              onClose={() => clearError(error.id)}
            />
          </div>
        ))}
      </div>
    </ErrorContext.Provider>
  );
};

