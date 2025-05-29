import React, { useState, useCallback, useRef, useEffect } from 'react';
import { TestStep, ActionType, ActionDefinition } from '../types';
import { getElementCssSelector, getElementUserFriendlyName, INTERNAL_TEST_PAGE_HTML } from './CreateTestPage'; // Import INTERNAL_TEST_PAGE_HTML
import { useTheme } from '../ThemeContext';
import { useLocalization } from '../LocalizationContext';
import { AVAILABLE_ACTIONS, getActionDefinition } from '../constants';

const IFRAME_RECORD_ID = "record-preview-iframe";
const PROXY_PREFIX = '/__app_proxy__/'; 

export interface RecordTestPageProps {
  isProxyEnabled: boolean;
}

export const RecordTestPage: React.FC<RecordTestPageProps> = ({ isProxyEnabled }) => {
  const { theme } = useTheme();
  const { t, locale } = useLocalization();
  const [url, setUrl] = useState<string>('https://www.google.com'); // Original user-entered URL
  const [iframeSrc, setIframeSrc] = useState<string | null>(null); // Actual src for iframe (proxied or data URI)
  const [isLoadingPage, setIsLoadingPage] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedSteps, setRecordedSteps] = useState<TestStep[]>([]);
  const [executionLog, setExecutionLog] = useState<string[]>([t('recordTestPage.logs.welcomeMessage')]);
  const [isRunningTest, setIsRunningTest] = useState<boolean>(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isInternalTestPageLoaded, setIsInternalTestPageLoaded] = useState<boolean>(false);
  const [showInteractionWarningBanner, setShowInteractionWarningBanner] = useState<boolean>(false);
  const [interactionWarningType, setInteractionWarningType] = useState<'proxy_failed' | 'file_url' | 'no_proxy' | null>(null);


  const log = useCallback((messageKey: string, params?: Record<string, string | number | undefined>, type: 'info' | 'error' | 'warning' | 'success' = 'info') => {
    let fullMessage = t(messageKey, params);
    if (type === 'error') {
        fullMessage = `${t('general.error').toUpperCase()}: ${fullMessage}`;
    } else if (type === 'warning') {
        fullMessage = `${t('general.warning').toUpperCase()}: ${fullMessage}`;
    }
    setExecutionLog(prev => [fullMessage, ...prev].slice(0, 200));
  }, [setExecutionLog, t]);

  const handleLoadPage = useCallback(() => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      log("recordTestPage.alerts.noUrl", undefined, "error");
      alert(t("recordTestPage.alerts.noUrl"));
      return;
    }
    setIsLoadingPage(true);
    setRecordedSteps([]); 
    setIsInternalTestPageLoaded(false);
    setShowInteractionWarningBanner(false);
    setInteractionWarningType(null);
    log('recordTestPage.logs.loadingUrl', { url: trimmedUrl });

    let srcToLoad: string;
    if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
      if (isProxyEnabled) {
        srcToLoad = `${PROXY_PREFIX}${encodeURIComponent(trimmedUrl)}`;
        log('recordTestPage.logs.usingProxyForUrl', { url: trimmedUrl });
      } else {
        srcToLoad = trimmedUrl;
        log('recordTestPage.logs.loadingDirectlyNoProxy', { url: trimmedUrl }, 'warning');
        setInteractionWarningType('no_proxy');
        setShowInteractionWarningBanner(true);
      }
    } else if (trimmedUrl.startsWith('file:///')) {
      srcToLoad = trimmedUrl;
      log('recordTestPage.logs.loadingFileUrl', { url: trimmedUrl });
      setInteractionWarningType('file_url'); 
      setShowInteractionWarningBanner(true);
    } else {
      setIsLoadingPage(false);
      setIframeSrc(null);
      log('recordTestPage.alerts.invalidUrlFormat', { url: trimmedUrl }, "error");
      alert(t('recordTestPage.alerts.invalidUrlFormat', { url: trimmedUrl }));
      return;
    }
    
    setTimeout(() => {
        setIframeSrc(srcToLoad);
    }, 100);

  }, [url, log, t, isProxyEnabled]);

  const handleLoadInternalTestPage = useCallback(() => {
    setIsLoadingPage(true);
    setRecordedSteps([]);
    setShowInteractionWarningBanner(false);
    setInteractionWarningType(null);
    log('recordTestPage.logs.loadingInternalTestPage');

    setTimeout(() => {
        const internalPageDataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(INTERNAL_TEST_PAGE_HTML)}`;
        setUrl("internal://test-page"); 
        setIframeSrc(internalPageDataUrl);
        setIsLoadingPage(false); 
        setIsInternalTestPageLoaded(true);
        log('recordTestPage.logs.internalTestPageLoadedSuccess');
    }, 100); 
  }, [setUrl, setIframeSrc, setIsLoadingPage, log]);


  const handleIframeLoad = () => {
    setIsLoadingPage(false);
    const currentIframe = iframeRef.current;
    const originalUrl = url; 
    const isProxiedHttp = iframeSrc?.startsWith(PROXY_PREFIX) && isProxyEnabled;
    const isDirectHttp = iframeSrc?.startsWith('http') && !isProxyEnabled;

    if (isInternalTestPageLoaded) {
        log('recordTestPage.logs.internalTestPageLoadedSuccess');
        setShowInteractionWarningBanner(false);
        setInteractionWarningType(null);
    } else if (currentIframe) {
        const isContentAccessible = currentIframe.contentDocument !== null;
        log('recordTestPage.logs.pageLoaded', { url: originalUrl });

        if (isContentAccessible) {
            setShowInteractionWarningBanner(false);
            setInteractionWarningType(null);
            if(isProxiedHttp) log('recordTestPage.logs.proxySuccessInteractionEnabled', {url: originalUrl});
            else if (isDirectHttp) log('recordTestPage.logs.noProxyLoadedSopWarning', {url: originalUrl}, 'warning');
        } else {
            // Content not accessible
            setShowInteractionWarningBanner(true);
            if (isProxiedHttp) { // Proxy was used but failed
                log("recordTestPage.logs.proxyFailedContentInaccessible", {url: originalUrl}, "error");
                setInteractionWarningType('proxy_failed');
            } else if (isDirectHttp) { // No proxy was used, and it's inaccessible (expected for cross-origin)
                log("recordTestPage.logs.noProxyLoadedSopWarning", {url: originalUrl}, "error"); // Log as error since interaction is key
                setInteractionWarningType('no_proxy');
            } else if (iframeSrc?.startsWith('file:///')) {
                log("recordTestPage.logs.fileUrlLoadedSopWarning", {url: originalUrl}, "warning");
                setInteractionWarningType('file_url');
            } else {
                log("recordTestPage.logs.iframeLoadWarningCrossOrigin", {url: originalUrl}, "warning");
                setInteractionWarningType('proxy_failed'); // Default to this if other conditions don't match
            }
        }
    }
  };
  
  const recordClickHandler = useCallback((event: MouseEvent) => {
    if (!isRecording || !iframeRef.current?.contentDocument) return;
    const target = event.target as HTMLElement;
    if (!target) return;

    const elementName = getElementUserFriendlyName(target, target.tagName);

    if (target.tagName === 'A' && (target as HTMLAnchorElement).href) {
        const href = (target as HTMLAnchorElement).href;
        const currentIframeLogicalOrigin = iframeRef.current?.contentWindow?.location.origin;
        
        // For proxied pages, the href might be relative to the proxied site or absolute
        let absoluteHref = href;
        if (iframeSrc?.startsWith(PROXY_PREFIX) && !href.startsWith('http') && !href.startsWith('file')) {
            try {
                const decodedBaseUrl = decodeURIComponent(iframeSrc.substring(PROXY_PREFIX.length));
                absoluteHref = new URL(href, decodedBaseUrl).toString();
            } catch (e) {
                console.warn("Could not resolve relative link on proxied page:", e);
            }
        } else if (iframeSrc && !href.startsWith('http') && !href.startsWith('file')) { // Direct load, non-proxied
             try {
                absoluteHref = new URL(href, iframeSrc).toString();
            } catch (e) {
                console.warn("Could not resolve relative link on non-proxied page:", e);
            }
        }

        const linkLogicalOrigin = new URL(absoluteHref, currentIframeLogicalOrigin || undefined).origin;

        if (isInternalTestPageLoaded || (currentIframeLogicalOrigin && linkLogicalOrigin === currentIframeLogicalOrigin && href.startsWith('#'))) {
             // For internal page, or same-page anchor on external, let it navigate within iframe for now.
        } else {
            event.preventDefault(); 
            const actionDef = AVAILABLE_ACTIONS.find(a => a.type === ActionType.GOTO_URL);
            if (!actionDef) {
                log('recordTestPage.logs.errorActionDefinitionNotFound', {actionType: ActionType.GOTO_URL}, 'error'); return;
            }
            const newStep: TestStep = {
                id: `step_${Date.now()}`, actionId: actionDef.id, 
                inputValue: absoluteHref, 
                targetElementName: elementName,
                comment: t('recordTestPage.logs.recordedClickComment', { elementName, selector: 'A' })
            };
            setRecordedSteps(prev => [...prev, newStep]);
            log('recordTestPage.logs.recordedClickOnLink', { elementName, url: newStep.inputValue });
            return; 
        }
    }
    
    const selector = getElementCssSelector(target);
    const clickActionDef = AVAILABLE_ACTIONS.find(a => a.type === ActionType.CLICK);
    if (!clickActionDef) {
        log('recordTestPage.logs.errorActionDefinitionNotFound', {actionType: ActionType.CLICK}, 'error'); return;
    }
    const newStep: TestStep = {
      id: `step_${Date.now()}`, actionId: clickActionDef.id, 
      targetElementId: selector, targetElementName: elementName,
      comment: t('recordTestPage.logs.recordedClickComment', { elementName, selector })
    };
    setRecordedSteps(prev => [...prev, newStep]);
    log('recordTestPage.logs.recordedClick', { elementName, selector });
  }, [isRecording, log, t, isInternalTestPageLoaded, iframeSrc]);

  const recordInputHandler = useCallback((event: Event) => {
    if (!isRecording || !iframeRef.current?.contentDocument) return;
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    if (!target || (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA')) return;

    const selector = getElementCssSelector(target);
    const elementName = getElementUserFriendlyName(target, target.tagName);
    const value = target.value;
    const inputActionDef = AVAILABLE_ACTIONS.find(a => a.type === ActionType.INPUT_TEXT);
    if (!inputActionDef) {
        log('recordTestPage.logs.errorActionDefinitionNotFound', {actionType: ActionType.INPUT_TEXT}, 'error'); return;
    }

    setRecordedSteps(prev => {
      const lastStep = prev[prev.length -1];
      if (lastStep && lastStep.actionId === inputActionDef.id && lastStep.targetElementId === selector) {
        return prev.map(s => s.id === lastStep.id ? {...s, inputValue: value, comment: t('recordTestPage.logs.recordedInputComment', {elementName, selector})} : s);
      } else {
        const newStep: TestStep = {
          id: `step_${Date.now()}`, actionId: inputActionDef.id,
          targetElementId: selector, targetElementName: elementName,
          inputValue: value, comment: t('recordTestPage.logs.recordedInputComment', {elementName, selector})
        };
        return [...prev, newStep];
      }
    });
    log('recordTestPage.logs.recordedInput', { elementName, selector, value });
  }, [isRecording, log, t]);


  const handleStartRecording = useCallback(() => {
    if (!iframeSrc || isLoadingPage) {
      alert(t("recordTestPage.alerts.loadPageBeforeRecording")); return;
    }
    
    if (iframeRef.current && iframeRef.current.contentDocument === null && !isInternalTestPageLoaded) {
      const alertKey = (iframeSrc.startsWith('http') && !isProxyEnabled) 
        ? "recordTestPage.alerts.recordingUnavailableNoProxy"
        : "recordTestPage.alerts.recordingUnavailableContentInaccessible";
      log(alertKey, {url: url}, "error");
      alert(t(alertKey, {url: url}));
      setShowInteractionWarningBanner(true);
      setInteractionWarningType(
        (iframeSrc.startsWith('http') && !isProxyEnabled) ? 'no_proxy' :
        iframeSrc.startsWith(PROXY_PREFIX) ? 'proxy_failed' : 
        iframeSrc.startsWith('file:///') ? 'file_url' : 'proxy_failed'
      );
      return;
    }

    setIsRecording(true); setRecordedSteps([]); 
    log("recordTestPage.logs.recordingStarted");
    try {
      const iDoc = iframeRef.current!.contentDocument!;
      iDoc.addEventListener('click', recordClickHandler, true); 
      iDoc.addEventListener('input', recordInputHandler, true); 
      log("recordTestPage.logs.clickAndInputListenersAdded");
    } catch (error) {
        setIsRecording(false);
        log('recordTestPage.logs.errorAddingListeners', { error: (error instanceof Error ? error.message : String(error)) }, 'error');
        alert(t('recordTestPage.logs.errorAddingListenersAlert', { error: (error instanceof Error ? error.message : String(error)) }));
    }
  }, [iframeSrc, isLoadingPage, log, t, recordClickHandler, recordInputHandler, url, setShowInteractionWarningBanner, setInteractionWarningType, isProxyEnabled, isInternalTestPageLoaded]);

  const handleStopRecording = useCallback(() => {
    setIsRecording(false);
    log("recordTestPage.logs.recordingStopped");
    if (iframeRef.current?.contentDocument) {
      try {
        iframeRef.current.contentDocument.removeEventListener('click', recordClickHandler, true);
        iframeRef.current.contentDocument.removeEventListener('input', recordInputHandler, true);
        log("recordTestPage.logs.listenersRemoved");
      } catch (error) {
        log('recordTestPage.logs.warningRemovingListeners', { error: (error instanceof Error ? error.message : String(error)) }, 'warning');
      }
    }
  }, [log, recordClickHandler, recordInputHandler]);

  const handleRunTest = useCallback(async () => {
    if (recordedSteps.length === 0) {
      alert(t("recordTestPage.alerts.noActionsToRun")); return;
    }
    setIsRunningTest(true);
    log("recordTestPage.logs.runningRecordedTest");

    for (const [index, step] of recordedSteps.entries()) {
      const actionDef = getActionDefinition(step.actionId);
      const actionTypeDisplay = actionDef ? t(actionDef.nameKey) : step.actionId;
      log('recordTestPage.logs.executingStep', { current: index + 1, total: recordedSteps.length, actionType: actionTypeDisplay, target: (step.targetElementName || step.targetElementId || t('general.page')) });
      await new Promise(resolve => setTimeout(resolve, 500)); 

      if (!iframeRef.current?.contentDocument && actionDef?.type !== ActionType.GOTO_URL) {
          log('recordTestPage.logs.errorAccessingIframeForAction', {actionType: actionTypeDisplay }, 'error'); break;
      }
      
      try {
        if (!actionDef) {
            log('recordTestPage.logs.errorActionDefinitionNotFound', {actionType: step.actionId}, 'error');
            continue;
        }
        switch (actionDef.type) {
          case ActionType.GOTO_URL:
            const targetNavUrl = step.inputValue || '';
            if (targetNavUrl) {
              let newNavIframeSrc: string;
              if (targetNavUrl.startsWith('http://') || targetNavUrl.startsWith('https://')) {
                if (isProxyEnabled) {
                    newNavIframeSrc = `${PROXY_PREFIX}${encodeURIComponent(targetNavUrl)}`;
                } else {
                    newNavIframeSrc = targetNavUrl;
                    setInteractionWarningType('no_proxy');
                    setShowInteractionWarningBanner(true);
                }
                setIsInternalTestPageLoaded(false);
              } else if (targetNavUrl.startsWith('file:///')) {
                newNavIframeSrc = targetNavUrl;
                setIsInternalTestPageLoaded(false);
                setShowInteractionWarningBanner(true);
                setInteractionWarningType('file_url');
              } else if (targetNavUrl === "internal://test-page") {
                newNavIframeSrc = `data:text/html;charset=utf-8,${encodeURIComponent(INTERNAL_TEST_PAGE_HTML)}`;
                setIsInternalTestPageLoaded(true);
                setShowInteractionWarningBanner(false);
                setInteractionWarningType(null);
              } else {
                log("recordTestPage.logs.errorGotoUrlNotSpecified", undefined, "error"); 
                continue;
              }
              setUrl(targetNavUrl); 
              setIframeSrc(newNavIframeSrc); 
              log('recordTestPage.logs.navigatingToUrl', {url: targetNavUrl});
              await new Promise(resolve => setTimeout(resolve, 2000)); 
            } else {
              log("recordTestPage.logs.errorGotoUrlNotSpecified", undefined, "error");
            }
            break;
          case ActionType.CLICK:
            if (step.targetElementId) {
              const target = iframeRef.current!.contentDocument!.querySelector(step.targetElementId) as HTMLElement | null;
              if (target) {
                target.click();
                log('recordTestPage.logs.clickOnElementSuccess', {target: (step.targetElementName || step.targetElementId)});
              } else {
                log('recordTestPage.logs.errorElementNotFoundForClick', {target: (step.targetElementName || step.targetElementId)}, 'error');
              }
            }
            break;
          case ActionType.INPUT_TEXT:
            if (step.targetElementId) {
              const target = iframeRef.current!.contentDocument!.querySelector(step.targetElementId) as HTMLInputElement | HTMLTextAreaElement | null;
              if (target) {
                target.value = step.inputValue || '';
                target.dispatchEvent(new Event('input', { bubbles: true }));
                target.dispatchEvent(new Event('change', { bubbles: true }));
                log('recordTestPage.logs.inputTextSuccess', {value: step.inputValue, target: (step.targetElementName || step.targetElementId) });
              } else {
                log('recordTestPage.logs.errorElementNotFoundForInput', {target: (step.targetElementName || step.targetElementId) }, 'error');
              }
            }
            break;
          default:
            log('recordTestPage.logs.unsupportedActionInPlayback', {actionType: actionTypeDisplay}, 'warning');
        }
      } catch (error) {
          log('recordTestPage.logs.errorDuringActionExecution', {actionType: actionTypeDisplay, target: (step.targetElementName || step.targetElementId || t('general.page')), error: (error instanceof Error ? error.message : String(error))}, 'error');
      }
    }
    setIsRunningTest(false);
    log("recordTestPage.logs.testExecutionCompleted");
  }, [recordedSteps, log, t, setIframeSrc, setUrl, isProxyEnabled]);
  
  useEffect(() => {
    return () => { 
      if (iframeRef.current?.contentDocument && isRecording) { 
        try {
            iframeRef.current.contentDocument.removeEventListener('click', recordClickHandler, true);
            iframeRef.current.contentDocument.removeEventListener('input', recordInputHandler, true);
        } catch (e) { /* ignore */ }
      }
    };
  }, [isRecording, recordClickHandler, recordInputHandler]);


  const headerBg = theme === 'light' ? 'bg-slate-100 border-b border-slate-300' : 'bg-slate-800';
  const inputClasses = theme === 'light' 
    ? 'bg-white text-slate-700 border-slate-300 focus:ring-2 focus:ring-sky-500 placeholder-slate-400' 
    : 'bg-slate-700 text-gray-200 border-slate-600 focus:ring-2 focus:ring-sky-500 placeholder-gray-400';
  const panelBg = theme === 'light' ? 'bg-white border border-slate-200' : 'bg-slate-800';
  const textSkyColor = theme === 'light' ? 'text-sky-600' : 'text-sky-400';
  const textSubtleColor = theme === 'light' ? 'text-slate-500' : 'text-gray-400';
  const stepItemBg = theme === 'light' ? 'bg-slate-50 border border-slate-200' : 'bg-slate-700';
  const footerBg = theme === 'light' ? 'bg-slate-100 border-t border-slate-300' : 'bg-slate-850 border-t-2 border-slate-700';

  let warningBannerMessageKey = '';
  if (showInteractionWarningBanner) {
      if (interactionWarningType === 'proxy_failed') {
          warningBannerMessageKey = 'recordTestPage.previewPanel.warningProxyFailed';
      } else if (interactionWarningType === 'file_url') {
          warningBannerMessageKey = 'recordTestPage.previewPanel.warningFileUrl';
      } else if (interactionWarningType === 'no_proxy') {
          warningBannerMessageKey = 'recordTestPage.previewPanel.warningNoProxy';
      }
  }

  return (
    <div className={`flex flex-col h-full ${theme === 'light' ? 'bg-gray-100 text-slate-800' : 'bg-slate-900 text-gray-200'}`}>
      <header className={`p-3 shadow-md flex items-center space-x-2 sticky top-0 z-30 ${headerBg}`}>
        <input
          type="text"
          value={url} 
          onChange={e => setUrl(e.target.value)}
          placeholder={t('recordTestPage.header.urlPlaceholder')}
          className={`flex-grow p-2 rounded border outline-none ${inputClasses}`}
          disabled={isRecording || isLoadingPage || isRunningTest}
        />
        <button 
          onClick={handleLoadPage} 
          disabled={isRecording || isLoadingPage || isRunningTest}
          className={`px-4 py-2 rounded disabled:opacity-50 transition-colors text-white
                      ${theme === 'light' ? 'bg-sky-500 hover:bg-sky-600' : 'bg-sky-600 hover:bg-sky-500'}`}
        >
          {isLoadingPage && !isInternalTestPageLoaded ? t('general.loading') : t('recordTestPage.header.loadPageButton')}
        </button>
        <button 
          onClick={handleLoadInternalTestPage} 
          disabled={isRecording || isLoadingPage || isRunningTest}
          className={`px-4 py-2 rounded disabled:opacity-50 transition-colors text-sm text-white
                      ${theme === 'light' ? 'bg-lime-500 hover:bg-lime-600' : 'bg-lime-600 hover:bg-lime-500'}`}
        >
          {isLoadingPage && isInternalTestPageLoaded ? t('general.loading') : t('recordTestPage.header.loadInternalTestPageButton')}
        </button>
      </header>

      <main className="flex-grow flex overflow-hidden p-4 space-x-4">
        <section className={`flex-grow-[3] flex flex-col rounded shadow-md ${panelBg}`}>
          <div className={`p-2 border-b ${theme === 'light' ? 'border-slate-200' : 'border-slate-700'}`}>
            <h2 className={`text-lg font-semibold ${textSkyColor}`}>{t('recordTestPage.previewPanel.title')}</h2>
             <p className={`text-xs ${textSubtleColor}`}>
                {isInternalTestPageLoaded 
                    ? t('recordTestPage.previewPanel.currentUrl', { url: t('general.internalTestPageName')}) 
                    : t('recordTestPage.previewPanel.currentUrl', { url: url || t('recordTestPage.previewPanel.noUrl')}) 
                }
                {isInternalTestPageLoaded && ` (${t('createTestPage.webPreviewPanel.internalPageQualifier')})`}
                {(iframeSrc?.startsWith(PROXY_PREFIX) && isProxyEnabled) && !isInternalTestPageLoaded && ` (${t('createTestPage.webPreviewPanel.proxiedPageQualifier')})`}
                {(iframeSrc?.startsWith('http') && !isProxyEnabled) && !isInternalTestPageLoaded && ` (${t('createTestPage.webPreviewPanel.externalPageNoProxyWarningShort')})`}
            </p>
          </div>
          {showInteractionWarningBanner && warningBannerMessageKey && (
            <div className={`p-2 text-xs border-b ${
                theme === 'light' 
                    ? 'bg-yellow-100 text-yellow-700 border-yellow-300' 
                    : 'bg-yellow-800 bg-opacity-30 text-yellow-300 border-yellow-700'
                }`}
                role="alert"
            >
                <p><span className="font-semibold">{t('general.warning')}:</span> {t(warningBannerMessageKey, {url: url})}</p>
            </div>
          )}
          {iframeSrc ? (
            <iframe
              id={IFRAME_RECORD_ID}
              ref={iframeRef}
              key={iframeSrc} 
              src={iframeSrc} 
              title={t('recordTestPage.previewPanel.title')}
              className="w-full h-full border-0 flex-grow"
              onLoad={handleIframeLoad}
              onError={() => { setIsLoadingPage(false); log('recordTestPage.logs.errorLoadingIframe', {url: url}, "error");}} 
              sandbox="allow-scripts allow-forms allow-popups allow-same-origin" 
            />
          ) : (
            <div className={`w-full h-full flex-grow flex items-center justify-center 
                             ${theme === 'light' ? 'bg-slate-100 text-slate-500' : 'bg-slate-700 text-gray-500'}`}>
              {isLoadingPage ? t('recordTestPage.previewPanel.loadingPreview') : t('recordTestPage.previewPanel.loadPagePrompt')}
            </div>
          )}
        </section>

        <section className={`flex-grow-[2] flex flex-col space-y-4 p-4 rounded shadow-md overflow-hidden ${panelBg}`}>
          <div>
            <h2 className={`text-lg font-semibold mb-3 ${textSkyColor}`}>{t('recordTestPage.controlsPanel.title')}</h2>
            <div className="flex space-x-2">
              <button 
                onClick={handleStartRecording} 
                disabled={!iframeSrc || isRecording || isLoadingPage || isRunningTest || (iframeRef.current && iframeRef.current.contentDocument === null && !isInternalTestPageLoaded && !showInteractionWarningBanner /* Allow recording if internal or proxy presumed working */)}
                className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50 transition-colors w-1/2"
              >
                {t('recordTestPage.controlsPanel.startRecordingButton')}
              </button>
              <button 
                onClick={handleStopRecording} 
                disabled={!isRecording || isLoadingPage || isRunningTest}
                className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded disabled:opacity-50 transition-colors w-1/2"
              >
                {t('recordTestPage.controlsPanel.stopRecordingButton')}
              </button>
            </div>
            <button
                onClick={handleRunTest}
                disabled={isRecording || isLoadingPage || isRunningTest || recordedSteps.length === 0}
                className={`mt-3 w-full text-white px-4 py-2 rounded disabled:opacity-50 transition-colors
                            ${theme === 'light' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-blue-600 hover:bg-blue-500'}`}
            >
                {t('recordTestPage.controlsPanel.runRecordedTestButton', { count: recordedSteps.length })}
            </button>
          </div>
          
          <div className="flex-grow flex flex-col overflow-hidden">
            <h3 className={`text-md font-semibold mb-2 ${textSkyColor}`}>{t('recordTestPage.recordedActionsPanel.title')}</h3>
            {recordedSteps.length === 0 && (
                <p className={`text-sm text-center py-4 ${textSubtleColor}`}>{t('recordTestPage.recordedActionsPanel.noActionsRecorded')}</p>
            )}
            <div className="flex-grow overflow-y-auto space-y-2 pr-1">
              {recordedSteps.map((step, index) => {
                const actionDef = AVAILABLE_ACTIONS.find(a => a.id === step.actionId);
                const actionTypeDisplay = actionDef ? t(actionDef.nameKey) : step.actionId;
                return (
                  <div key={step.id} className={`p-2.5 rounded text-xs ${stepItemBg}`}>
                    <p className={`font-semibold ${theme === 'light' ? 'text-sky-700' : 'text-sky-300'}`}>
                      {t('recordTestPage.recordedActionsPanel.actionLabel', {index: index + 1, actionType: actionTypeDisplay})}
                      {step.targetElementName && <span className={`${theme === 'light' ? 'text-teal-700' : 'text-teal-400'}`}> {t('recordTestPage.recordedActionsPanel.onElement', {elementName: step.targetElementName})}</span>}
                    </p>
                    {step.targetElementId && <p className={`${textSubtleColor} italic truncate`}>{t('recordTestPage.recordedActionsPanel.selectorLabel', {selector: step.targetElementId})}</p>}
                    {step.inputValue && <p className={`${theme === 'light' ? 'text-slate-600' : 'text-gray-300'}`}>{t('recordTestPage.recordedActionsPanel.valueLabel', {value: step.inputValue})}</p>}
                    {step.comment && <p className={`text-xs mt-1 ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}><i>{t('recordTestPage.recordedActionsPanel.commentLabel')}{step.comment}</i></p>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
      
      <footer className={`h-40 p-3 overflow-y-auto text-xs ${footerBg}`}>
         <h3 className={`text-sm font-semibold mb-1 ${textSkyColor}`}>{t('recordTestPage.logPanel.title')}</h3>
        {executionLog.map((entry, index) => (
          <p key={index} className={`mb-0.5 
            ${entry.toUpperCase().startsWith(t('general.error').toUpperCase()) ? (theme === 'light' ? 'text-red-600' : 'text-red-400')
            : entry.toUpperCase().startsWith(t('general.warning').toUpperCase()) ? (theme === 'light' ? 'text-yellow-600' : 'text-yellow-400')
            : entry.startsWith(t('recordTestPage.logs.recordedClick', {elementName: '', selector: ''}).substring(0,10)) || entry.startsWith(t('recordTestPage.logs.recordedInputComment', {elementName: '', selector: ''}).substring(0,10)) || entry.startsWith(t('recordTestPage.logs.recordedClickOnLink', {elementName:'', url:''}).substring(0,10)) ? (theme === 'light' ? 'text-green-700' : 'text-green-300')
            : (theme === 'light' ? 'text-slate-600' : 'text-gray-400')}`}>
            {entry}
          </p>
        ))}
      </footer>
    </div>
  );
};