import React, { useState, useEffect } from 'react';
import { useTheme, Theme } from '../ThemeContext';
import { useLocalization } from '../LocalizationContext';
import { Locale, translations } from '../i18n'; // Corrected import path for Locale and translations

interface SettingsPageProps {
  isProxyEnabled: boolean;
  setIsProxyEnabled: (enabled: boolean) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ isProxyEnabled, setIsProxyEnabled }) => {
  const { theme, setTheme: setGlobalTheme } = useTheme();
  const { t, locale, setLocale } = useLocalization(); // Use localization
  
  const [defaultTestUrl, setDefaultTestUrl] = useState<string>('https://www.google.com');
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);

  const handleThemeChange = (newTheme: Theme) => {
    setGlobalTheme(newTheme);
  };

  const handleLanguageChange = (newLocale: Locale) => {
    setLocale(newLocale);
  };

  const handleProxyToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsProxyEnabled(event.target.checked);
  };

  const handleSaveSettings = () => {
    localStorage.setItem('defaultTestUrl', defaultTestUrl);
    localStorage.setItem('notificationsEnabled', JSON.stringify(notificationsEnabled));
    // isProxyEnabled is saved by App.tsx's useEffect
    alert(t('settingsPage.settingsSavedAlert'));
  };
  
  useEffect(() => {
    const storedUrl = localStorage.getItem('defaultTestUrl');
    if (storedUrl) setDefaultTestUrl(storedUrl);
    const storedNotifications = localStorage.getItem('notificationsEnabled');
    if (storedNotifications) setNotificationsEnabled(JSON.parse(storedNotifications));
  }, []);

  const cardBaseStyle = `p-6 rounded-lg shadow-md`;
  const cardDarkStyle = `bg-slate-800`;
  const cardLightStyle = `bg-white border border-slate-200`;
  const cardStyle = theme === 'light' ? `${cardBaseStyle} ${cardLightStyle}` : `${cardBaseStyle} ${cardDarkStyle}`;

  const textPrimaryColor = theme === 'light' ? 'text-slate-700' : 'text-gray-200';
  const textSecondaryColor = theme === 'light' ? 'text-slate-500' : 'text-gray-400';
  const textSkyColor = theme === 'light' ? 'text-sky-600' : 'text-sky-400';
  const textSkySubtleColor = theme === 'light' ? 'text-sky-500' : 'text-sky-300';
  
  const inputClasses = theme === 'light' 
    ? 'bg-white text-slate-700 border-slate-300 focus:ring-sky-500 placeholder-slate-400' 
    : 'bg-slate-700 text-gray-200 border-slate-600 focus:ring-sky-500 placeholder-gray-400';
  
  const radioCheckboxBase = `form-radio h-4 w-4 text-sky-600 focus:ring-sky-500`;
  const radioCheckboxLight = `bg-slate-100 border-slate-300`;
  const radioCheckboxDark = `bg-slate-700 border-slate-600`;
  const radioCheckboxStyle = theme === 'light' ? `${radioCheckboxBase} ${radioCheckboxLight}` : `${radioCheckboxBase} ${radioCheckboxDark}`;
  
  const checkboxBase = `form-checkbox h-5 w-5 rounded text-sky-600 focus:ring-sky-500`;
  const checkboxStyle = theme === 'light' ? `${checkboxBase} ${radioCheckboxLight}` : `${checkboxBase} ${radioCheckboxDark}`;


  return (
    <div className={`p-6 h-full overflow-y-auto ${theme === 'light' ? 'bg-gray-100 text-slate-800' : 'bg-slate-900 text-gray-200'}`}>
      <h1 className={`text-3xl font-bold mb-8 ${textSkyColor}`}>{t('settingsPage.title')}</h1>

      <div className="space-y-6 max-w-2xl mx-auto">
        <div className={cardStyle}>
          <h2 className={`text-xl font-semibold mb-4 ${textSkySubtleColor}`}>{t('settingsPage.themeSettings')}</h2>
          <div className="flex items-center space-x-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="theme"
                value="dark"
                checked={theme === 'dark'}
                onChange={() => handleThemeChange('dark')}
                className={radioCheckboxStyle}
              />
              <span className={`ml-2 ${textPrimaryColor}`}>{t('settingsPage.darkTheme')}</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="theme"
                value="light"
                checked={theme === 'light'}
                onChange={() => handleThemeChange('light')}
                className={radioCheckboxStyle}
              />
              <span className={`ml-2 ${textPrimaryColor}`}>{t('settingsPage.lightTheme')}</span>
            </label>
          </div>
        </div>

        <div className={cardStyle}>
          <h2 className={`text-xl font-semibold mb-4 ${textSkySubtleColor}`}>{t('settingsPage.languageSettings')}</h2>
          <p className={`text-sm mb-2 ${textSecondaryColor}`}>{t('settingsPage.selectLanguage')}:</p>
          <div className="flex items-center space-x-4">
            {(Object.keys(translations) as Locale[]).map((langCode) => (
              <label key={langCode} className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="language"
                  value={langCode}
                  checked={locale === langCode}
                  onChange={() => handleLanguageChange(langCode)}
                  className={radioCheckboxStyle}
                />
                <span className={`ml-2 ${textPrimaryColor}`}>{translations[langCode].langName as string}</span>
              </label>
            ))}
          </div>
        </div>
        
        <div className={cardStyle}>
          <h2 className={`text-xl font-semibold mb-4 ${textSkySubtleColor}`}>{t('settingsPage.proxySettings.title')}</h2>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isProxyEnabled}
                onChange={handleProxyToggle}
                className={checkboxStyle}
              />
              <span className={`ml-3 ${textPrimaryColor}`}>{t('settingsPage.proxySettings.enableProxyLabel')}</span>
            </label>
            <p className={`text-xs mt-2 ${textSecondaryColor}`}>{t('settingsPage.proxySettings.enableProxyDescription')}</p>
        </div>

        <div className={cardStyle}>
          <h2 className={`text-xl font-semibold mb-4 ${textSkySubtleColor}`}>{t('settingsPage.testConfiguration')}</h2>
          <div>
            <label htmlFor="defaultUrl" className={`block text-sm font-medium mb-1 ${textPrimaryColor}`}>
              {t('settingsPage.defaultUrlNewLabel')}
            </label>
            <input
              type="url"
              id="defaultUrl"
              value={defaultTestUrl}
              onChange={(e) => setDefaultTestUrl(e.target.value)}
              className={`w-full p-2 rounded border outline-none ${inputClasses}`}
              placeholder={t('settingsPage.defaultUrlPlaceholder')}
            />
          </div>
        </div>
        
        <div className={cardStyle}>
          <h2 className={`text-xl font-semibold mb-4 ${textSkySubtleColor}`}>{t('settingsPage.notifications')}</h2>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(e) => setNotificationsEnabled(e.target.checked)}
                className={checkboxStyle}
              />
              <span className={`ml-3 ${textPrimaryColor}`}>{t('settingsPage.enableSystemNotifications')}</span>
            </label>
            <p className={`text-xs mt-2 ${textSecondaryColor}`}>{t('settingsPage.notificationsDisclaimer')}</p>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSaveSettings}
            className={`font-semibold px-6 py-2 rounded-lg shadow transition-colors
                        ${theme === 'light' ? 'bg-sky-500 hover:bg-sky-600 text-white' : 'bg-sky-600 hover:bg-sky-500 text-white'}`}
          >
            {t('settingsPage.saveSettingsButton')}
          </button>
        </div>
      </div>
    </div>
  );
};