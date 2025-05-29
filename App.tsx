import React, { useState, useEffect, useCallback } from 'react';
import { Page, SavedTest, TestStep, DetectedElement } from './types';
import { NavigationMenu } from './components/NavigationMenu';
import { DashboardPage } from './pages/DashboardPage';
import { CreateTestPage, CreateTestPageProps } from './pages/CreateTestPage';
import { RecordTestPage, RecordTestPageProps } from './pages/RecordTestPage'; // Import RecordTestPageProps
import { SettingsPage } from './pages/SettingsPage';
import { loadAllTestsFromLocalStorage, deleteTestFromLocalStorage } from './services/testStorageService';
import { useTheme } from './ThemeContext';
import { useLocalization } from './LocalizationContext'; // Import useLocalization

const App: React.FC = () => {
  const { theme } = useTheme();
  const { t, locale } = useLocalization(); // Get t and locale
  const [currentPage, setCurrentPage] = useState<Page>(Page.DASHBOARD);
  const [savedTests, setSavedTests] = useState<SavedTest[]>([]);

  const [url, setUrl] = useState<string>('https://www.google.com');
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState<boolean>(false);
  const [isPagePreviewVisible, setIsPagePreviewVisible] = useState<boolean>(false);
  const [detectedElements, setDetectedElements] = useState<DetectedElement[]>([]);
  const [isDetectingElements, setIsDetectingElements] = useState<boolean>(false);
  const [testSteps, setTestSteps] = useState<TestStep[]>([]);
  const [currentTestName, setCurrentTestName] = useState<string>(t('createTestPage.testCanvas.newTestNameDefault')); // Default new test name
  const [currentTestId, setCurrentTestId] = useState<string | null>(null);
  const [isRunningTest, setIsRunningTest] = useState<boolean>(false);
  const [executionLog, setExecutionLog] = useState<string[]>([]);
  const [isProxyEnabled, setIsProxyEnabled] = useState<boolean>(() => {
    const storedProxySetting = localStorage.getItem('appProxyEnabled');
    return storedProxySetting ? JSON.parse(storedProxySetting) : true; // Default to true
  });

  useEffect(() => {
    setSavedTests(loadAllTestsFromLocalStorage());
  }, []);
  
  useEffect(() => {
    document.body.className = ''; 
    if (theme === 'light') {
      document.body.classList.add('bg-gray-100', 'text-slate-800');
    } else {
      document.body.classList.add('bg-slate-900', 'text-gray-200');
    }
  }, [theme]);

  // Update currentTestName if it's the default and locale changes
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
    // iframeSrc will be set by CreateTestPage based on its logic and isProxyEnabled
    setIframeSrc(null); // Let CreateTestPage handle constructing the correct iframeSrc
    setIsPagePreviewVisible(false); // Let CreateTestPage handle this
    setTestSteps(testToLoad.steps);
    setCurrentTestName(testToLoad.name);
    setCurrentTestId(testToLoad.id);
    setDetectedElements([]); 
    setExecutionLog([t('createTestPage.logs.testLoaded', { 
        name: testToLoad.name, 
        url: testToLoad.url || t('createTestPage.loadModal.notAvailableUrl') 
    })]);
    // setCurrentPage(Page.CREATE_TEST); // Navigation is handled by caller
  }, [t, isProxyEnabled]); // Added isProxyEnabled dependency, though it's mainly used inside the page

  const handleDeleteTest = useCallback((testId: string) => {
    // Use a translated confirmation message
    if (window.confirm(t('createTestPage.logs.confirmDeleteTest'))) {
      deleteTestFromLocalStorage(testId);
      const updatedSavedTests = loadAllTestsFromLocalStorage();
      setSavedTests(updatedSavedTests);
      
      if (currentTestId === testId) {
        setUrl('https://www.google.com'); 
        setIframeSrc(null);
        setIsPagePreviewVisible(false);
        setTestSteps([]);
        setCurrentTestName(t('createTestPage.testCanvas.newTestNameDefault'));
        setCurrentTestId(null);
        setDetectedElements([]);
        setExecutionLog([t('createTestPage.logs.currentTestDeletedResetState')]);
      }
    }
  }, [currentTestId, t]); // Added t to dependencies


  const createTestPageProps: CreateTestPageProps = {
    url, setUrl, iframeSrc, setIframeSrc, isLoadingPage, setIsLoadingPage,
    isPagePreviewVisible, setIsPagePreviewVisible, detectedElements, setDetectedElements,
    isDetectingElements, setIsDetectingElements, testSteps, setTestSteps,
    currentTestName, setCurrentTestName, currentTestId, setCurrentTestId,
    isRunningTest, setIsRunningTest, executionLog, setExecutionLog,
    savedTests, setSavedTests, 
    onDeleteTestInPage: handleDeleteTest,
    isProxyEnabled, // Pass down the proxy setting
  };

  const recordTestPageProps: RecordTestPageProps = { // Define props for RecordTestPage
    isProxyEnabled,
  };


  // Temporary: to access translations for setCurrentTestName effect
  // This is a bit of a workaround because the t function from useLocalization changes with locale
  // and we need the old locale's default string to compare.
  const translations = {
    it: { createTestPage: { testCanvas: { newTestNameDefault: "Nuovo Test"}}},
    en: { createTestPage: { testCanvas: { newTestNameDefault: "New Test"}}},
  }


  const renderPage = () => {
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

  return (
    <div className={`flex h-screen ${theme === 'light' ? 'bg-gray-100' : 'bg-slate-900'}`}>
      <NavigationMenu currentPage={currentPage} setCurrentPage={setCurrentPage} />
      <div className="flex-grow overflow-auto"> {/* Main content area */}
        {renderPage()}
      </div>
    </div>
  );
};

export default App;