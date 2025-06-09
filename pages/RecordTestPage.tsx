import React, { useState, useCallback, useRef, useEffect } from 'react';
import { TestStep, ActionType, ActionDefinition } from '../types';
import { getElementCssSelector, getElementUserFriendlyName } from './CreateTestPage';
import { useTheme } from '../ThemeContext';
import { useLocalization } from '../LocalizationContext';
import { AVAILABLE_ACTIONS, getActionDefinition } from '../constants';
import { apiService } from '../services/apiService';

const IFRAME_RECORD_ID = "record-preview-iframe";

export interface RecordTestPageProps {
  isProxyEnabled: boolean;
}

export const RecordTestPage: React.FC<RecordTestPageProps> = ({ isProxyEnabled }) => {
  const { theme } = useTheme();
  const { t, locale } = useLocalization();
  const [url, setUrl] = useState<string>('https://www.google.com');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pageScreenshot, setPageScreenshot] = useState<string | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedSteps, setRecordedSteps] = useState<TestStep[]>([]);
  const [executionLog, setExecutionLog] = useState<string[]>([t('recordTestPage.logs.welcomeMessage')]);
  const [isRunningTest, setIsRunningTest] = useState<boolean>(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const log = useCallback((messageKey: string, params?: Record<string, string | number | undefined>, type: 'info' | 'error' | 'warning' | 'success' = 'info') => {
    let fullMessage = t(messageKey, params);
    if (type === 'error') {
        fullMessage = `${t('general.error').toUpperCase()}: ${fullMessage}`;
    } else if (type === 'warning') {
        fullMessage = `${t('general.warning').toUpperCase()}: ${fullMessage}`;
    }
    setExecutionLog(prev => [fullMessage, ...prev].slice(0, 200));
  }, [setExecutionLog, t]);

  const handleLoadPage = useCallback(async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      log("recordTestPage.alerts.noUrl", undefined, "error");
      alert(t("recordTestPage.alerts.noUrl"));
      return;
    }
    setIsLoadingPage(true);
    setRecordedSteps([]); 
    setIsInternalTestPageLoaded(false);
    log('recordTestPage.logs.loadingUrl', { url: trimmedUrl });

    try {
      // Close existing session if any
      if (sessionId) {
        await apiService.closeSession(sessionId);
      }

      // Load page through backend service
      const { sessionId: newSessionId, screenshot, title } = await apiService.loadPage(trimmedUrl);
      setSessionId(newSessionId);
      setPageScreenshot(`data:image/png;base64,${screenshot}`);
      log('recordTestPage.logs.pageLoaded', { url: trimmedUrl });
    } catch (error) {
      log('recordTestPage.logs.errorLoadingPage', { url: trimmedUrl, error: String(error) }, 'error');
      setSessionId(null);
      setPageScreenshot(null);
    } finally {
      setIsLoadingPage(false);
    }
  }, [url, log, t, sessionId]);

  useEffect(() => {
    // Cleanup session on component unmount
    return () => { 
      if (sessionId) {
        apiService.closeSession(sessionId).catch(console.error);
      }
    };
  }, [sessionId]);

  return (
    <div className={`flex flex-col h-full ${theme === 'light' ? 'bg-white' : 'bg-slate-800'}`}>
      <div className="flex-grow flex flex-col overflow-hidden">
        <div className="p-4">
          <h1 className="text-2xl font-bold mb-4">{t('recordTestPage.title')}</h1>
          <div className="flex space-x-4 mb-4">
        <input
          type="text"
          value={url} 
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t('recordTestPage.urlInputPlaceholder')}
              className={`flex-grow p-2 border rounded ${
                theme === 'light'
                  ? 'border-gray-300 bg-white text-gray-700'
                  : 'border-gray-600 bg-slate-700 text-gray-200'
              }`}
        />
        <button 
          onClick={handleLoadPage} 
              disabled={isLoadingPage}
              className={`px-4 py-2 rounded ${
                theme === 'light'
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              } disabled:opacity-50`}
        >
              {isLoadingPage ? t('recordTestPage.loadingButton') : t('recordTestPage.loadButton')}
        </button>
          </div>
            </div>

        <div className="flex-grow flex">
          <div className="w-2/3 p-4">
            <div className="h-full flex flex-col">
              <div className="flex-grow border rounded overflow-hidden">
                {pageScreenshot ? (
                  <img
                    src={pageScreenshot}
                    alt="Page preview"
                    className="w-full h-full object-contain"
            />
          ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                    {t('recordTestPage.noPreviewAvailable')}
            </div>
          )}
              </div>
            </div>
          </div>
          
          <div className="w-1/3 p-4">
            <div className="h-full flex flex-col">
              <div className="flex-grow border rounded p-4 overflow-y-auto">
                <h2 className="text-lg font-semibold mb-2">{t('recordTestPage.executionLog')}</h2>
                {executionLog.map((log, index) => (
                  <div
                    key={index}
                    className={`mb-2 p-2 rounded ${
                      theme === 'light' ? 'bg-gray-100' : 'bg-slate-700'
                    }`}
                  >
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};