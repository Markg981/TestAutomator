import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useTheme } from '../ThemeContext';
import { useLocalization } from '../LocalizationContext';

export const LoginPage: React.FC = () => {
  const { login, error } = useAuth();
  const { theme } = useTheme();
  const { t } = useLocalization();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      return;
    }
    
    setIsLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      // Error is handled by AuthContext
    } finally {
      setIsLoading(false);
    }
  };

  const inputClasses = theme === 'light'
    ? 'bg-white text-slate-700 border-slate-300 focus:ring-sky-500 placeholder-slate-400'
    : 'bg-slate-700 text-gray-200 border-slate-600 focus:ring-sky-500 placeholder-gray-400';

  const buttonClasses = theme === 'light'
    ? 'bg-sky-500 hover:bg-sky-600 text-white'
    : 'bg-sky-600 hover:bg-sky-500 text-white';

  return (
    <div className={`min-h-screen flex items-center justify-center ${theme === 'light' ? 'bg-gray-100' : 'bg-slate-900'}`}>
      <div className={`w-full max-w-md p-8 rounded-lg shadow-lg ${theme === 'light' ? 'bg-white' : 'bg-slate-800'}`}>
        <h2 className={`text-2xl font-bold mb-6 text-center ${theme === 'light' ? 'text-sky-600' : 'text-sky-400'}`}>
          {t('loginPage.title')}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className={`block text-sm font-medium mb-2 ${theme === 'light' ? 'text-slate-700' : 'text-gray-200'}`}>
              {t('loginPage.usernameLabel')}
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`w-full p-3 rounded-md border focus:outline-none focus:ring-2 ${inputClasses}`}
              placeholder={t('loginPage.usernamePlaceholder')}
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className={`block text-sm font-medium mb-2 ${theme === 'light' ? 'text-slate-700' : 'text-gray-200'}`}>
              {t('loginPage.passwordLabel')}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full p-3 rounded-md border focus:outline-none focus:ring-2 ${inputClasses}`}
              placeholder={t('loginPage.passwordPlaceholder')}
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !username || !password}
            className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${buttonClasses} disabled:opacity-50`}
          >
            {isLoading ? t('loginPage.loggingIn') : t('loginPage.loginButton')}
          </button>
        </form>
      </div>
    </div>
  );
}; 