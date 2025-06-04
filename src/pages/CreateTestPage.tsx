import React, { useEffect } from 'react';
import { loadPage, cleanupPageUrl } from '../services/apiService';

export interface CreateTestPageProps {
  url: string;
  setUrl: (url: string) => void;
  iframeSrc: string | null;
  setIframeSrc: (src: string | null) => void;
  isLoadingPage: boolean;
  setIsLoadingPage: (loading: boolean) => void;
  isPagePreviewVisible: boolean;
  setIsPagePreviewVisible: (visible: boolean) => void;
  executionLog: string[];
  setExecutionLog: (log: string[]) => void;
}

export const CreateTestPage: React.FC<CreateTestPageProps> = ({
  url,
  setUrl,
  iframeSrc,
  setIframeSrc,
  isLoadingPage,
  setIsLoadingPage,
  isPagePreviewVisible,
  setIsPagePreviewVisible,
  executionLog,
  setExecutionLog,
}) => {
  useEffect(() => {
    return () => {
      if (iframeSrc?.startsWith('blob:')) {
        console.log('[DEBUG CreateTestPage] Cleaning up blob URL:', iframeSrc);
        cleanupPageUrl(iframeSrc);
      }
    };
  }, [iframeSrc]);

  const handleLoadPage = async () => {
    setIsLoadingPage(true);
    setIframeSrc(null); // Pulisce il vecchio src prima di caricarne uno nuovo
    setIsPagePreviewVisible(false);
    console.log(`[DEBUG CreateTestPage] handleLoadPage called with URL: ${url}`);
    try {
      const { pageUrl, screenshot, content } = await loadPage(url);
      console.log('[DEBUG CreateTestPage] Page loaded from backend. Blob URL received:', pageUrl);
      
      if (!pageUrl || !pageUrl.startsWith('blob:')) {
        console.error('[DEBUG CreateTestPage] Invalid pageUrl received from backend:', pageUrl);
        setExecutionLog([...executionLog, `Error: Backend did not return a valid Blob URL.`]);
        setIframeSrc(null);
        setIsPagePreviewVisible(false);
        return;
      }

      setIframeSrc(pageUrl);
      console.log('[DEBUG CreateTestPage] iframeSrc set to Blob URL:', pageUrl);
      setIsPagePreviewVisible(true);
      setExecutionLog([...executionLog, `Page loaded successfully via backend: ${url}`]);
    } catch (error) {
      console.error('[DEBUG CreateTestPage] Error in handleLoadPage:', error);
      setExecutionLog([...executionLog, `Error loading page: ${error instanceof Error ? error.message : 'Unknown error'}`]);
      setIframeSrc(null);
      setIsPagePreviewVisible(false);
    } finally {
      setIsLoadingPage(false);
      console.log('[DEBUG CreateTestPage] handleLoadPage finished. isLoadingPage:', isLoadingPage);
    }
  };

  const handleIframeLoad = () => {
    setIsLoadingPage(false);
    console.debug('[DEBUG CreateTestPage] iframe content loaded successfully. iframeSrc:', iframeSrc);
  };

  const handleIframeError = (event: React.SyntheticEvent<HTMLIFrameElement>) => {
    setIsLoadingPage(false);
    console.error('[DEBUG CreateTestPage] iframe load error. Current iframeSrc:', iframeSrc, 'Event:', event);
    setExecutionLog([...executionLog, `Error rendering preview from Blob URL: ${iframeSrc}`]);
  };

  return (
    <div className="p-4">
      <div className="flex gap-4 mb-4">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter URL to test"
          className="flex-grow p-2 border rounded"
        />
        <button
          onClick={handleLoadPage}
          disabled={isLoadingPage}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
        >
          {isLoadingPage ? 'Loading...' : 'Load Page'}
        </button>
      </div>
      
      {isPagePreviewVisible && iframeSrc && iframeSrc.startsWith('blob:') && (
        <div className="mt-4">
          <iframe
            key={iframeSrc}
            src={iframeSrc}
            className="w-full h-[600px] border rounded"
            title="Page Preview"
            sandbox="allow-scripts allow-forms allow-popups"
            referrerPolicy="no-referrer"
            loading="lazy"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
          />
          <div className="mt-2 text-sm text-gray-600">
            <p>Preview Mode: Limited Interaction (Sandbox Mode)</p>
            <p>Some functionality may be restricted for security reasons.</p>
          </div>
        </div>
      )}
      
      {isPagePreviewVisible && iframeSrc && !iframeSrc.startsWith('blob:') && (
        <div className="mt-4 p-4 border border-red-500 bg-red-100 text-red-700 rounded">
          <p>Error: Attempting to load a non-Blob URL in iframe: {iframeSrc}</p>
          <p>This indicates an issue with the page loading logic. Please check the console.</p>
        </div>
      )}

      <div className="mt-4">
        <h3 className="text-lg font-semibold mb-2">Execution Log</h3>
        <div className="bg-gray-100 p-4 rounded max-h-[200px] overflow-y-auto">
          {executionLog.map((log, index) => (
            <div key={index} className="mb-1">
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}; 