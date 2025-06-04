import React, { useState, useEffect, useCallback } from 'react';
import { Page, SavedTest, TestStep, DetectedElement } from './types';
import { NavigationMenu } from './components/NavigationMenu';
import { DashboardPage } from './pages/DashboardPage';
import { CreateTestPage, CreateTestPageProps } from './pages/CreateTestPage';
import { RecordTestPage, RecordTestPageProps } from './pages/RecordTestPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { loadAllTestsFromLocalStorage, deleteTestFromLocalStorage } from './services/testStorageService';
import { useTheme } from './ThemeContext';
import { useLocalization } from './LocalizationContext';
import { useAuth } from './AuthContext';

const App: React.FC = () => {
  const { theme } = useTheme();
  const { t, locale } = useLocalization();
  const { user, loading: authLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>(Page.DASHBOARD);
  const [savedTests, setSavedTests] = useState<SavedTest[]>([]);
  const [isLoadingTests, setIsLoadingTests] = useState(true);

  const [url, setUrl] = useState<string>('https://localhost:62701/gstd/gstd-report');
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState<boolean>(false);
  const [isPagePreviewVisible, setIsPagePreviewVisible] = useState<boolean>(false);
  const [detectedElements, setDetectedElements] = useState<DetectedElement[]>([]);
  const [isDetectingElements, setIsDetectingElements] = useState<boolean>(false);
  const [testSteps, setTestSteps] = useState<TestStep[]>([]);
  const [currentTestName, setCurrentTestName] = useState<string>(t('createTestPage.testCanvas.newTestNameDefault'));
  const [currentTestId, setCurrentTestId] = useState<string | null>(null);
  const [isRunningTest, setIsRunningTest] = useState<boolean>(false);
  const [executionLog, setExecutionLog] = useState<string[]>([]);
  const [isProxyEnabled, setIsProxyEnabled] = useState<boolean>(() => {
    const storedProxySetting = localStorage.getItem('appProxyEnabled');
    return storedProxySetting ? JSON.parse(storedProxySetting) : true;
  });

  useEffect(() => {
    const loadTests = async () => {
      setIsLoadingTests(true);
      try {
        const tests = await loadAllTestsFromLocalStorage();
        setSavedTests(tests);
      } catch (error) {
        console.error('Error loading tests:', error);
        setSavedTests([]);
      } finally {
        setIsLoadingTests(false);
      }
    };
    loadTests();
  }, []);
  
  useEffect(() => {
    document.body.className = ''; 
    if (theme === 'light') {
      document.body.classList.add('bg-gray-100', 'text-slate-800');
    } else {
      document.body.classList.add('bg-slate-900', 'text-gray-200');
    }
  }, [theme]);

  useEffect(() => {
    if (currentTestName === translations[locale === 'it' ? 'en' : 'it'].createTestPage.testCanvas.newTestNameDefault) {
        setCurrentTestName(t('createTestPage.testCanvas.newTestNameDefault'));
    }
  }, [locale, t, currentTestName]);

  useEffect(() => {
    localStorage.setItem('appProxyEnabled', JSON.stringify(isProxyEnabled));
  }, [isProxyEnabled]);

  const handleLoadTestForEditing = useCallback((testToLoad: SavedTest) => {
    setUrl(testToLoad.url || '');
    setIframeSrc(null);
    setIsPagePreviewVisible(false);
    setTestSteps(testToLoad.steps);
    setCurrentTestName(testToLoad.name);
    setCurrentTestId(testToLoad.id);
    setDetectedElements([]); 
    setExecutionLog([t('createTestPage.logs.testLoaded', { 
        name: testToLoad.name, 
        url: testToLoad.url || t('createTestPage.loadModal.notAvailableUrl') 
    })]);
  }, [t]);

  const handleDeleteTest = useCallback(async (testId: string) => {
    if (window.confirm(t('createTestPage.logs.confirmDeleteTest'))) {
      try {
        await deleteTestFromLocalStorage(testId);
        const updatedSavedTests = await loadAllTestsFromLocalStorage();
        setSavedTests(updatedSavedTests);
        
        if (currentTestId === testId) {
          setUrl('https://localhost:62701/gstd/gstd-report'); 
          setIframeSrc(null);
          setIsPagePreviewVisible(false);
          setTestSteps([]);
          setCurrentTestName(t('createTestPage.testCanvas.newTestNameDefault'));
          setCurrentTestId(null);
          setDetectedElements([]);
          setExecutionLog([t('createTestPage.logs.currentTestDeletedResetState')]);
        }
      } catch (error) {
        console.error('Error deleting test:', error);
      }
    }
  }, [currentTestId, t]);

  const createTestPageProps: CreateTestPageProps = {
    url, setUrl, iframeSrc, setIframeSrc, isLoadingPage, setIsLoadingPage,
    isPagePreviewVisible, setIsPagePreviewVisible, executionLog, setExecutionLog,
    savedTests, setSavedTests, 
    onDeleteTestInPage: handleDeleteTest,
    isProxyEnabled,
    detectedElements, setDetectedElements,
    isDetectingElements, setIsDetectingElements,
    testSteps, setTestSteps,
    currentTestName, setCurrentTestName,
    currentTestId, setCurrentTestId,
    isRunningTest, setIsRunningTest
  };

  const recordTestPageProps: RecordTestPageProps = {
    isProxyEnabled,
  };

  const translations = {
    it: { createTestPage: { testCanvas: { newTestNameDefault: "Nuovo Test"}}},
    en: { createTestPage: { testCanvas: { newTestNameDefault: "New Test"}}},
  };

  const renderPage = () => {
    if (isLoadingTests && currentPage === Page.DASHBOARD) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className={`text-lg ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>
            {t('general.loading')}...
          </div>
        </div>
      );
    }

    switch (currentPage) {
      case Page.DASHBOARD:
        return <DashboardPage 
                  savedTests={savedTests} 
                  onLoadTest={handleLoadTestForEditing}
                  onDeleteTest={handleDeleteTest}
                  setCurrentPage={setCurrentPage} 
                />;
      case Page.CREATE_TEST:
        return <CreateTestPage {...createTestPageProps} />;
      case Page.RECORD_TEST:
        return <RecordTestPage {...recordTestPageProps} />;
      case Page.SETTINGS:
        return <SettingsPage isProxyEnabled={isProxyEnabled} setIsProxyEnabled={setIsProxyEnabled} />;
      default:
        return <DashboardPage 
                  savedTests={savedTests} 
                  onLoadTest={handleLoadTestForEditing}
                  onDeleteTest={handleDeleteTest}
                  setCurrentPage={setCurrentPage}
                />;
    }
  };

  // If auth is loading, show loading screen
  if (authLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'light' ? 'bg-gray-100' : 'bg-slate-900'}`}>
        <div className={`text-lg ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>
          {t('general.loading')}...
        </div>
      </div>
    );
  }

  // If user is not authenticated, show login page
  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className={`flex h-screen ${theme === 'light' ? 'bg-gray-100' : 'bg-slate-900'}`}>
      <NavigationMenu currentPage={currentPage} setCurrentPage={setCurrentPage} />
      <div className="flex-grow overflow-auto">
        {renderPage()}
      </div>
    </div>
  );
};

export default App;