import React, { useMemo } from 'react';
import { SavedTest, Page } from '../types';
import { useTheme } from '../ThemeContext';
import { useLocalization } from '../LocalizationContext'; // Import useLocalization

interface DashboardPageProps {
  savedTests: SavedTest[];
  onLoadTest: (test: SavedTest) => void;
  onDeleteTest: (testId: string) => void;
  setCurrentPage: (page: Page) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ savedTests, onLoadTest, onDeleteTest, setCurrentPage }) => {
  const { theme } = useTheme();
  const { t, locale } = useLocalization(); // Use localization
  const totalTests = savedTests.length;

  const testsByStatusData = useMemo(() => {
      if (totalTests === 0) return { passed: 0, failed: 0, notRun: 0};
      const mockPassed = Math.floor(totalTests * 0.6);
      const mockFailed = Math.floor(totalTests * 0.2);
      const mockNotRun = totalTests - mockPassed - mockFailed;
      return { passed: mockPassed, failed: mockFailed, notRun: Math.max(0, mockNotRun) };
  }, [totalTests]);

  const recentTests = useMemo(() => {
    return [...savedTests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
  }, [savedTests]);

  const handleLoadAndNavigate = (test: SavedTest) => {
    onLoadTest(test);
    setCurrentPage(Page.CREATE_TEST);
  };

  const cardBaseStyle = `p-6 rounded-lg shadow-md`;
  const cardDarkStyle = `bg-slate-800`;
  const cardLightStyle = `bg-white border border-slate-200`;
  const cardStyle = theme === 'light' ? `${cardBaseStyle} ${cardLightStyle}` : `${cardBaseStyle} ${cardDarkStyle}`;

  const textPrimaryColor = theme === 'light' ? 'text-slate-700' : 'text-gray-100';
  const textSecondaryColor = theme === 'light' ? 'text-slate-500' : 'text-gray-400';
  const textSkyColor = theme === 'light' ? 'text-sky-600' : 'text-sky-400';
  const textSkySubtleColor = theme === 'light' ? 'text-sky-500' : 'text-sky-300';
  const textSkyLighterColor = theme === 'light' ? 'text-sky-700' : 'text-sky-200';

  return (
    <div className={`p-6 h-full overflow-y-auto ${theme === 'light' ? 'bg-gray-100 text-slate-800' : 'bg-slate-900 text-gray-200'}`}>
      <h1 className={`text-3xl font-bold mb-8 ${textSkyColor}`}>{t('dashboard.title')}</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className={cardStyle}>
          <h2 className={`text-xl font-semibold mb-2 ${textSkySubtleColor}`}>{t('dashboard.totalTests')}</h2>
          <p className={`text-4xl font-bold ${textPrimaryColor}`}>{totalTests}</p>
        </div>
        <div className={cardStyle}>
          <h2 className={`text-xl font-semibold mb-2 ${textSkySubtleColor}`}>{t('dashboard.testStatusMock')}</h2>
          <div className="space-y-1 text-sm">
            <p className={textPrimaryColor}><span className="text-green-500 font-semibold">{testsByStatusData.passed}</span> {t('dashboard.passed')}</p>
            <p className={textPrimaryColor}><span className="text-red-500 font-semibold">{testsByStatusData.failed}</span> {t('dashboard.failed')}</p>
            <p className={textPrimaryColor}><span className="text-yellow-500 font-semibold">{testsByStatusData.notRun}</span> {t('dashboard.notRun')}</p>
          </div>
        </div>
        <div className={`${cardStyle} flex flex-col items-center justify-center`}>
           <h2 className={`text-xl font-semibold mb-3 ${textSkySubtleColor}`}>{t('dashboard.createNewTest')}</h2>
           <button 
             onClick={() => setCurrentPage(Page.CREATE_TEST)}
             className="bg-green-600 hover:bg-green-500 text-white font-semibold px-6 py-3 rounded-lg shadow transition-colors text-lg"
           >
             {t('dashboard.startCreating')}
           </button>
        </div>
      </div>

      <div className={cardStyle}>
        <h2 className={`text-2xl font-semibold mb-4 ${textSkySubtleColor}`}>{t('dashboard.recentTests')}</h2>
        {recentTests.length === 0 ? (
          <p className={textSecondaryColor}>{t('dashboard.noSavedTests')}</p>
        ) : (
          <ul className="space-y-3">
            {recentTests.map(test => (
              <li key={test.id} 
                  className={`p-4 rounded-md shadow flex flex-col sm:flex-row justify-between sm:items-center 
                              ${theme === 'light' ? 'bg-slate-50 border border-slate-200' : 'bg-slate-700'}`}>
                <div>
                  <p className={`font-semibold text-lg ${textSkyLighterColor}`}>{test.name}</p>
                  <p className={`text-xs ${textSecondaryColor}`}>
                    {test.url === "internal://test-page" 
                        ? t('createTestPage.loadModal.urlLabel', { url: t('general.internalTestPageName')})
                        : t('dashboard.testUrl', { url: test.url || t('dashboard.testUrlNotAvailable')})
                    } - {t('dashboard.stepsCount', { count: test.steps.length })}
                  </p>
                  <p className={`text-xs ${theme === 'light' ? 'text-slate-400' : 'text-gray-500'}`}>
                    {t('dashboard.savedAt', { date: new Date(test.createdAt).toLocaleString(locale) })}
                  </p>
                </div>
                <div className="space-x-2 mt-3 sm:mt-0">
                  <button onClick={() => handleLoadAndNavigate(test)} 
                          className={`text-sm px-3 py-1.5 rounded transition-colors
                                      ${theme === 'light' ? 'bg-sky-500 hover:bg-sky-600 text-white' : 'bg-sky-600 hover:bg-sky-500 text-white'}`}>
                    {t('dashboard.loadAndEdit')}
                  </button>
                  <button onClick={() => onDeleteTest(test.id)} className="text-sm bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded transition-colors">{t('general.delete')}</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
