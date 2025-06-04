import React from 'react';
import { Page } from '../types';
import { useTheme } from '../ThemeContext';
import { useLocalization } from '../LocalizationContext'; // Import useLocalization
import { useAuth } from '../AuthContext';

interface NavigationMenuProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
}

const NavItem: React.FC<{
  page: Page;
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  label: string; // Label is now passed as a translated string
  icon: React.ReactNode;
  theme: 'light' | 'dark';
}> = ({ page, currentPage, setCurrentPage, label, icon, theme }) => (
  <button
    onClick={() => setCurrentPage(page)}
    className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-md transition-colors
                ${currentPage === page
                  ? (theme === 'light' ? 'bg-sky-500 text-white' : 'bg-sky-600 text-white')
                  : (theme === 'light' ? 'text-slate-700 hover:bg-slate-200 hover:text-slate-900' : 'text-gray-300 hover:bg-slate-700 hover:text-white')
                }`}
  >
    {icon}
    {label}
  </button>
);

// Placeholder icons (remain unchanged)
const IconDashboard = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);
const IconCreateTest = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);
const IconRecordTest = () => ( 
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1V10a1 1 0 011-1h1.586l4.707-4.707C10.683 3.904 11 4.146 11 4.586v14.828c0 .44-.317.682-.707.388L5.586 15z" />
    <circle cx="19" cy="12" r="2" stroke="currentColor" strokeWidth="2" fill="red" />
  </svg>
);
const IconSettings = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066 2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export const NavigationMenu: React.FC<NavigationMenuProps> = ({ currentPage, setCurrentPage }) => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <nav className={`w-60 p-4 space-y-2 h-full flex-shrink-0 shadow-lg ${theme === 'light' ? 'bg-slate-100 border-r border-slate-300' : 'bg-slate-800'}`}>
      <div className={`text-2xl font-bold mb-6 text-center ${theme === 'light' ? 'text-sky-600' : 'text-sky-400'}`}>
        {t('navigation.title')}
      </div>

      {/* User Info */}
      <div className={`mb-6 p-4 rounded-lg ${theme === 'light' ? 'bg-white shadow-sm' : 'bg-slate-700'}`}>
        <div className={`text-sm font-medium ${theme === 'light' ? 'text-slate-600' : 'text-gray-300'}`}>
          {t('navigation.loggedInAs')}
        </div>
        <div className={`text-base font-semibold ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>
          {user?.username}
        </div>
        <div className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-gray-400'}`}>
          {user?.email}
        </div>
      </div>

      {/* Navigation Items */}
      <NavItem
        page={Page.DASHBOARD}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        label={t('navigation.dashboard')}
        icon={<IconDashboard />}
        theme={theme}
      />
      <NavItem
        page={Page.CREATE_TEST}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        label={t('navigation.createTest')}
        icon={<IconCreateTest />}
        theme={theme}
      />
      <NavItem
        page={Page.RECORD_TEST}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        label={t('navigation.recordTest')}
        icon={<IconRecordTest />}
        theme={theme}
      />
      <NavItem
        page={Page.SETTINGS}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        label={t('navigation.settings')}
        icon={<IconSettings />}
        theme={theme}
      />

      {/* Logout Button */}
      <div className="mt-auto pt-4">
        <button
          onClick={handleLogout}
          className={`w-full p-2 rounded-lg text-left flex items-center space-x-2 transition-colors
            ${theme === 'light'
              ? 'text-red-600 hover:bg-red-50'
              : 'text-red-400 hover:bg-slate-700'}`}
        >
          <IconLogout />
          <span>{t('navigation.logout')}</span>
        </button>
      </div>
    </nav>
  );
};

// Add Logout Icon
const IconLogout = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 6.707 6.293a1 1 0 00-1.414 1.414L8.586 11l-3.293 3.293a1 1 0 101.414 1.414L10 12.414l3.293 3.293a1 1 0 001.414-1.414L11.414 11l3.293-3.293z" clipRule="evenodd" />
  </svg>
);
