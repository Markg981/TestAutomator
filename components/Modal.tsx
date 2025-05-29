import React, { ReactNode } from 'react';
import { useTheme } from '../ThemeContext';
import { useLocalization } from '../LocalizationContext'; // Import useLocalization

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string; // Title should be translated by parent component before passing
  children: ReactNode;
  footer?: ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer }) => {
  const { theme } = useTheme();
  const { t } = useLocalization(); // Use localization for aria-label
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div 
        className={`p-6 rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col
                    ${theme === 'light' ? 'bg-white text-slate-800' : 'bg-slate-800 text-gray-200'}`}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className={`text-xl font-semibold ${theme === 'light' ? 'text-sky-600' : 'text-sky-400'}`}>{title}</h2>
          <button
            onClick={onClose}
            className={`${theme === 'light' ? 'text-slate-500 hover:text-slate-700' : 'text-gray-400 hover:text-gray-200'} transition-colors`}
            aria-label={t('general.close')} // Translated aria-label
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto mb-4 flex-grow">
          {children}
        </div>
        {footer && (
          <div className={`mt-auto pt-4 border-t ${theme === 'light' ? 'border-slate-300' : 'border-slate-700'}`}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
