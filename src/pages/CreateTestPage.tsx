import { HighlightOverlay } from '@/components/HighlightOverlay';
import { Modal } from '@/components/Modal';
import { AVAILABLE_ACTIONS, getActionDefinition } from '@/constants';
import { useLocalization } from '@/LocalizationContext';
import { apiService } from '@/services/apiService';
import { generateStepsFromNaturalLanguage } from '@/services/geminiService';
import { loadAllTestsFromLocalStorage, saveTestToLocalStorage, updateTestInLocalStorage } from '@/services/testStorageService';
import { useTheme } from '@/ThemeContext';
import { ActionType, DetectedElement, DragItem, GeminiGeneratedStep, ItemTypes, SavedTest, TestStep } from '@/types';
import React, { useState, useEffect, useCallback, DragEvent, Dispatch, SetStateAction } from 'react';


// Helper Functions
// getActionDefinition is now imported from constants.tsx
const PROXY_PREFIX = '/api/proxy?url=';

const getElementDefinition = (elementId: string, elements: DetectedElement[]): DetectedElement | undefined => {
  return elements.find(e => e.id === elementId);
};

const iframeHighlightingScript = `
(function() {
    let lastHighlightedElement = null;
    let originalOutline = '';

    window.addEventListener('message', function(event) {
        const data = event.data;

        if (data && data.type === 'HIGHLIGHT_ELEMENT' && data.selector) {
            if (lastHighlightedElement) {
                try {
                    lastHighlightedElement.style.outline = originalOutline;
                } catch(e) {
                    console.warn('Highlighter: Error removing previous outline - ', e);
                }
            }

            try {
                const elementToHighlight = document.querySelector(data.selector);
                if (elementToHighlight) {
                    lastHighlightedElement = elementToHighlight;
                    originalOutline = elementToHighlight.style.outline || '';
                    elementToHighlight.style.outline = '2px solid red';
                    // elementToHighlight.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                } else {
                    console.warn('Highlighter: Element not found for selector:', data.selector);
                    lastHighlightedElement = null;
                    originalOutline = '';
                }
            } catch(e) {
                console.error('Highlighter: Error querying or applying highlight for selector "' + data.selector + '" - ', e);
                lastHighlightedElement = null;
                originalOutline = '';
            }
        } else if (data && data.type === 'REMOVE_HIGHLIGHT') {
            if (lastHighlightedElement) {
                try {
                    lastHighlightedElement.style.outline = originalOutline;
                } catch(e) {
                    console.warn('Highlighter: Error removing outline - ', e);
                } finally {
                    lastHighlightedElement = null;
                    originalOutline = '';
                }
            }
        }
    });
})();
`;

// --- Sub-Components ---
interface HeaderProps {
  url: string;
  setUrl: (url: string) => void;
  isLoadingPage: boolean;
  isRunningTest: boolean;
  handleLoadUrl: () => void;
  isPagePreviewVisible: boolean;
  isDetectingElements: boolean;
  handleDetectElements: () => void;
  testStepsCount: number;
  handleRunTest: () => void;
  onSaveTest: () => void;
  currentTestId: string | null;
  onShowLoadModal: () => void;
}

const Header = React.memo<HeaderProps>(({
  url, setUrl, isLoadingPage, isRunningTest, handleLoadUrl,
  isPagePreviewVisible, isDetectingElements, handleDetectElements,
  testStepsCount, handleRunTest, onSaveTest, currentTestId, onShowLoadModal
}) => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  return (
    <header className={`p-3 shadow-md flex items-center space-x-2 sticky top-0 z-30 ${theme === 'light' ? 'bg-slate-100 border-b border-slate-300' : 'bg-slate-800'}`}>
      <input
        type="text"
        value={url}
        onChange={e => setUrl(e.target.value)}
        placeholder={t('createTestPage.header.urlPlaceholder')}
        className={`flex-grow p-2 rounded border outline-none
                    ${theme === 'light'
                      ? 'bg-white text-slate-700 border-slate-300 focus:ring-2 focus:ring-sky-500 placeholder-slate-400'
                      : 'bg-slate-700 text-gray-200 border-slate-600 focus:ring-2 focus:ring-sky-500 placeholder-gray-400'}`}
      />
      <button onClick={handleLoadUrl} disabled={isLoadingPage || isRunningTest}
              className={`px-4 py-2 rounded disabled:opacity-50 transition-colors
                          ${theme === 'light' ? 'bg-sky-500 hover:bg-sky-600 text-white' : 'bg-sky-600 hover:bg-sky-500 text-white'}`}>
        {isLoadingPage ? t('general.loading') : t('createTestPage.header.loadPageButton')}
      </button>
      <button 
        onClick={handleDetectElements} 
        disabled={isLoadingPage || !isPagePreviewVisible || isDetectingElements || isRunningTest}
        className={`px-4 py-2 rounded disabled:opacity-50 transition-colors
                          ${theme === 'light' ? 'bg-teal-500 hover:bg-teal-600 text-white' : 'bg-teal-600 hover:bg-teal-500 text-white'}`}>
        {isDetectingElements ? t('createTestPage.header.detectingElementsButton') : t('createTestPage.header.detectElementsButton')}
      </button>
      <button onClick={handleRunTest} disabled={testStepsCount === 0 || isRunningTest || isLoadingPage || isDetectingElements}
              className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50 transition-colors">
        {isRunningTest ? t('createTestPage.header.runningTestButton') : t('createTestPage.header.runTestButton')}
      </button>
      <button onClick={onSaveTest} disabled={isRunningTest || testStepsCount === 0}
              className={`px-4 py-2 rounded disabled:opacity-50 transition-colors
                          ${theme === 'light' ? 'bg-indigo-500 hover:bg-indigo-600 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}>
        {currentTestId ? t('createTestPage.header.updateTestButton') : t('createTestPage.header.saveTestButton')}
      </button>
      <button onClick={onShowLoadModal}
              className={`px-4 py-2 rounded disabled:opacity-50 transition-colors
                          ${theme === 'light' ? 'bg-purple-500 hover:bg-purple-600 text-white' : 'bg-purple-600 hover:bg-purple-500 text-white'}`}>
        {t('createTestPage.header.loadExistingTestButton')}
      </button>
    </header>
  );
});

interface ActionsPanelProps {
  onDragStartAction: (event: DragEvent<HTMLElement>, actionId: string) => void;
  naturalLanguageInput: string;
  setNaturalLanguageInput: (value: string) => void;
  handleGenerateNLPSteps: () => void;
  isGeneratingNLPSteps: boolean;
}
const ActionsPanel = React.memo<ActionsPanelProps>(({
  onDragStartAction, naturalLanguageInput, setNaturalLanguageInput, handleGenerateNLPSteps, isGeneratingNLPSteps
}) => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  return (
    <aside className={`w-64 p-4 space-y-3 overflow-y-auto h-full shrink-0 ${theme === 'light' ? 'bg-slate-100 border-r border-slate-300' : 'bg-slate-800'}`}>
      <h3 className={`text-lg font-semibold mb-3 ${theme === 'light' ? 'text-sky-700' : 'text-sky-400'}`}>{t('createTestPage.actionsPanel.title')}</h3>
      {AVAILABLE_ACTIONS.map(action => (
        <div
          key={action.id}
          draggable
          onDragStart={(e) => onDragStartAction(e, action.id)}
          className={`p-3 rounded shadow cursor-grab transition-colors flex items-center
                      ${theme === 'light'
                        ? 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-700'
                        : 'bg-slate-700 hover:bg-slate-600 text-gray-200'}`}
        >
          {action.icon}
          <span>{t(action.nameKey)}</span>
        </div>
      ))}
       <div className={`mt-6 pt-4 border-t ${theme === 'light' ? 'border-slate-300' : 'border-slate-700'}`}>
        <h3 className={`text-lg font-semibold mb-2 ${theme === 'light' ? 'text-sky-700' : 'text-sky-400'}`}>{t('createTestPage.actionsPanel.naturalLanguageTitle')}</h3>
        <textarea
            value={naturalLanguageInput}
            onChange={e => setNaturalLanguageInput(e.target.value)}
            placeholder={t('createTestPage.actionsPanel.naturalLanguagePlaceholder')}
            rows={3}
            className={`w-full text-sm p-2 rounded border outline-none
                        ${theme === 'light'
                          ? 'bg-white text-slate-700 border-slate-300 focus:ring-2 focus:ring-sky-500 placeholder-slate-400'
                          : 'bg-slate-700 text-gray-200 border-slate-600 focus:ring-2 focus:ring-sky-500 placeholder-gray-400'}`}
            disabled={isGeneratingNLPSteps}
        />
        <button
            onClick={handleGenerateNLPSteps}
            disabled={isGeneratingNLPSteps || !naturalLanguageInput.trim()}
            className={`w-full mt-2 text-white px-3 py-1.5 rounded disabled:opacity-50 transition-colors text-sm
                        ${theme === 'light' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-amber-600 hover:bg-amber-500'}`}
        >
            {isGeneratingNLPSteps ? t('createTestPage.actionsPanel.generatingStepsButton') : t('createTestPage.actionsPanel.generateStepsButton')}
        </button>
      </div>
    </aside>
  );
});

interface ElementsPanelProps {
  isDetectingElements: boolean;
  detectedElements: DetectedElement[];
  isPagePreviewVisible: boolean;
  onDragStartElement: (event: DragEvent<HTMLElement>, elementId: string) => void;
  elementDetectionError: string | null;
  onElementMouseEnter: (element: DetectedElement) => void; // Changed from (selector: string)
  onElementMouseLeave: () => void;
}
const ElementsPanel = React.memo<ElementsPanelProps>(({
  isDetectingElements, detectedElements, isPagePreviewVisible, onDragStartElement, elementDetectionError, onElementMouseEnter, onElementMouseLeave
}) => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  return (
    <aside className={`w-72 p-4 space-y-2 overflow-y-auto h-full shrink-0 ${theme === 'light' ? 'bg-slate-100 border-l border-slate-300' : 'bg-slate-800'}`}>
      <h3 className={`text-lg font-semibold mb-3 ${theme === 'light' ? 'text-sky-700' : 'text-sky-400'}`}>{t('createTestPage.elementsPanel.title')}</h3>
      {isDetectingElements && <p className={`text-sm ${theme === 'light' ? 'text-slate-500' : 'text-gray-400'}`}>{t('createTestPage.elementsPanel.detectingMessage')}</p>}
      
      {elementDetectionError && (
        <div className={`p-3 rounded-md text-xs mb-2 ${theme === 'light' ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' : 'bg-yellow-800 bg-opacity-30 text-yellow-300 border border-yellow-700'}`}>
          <p className="font-semibold">{t('general.warning')}</p>
          {elementDetectionError}
        </div>
      )}

      {!isDetectingElements && detectedElements.length === 0 && isPagePreviewVisible && !elementDetectionError && (
        <p className={`text-sm ${theme === 'light' ? 'text-slate-500' : 'text-gray-400'}`}>{t('createTestPage.elementsPanel.noElementsDetectedMessage')}</p>
      )}
      {!isPagePreviewVisible && !isDetectingElements && (
         <p className={`text-sm ${theme === 'light' ? 'text-slate-500' : 'text-gray-400'}`}>{t('createTestPage.elementsPanel.loadPagePrompt')}</p>
      )}
      {detectedElements.map(el => (
        <div
          key={el.id}
          draggable
          onDragStart={(e) => onDragStartElement(e, el.id)}
          onMouseEnter={() => onElementMouseEnter(el)} // Pass the whole element object
          onMouseLeave={onElementMouseLeave} // New handler
          className={`p-2.5 rounded shadow cursor-grab transition-colors text-sm
                      ${theme === 'light'
                        ? 'bg-white hover:bg-slate-50 border border-slate-200'
                        : 'bg-slate-700 hover:bg-slate-600'}`}
        >
          <p className={`font-medium ${theme === 'light' ? 'text-slate-700' : 'text-gray-100'}`}>{el.name}</p>
          <p className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-gray-400'}`}>{t('createTestPage.elementsPanel.elementTag', { tagName: el.tagName.toLowerCase(), selector: el.selector })}</p>
        </div>
      ))}
    </aside>
  );
});

interface TestStepCardProps {
  step: TestStep;
  index: number;
  detectedElements: DetectedElement[];
  draggedItem: DragItem | null;
  dropTargetInfo: { stepId: string; type: 'element' | 'reorder' } | null;
  currentExecutingStepId: string | null;
  onDragStartStep: (event: DragEvent<HTMLElement>, stepId: string) => void;
  onDragOverStep: (event: DragEvent<HTMLDivElement>, stepId: string, type: 'element' | 'reorder') => void;
  onDropOnStep: (event: DragEvent<HTMLDivElement>, targetStepId: string) => void;
  updateStepValue: (stepId: string, field: 'inputValue' | 'comment' | 'targetElementId', value: string) => void;
  deleteTestStep: (stepId: string) => void;
}

const TestStepCard = React.memo<TestStepCardProps>(({
  step, index, detectedElements, draggedItem, dropTargetInfo, currentExecutingStepId,
  onDragStartStep, onDragOverStep, onDropOnStep, updateStepValue, deleteTestStep
}) => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const actionDef = getActionDefinition(step.actionId);
  const elementDef = step.targetElementId ? getElementDefinition(step.targetElementId, detectedElements) : undefined;
  const isBeingDragged = draggedItem?.type === ItemTypes.TEST_STEP && draggedItem?.id === step.id;
  const isDropTargetForReorder = dropTargetInfo?.stepId === step.id && dropTargetInfo?.type === 'reorder' && draggedItem?.type === ItemTypes.TEST_STEP;
  const isDropTargetForElement = dropTargetInfo?.stepId === step.id && dropTargetInfo?.type === 'element' && draggedItem?.type === ItemTypes.ELEMENT;

  const cardClasses = theme === 'light'
    ? 'bg-white border border-slate-200 text-slate-700'
    : 'bg-slate-700 text-gray-200';
  const textSkyColor = theme === 'light' ? 'text-sky-600' : 'text-sky-300';
  const textSubtleColor = theme === 'light' ? 'text-slate-500' : 'text-gray-400';
  const inputClasses = theme === 'light'
    ? 'bg-slate-50 text-slate-700 border-slate-300 focus:ring-sky-500 placeholder-slate-400'
    : 'bg-slate-600 text-gray-200 border-slate-500 focus:ring-sky-500 placeholder-gray-400';
  const dropZoneClasses = isDropTargetForElement
    ? (theme === 'light' ? 'border-sky-500 bg-sky-50' : 'border-sky-500 bg-sky-900')
    : (theme === 'light' ? 'border-slate-300 hover:border-slate-400' : 'border-slate-600 hover:border-slate-500');


  return (
    <div
      draggable
      onDragStart={(e) => onDragStartStep(e, step.id)}
      onDragOver={(e) => onDragOverStep(e, step.id, 'reorder')}
      onDrop={(e) => onDropOnStep(e, step.id)}
      className={`p-3 rounded shadow-md mb-3 transition-all transform-gpu ${cardClasses}
                  ${isBeingDragged ? 'opacity-50 scale-95 shadow-xl' : 'opacity-100 scale-100'}
                  ${currentExecutingStepId === step.id ? 'ring-2 ring-green-500' : ''}
                  ${isDropTargetForReorder ? 'ring-2 ring-blue-500' : ''}
                `}
    >
      <div className="flex justify-between items-center mb-2">
        <div className={`flex items-center text-sm font-semibold ${textSkyColor}`}>
          <span className={`mr-2 text-xs px-1.5 py-0.5 rounded ${theme === 'light' ? 'bg-slate-200 text-slate-600' : 'bg-slate-600 text-gray-400'}`}>{index + 1}</span>
          {actionDef?.icon}
          {actionDef ? t(actionDef.nameKey) : t('createTestPage.testStepCard.unknownAction')}
        </div>
        <button onClick={() => deleteTestStep(step.id)} className={`${theme === 'light' ? 'text-red-500 hover:text-red-600' : 'text-red-400 hover:text-red-300'} text-xs`} title={t('createTestPage.testStepCard.deleteStepTooltip')}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12.56 0c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09.997-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </button>
      </div>

      {actionDef?.requiresElement && (
        <div
          onDragOver={(e) => onDragOverStep(e, step.id, 'element')}
          onDrop={(e) => onDropOnStep(e, step.id)}
          className={`mb-2 p-2 border-2 border-dashed rounded ${dropZoneClasses} transition-colors`}
        >
          {elementDef ? (
            <div className="text-xs">
              <span className={`font-medium ${theme === 'light' ? 'text-slate-600' : 'text-gray-300'}`}>{t('createTestPage.testStepCard.elementLabel')} </span>
              <span className={`${theme === 'light' ? 'text-teal-600' : 'text-teal-400'}`}>{elementDef.name}</span>
              <button onClick={() => updateStepValue(step.id, 'targetElementId', '')}
                      className={`ml-2 text-xs ${theme === 'light' ? 'text-red-500 hover:text-red-600' : 'text-red-400 hover:text-red-300'}`} title={t('createTestPage.testStepCard.removeElementTooltip')}>{t('createTestPage.testStepCard.removeElementTooltip')}</button>
            </div>
          ) : (
            <span className={`text-xs ${textSubtleColor}`}>{t('createTestPage.testStepCard.dropElementPrompt')}</span>
          )}
        </div>
      )}

      {actionDef?.requiresValue && (
        <input
          type={actionDef.type === ActionType.WAIT ? "number" : "text"}
          placeholder={actionDef.valuePlaceholder && actionDef.valuePlaceholder.includes('.') ? t(actionDef.valuePlaceholder) : (actionDef.valuePlaceholder || t('createTestPage.testStepCard.valuePlaceholderGeneric'))}
          value={step.inputValue}
          onChange={e => updateStepValue(step.id, 'inputValue', e.target.value)}
          className={`w-full p-1.5 rounded border text-xs focus:ring-1 outline-none mb-2 ${inputClasses}`}
        />
      )}

      <textarea
        placeholder={t('createTestPage.testStepCard.commentPlaceholder')}
        value={step.comment}
        onChange={e => updateStepValue(step.id, 'comment', e.target.value)}
        rows={1}
        className={`w-full p-1.5 rounded border text-xs focus:ring-1 outline-none resize-none ${inputClasses}`}
      />
    </div>
  );
});

interface TestCanvasProps {
  currentTestName: string;
  setCurrentTestName: (name: string) => void;
  testSteps: TestStep[];
  draggedItem: DragItem | null;
  dropTargetInfo: { stepId: string; type: 'element' | 'reorder' } | null;
  onDragOverCanvas: (event: DragEvent<HTMLDivElement>) => void;
  onDropOnCanvas: (event: DragEvent<HTMLDivElement>) => void;
  detectedElements: DetectedElement[];
  currentExecutingStepId: string | null;
  onDragStartStep: (event: DragEvent<HTMLElement>, stepId: string) => void;
  onDragOverStep: (event: DragEvent<HTMLDivElement>, stepId: string, type: 'element' | 'reorder') => void;
  onDropOnStep: (event: DragEvent<HTMLDivElement>, targetStepId: string) => void;
  updateStepValue: (stepId: string, field: 'inputValue' | 'comment' | 'targetElementId', value: string) => void;
  deleteTestStep: (stepId: string) => void;
}

const TestCanvas = React.memo<TestCanvasProps>(({
  currentTestName, setCurrentTestName, testSteps, draggedItem, dropTargetInfo,
  onDragOverCanvas, onDropOnCanvas, ...testStepCardProps
}) => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  return (
    <section
        className={`p-4 h-full overflow-y-auto relative
                    ${theme === 'light' ? 'bg-slate-200' : 'bg-slate-850'}`}
        onDragOver={onDragOverCanvas}
        onDrop={onDropOnCanvas}
    >
      <div className="flex justify-between items-center mb-3">
        <input
          type="text"
          value={currentTestName}
          onChange={(e) => setCurrentTestName(e.target.value)}
          placeholder={t('createTestPage.testCanvas.testNamePlaceholder')}
          className={`text-xl font-semibold bg-transparent border-b-2 outline-none py-1
                      ${theme === 'light'
                        ? 'text-sky-700 border-slate-400 focus:border-sky-600 placeholder-slate-500'
                        : 'text-sky-400 border-slate-700 focus:border-sky-500 placeholder-gray-500'}`}
        />
      </div>
      {testSteps.length === 0 && (
        <div className={`flex items-center justify-center h-4/5 border-2 border-dashed rounded-md p-10
                         ${theme === 'light' ? 'text-slate-500 border-slate-400' : 'text-gray-500 border-slate-700'}`}>
          {t('createTestPage.testCanvas.dropActionsPrompt')}
        </div>
      )}
      {testSteps.map((step, index) => (
          <TestStepCard
              key={step.id}
              step={step}
              index={index}
              draggedItem={draggedItem}
              dropTargetInfo={dropTargetInfo}
              {...testStepCardProps}
          />
      ))}
      {draggedItem && dropTargetInfo === null && (draggedItem.type === ItemTypes.ACTION || draggedItem.type === ItemTypes.TEST_STEP) && (
        <div className="drag-placeholder">{t('createTestPage.testCanvas.dropHereToEnd')}</div>
      )}
    </section>
  );
});

const IFRAME_PREVIEW_ID = "web-preview-iframe";

interface WebPreviewPanelProps {
  iframeSrc: string | null;
  actualLoadedUrl: string;
  isPagePreviewVisible: boolean;
  executionLog: string[];
  isRunningTest: boolean;
  isProxyEnabled: boolean;
  onClearLog: () => void;
}

const WebPreviewPanel = React.memo<WebPreviewPanelProps>(({ 
  iframeSrc, actualLoadedUrl, isPagePreviewVisible, executionLog, isRunningTest, isProxyEnabled, onClearLog
}) => {
  const { theme } = useTheme();
  const { t } = useLocalization();

  const displayUrl = actualLoadedUrl || t('general.none');
  
  let pageTypeQualifier = '';
  if (iframeSrc) {
    if (iframeSrc.startsWith('data:')) {
      // This case should ideally not happen now that internal page is gone.
      // Consider if this 'screenshotQualifier' is still relevant or if data: URLs are only for screenshots.
      // For now, keep it, but it might need further review based on how screenshots are handled.
      pageTypeQualifier = t('createTestPage.webPreviewPanel.screenshotQualifier');
    } else if (iframeSrc.startsWith('file')) {
      pageTypeQualifier = t('createTestPage.webPreviewPanel.externalPageWarningShort');
    }
  }

  return (
    <div className={`flex flex-col h-full ${theme === 'light' ? 'bg-white' : 'bg-slate-800'}`}>
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold mb-2">{t('createTestPage.webPreviewPanel.title')}</h2>
        <p className="text-sm text-gray-500">
          {displayUrl}
          {pageTypeQualifier && ` (${pageTypeQualifier})`}
        </p>
      </div>

      {isPagePreviewVisible && iframeSrc ? (
        actualLoadedUrl.includes('/gstd/gstd-report') ? ( // Assuming /gstd/gstd-report is a valid case that should still render an iframe
          <iframe
            id={IFRAME_PREVIEW_ID}
            key={iframeSrc}
            src={iframeSrc}
            title={t('createTestPage.webPreviewPanel.title')}
            className="w-full h-4/5 border-0 flex-grow"
            sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
          />
        ) : (
          <img
            src={iframeSrc}
            alt="Page preview"
            className="w-full h-4/5 object-contain flex-grow"
          />
        )
      ) : (
        <div className={`w-full h-4/5 flex-grow flex items-center justify-center p-4 ${theme === 'light' ? 'bg-slate-100 text-slate-500' : 'bg-slate-700 text-gray-500'}`}>
          {isPagePreviewVisible ? t('createTestPage.webPreviewPanel.loadingPreview') : t('createTestPage.webPreviewPanel.loadPagePrompt')}
        </div>
      )}

      <div className="h-1/5 p-4 border-t overflow-y-auto">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold">{t('createTestPage.webPreviewPanel.executionLog')}</h3>
          <button
            onClick={onClearLog}
            className={`text-sm px-2 py-1 rounded ${
              theme === 'light'
                ? 'text-gray-600 hover:bg-gray-100'
                : 'text-gray-400 hover:bg-slate-700'
            }`}
          >
            {t('createTestPage.webPreviewPanel.clearLog')}
          </button>
        </div>
        {executionLog.map((log, index) => (
          <div
            key={index}
            className={`text-sm mb-1 ${
              log.includes('ERROR')
                ? 'text-red-500'
                : log.includes('WARNING')
                ? 'text-yellow-500'
                : theme === 'light'
                ? 'text-gray-600'
                : 'text-gray-400'
            }`}
          >
            {log}
          </div>
        ))}
      </div>
    </div>
  );
});

export interface CreateTestPageProps {
  url: string;
  setUrl: Dispatch<SetStateAction<string>>;
  iframeSrc: string | null;
  setIframeSrc: Dispatch<SetStateAction<string | null>>;
  isLoadingPage: boolean;
  setIsLoadingPage: Dispatch<SetStateAction<boolean>>;
  isPagePreviewVisible: boolean;
  setIsPagePreviewVisible: Dispatch<SetStateAction<boolean>>;
  detectedElements: DetectedElement[];
  setDetectedElements: Dispatch<SetStateAction<DetectedElement[]>>;
  isDetectingElements: boolean;
  setIsDetectingElements: Dispatch<SetStateAction<boolean>>;
  testSteps: TestStep[];
  setTestSteps: Dispatch<SetStateAction<TestStep[]>>;
  currentTestName: string;
  setCurrentTestName: Dispatch<SetStateAction<string>>;
  currentTestId: string | null;
  setCurrentTestId: Dispatch<SetStateAction<string | null>>;
  isRunningTest: boolean;
  setIsRunningTest: Dispatch<SetStateAction<boolean>>;
  executionLog: string[];
  setExecutionLog: Dispatch<SetStateAction<string[]>>;
  savedTests: SavedTest[];
  setSavedTests: Dispatch<SetStateAction<SavedTest[]>>;
  onDeleteTestInPage: (testId: string) => void;
  isProxyEnabled: boolean;
}

export const getElementCssSelector = (element: HTMLElement): string => {
  let parent: Element | null = element;
  let selector = '';
  while (parent && parent !== document.body) {
    const child = parent as Element;
    parent = parent.parentElement;
    if (!parent) break;
    
    const siblings = Array.from(parent.children);
    if (siblings.length === 1) {
      selector = `${parent.tagName.toLowerCase()} > ${child.tagName.toLowerCase()}${selector ? ' > ' + selector : ''}`;
      continue;
    }
    
    const index = siblings.indexOf(child) + 1;
    selector = `${parent.tagName.toLowerCase()} > ${child.tagName.toLowerCase()}:nth-child(${index})${selector ? ' > ' + selector : ''}`;
  }
  return selector;
};

export const getElementUserFriendlyName = (element: HTMLElement, tagName: string): string => {
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;
  const placeholder = element.getAttribute('placeholder');
  if (placeholder) return placeholder;
  const dataTestId = element.getAttribute('data-testid');
  if (dataTestId) return dataTestId;
  if ((element as HTMLInputElement).value && ['BUTTON', 'SUBMIT', 'RESET'].includes((element as HTMLInputElement).type?.toUpperCase())) {
    return (element as HTMLInputElement).value.substring(0, 50);
  }
  let textContent = element.textContent?.trim().replace(/\s+/g, ' '); 
  if (textContent && textContent.length > 0 && textContent.length < 100) {
    if (['A', 'BUTTON', 'LABEL', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'SPAN', 'DIV'].includes(tagName) ||
        element.getAttribute('role') === 'button' ||
        element.getAttribute('role') === 'link' ||
        element.getAttribute('role') === 'heading') {
        const childElementCount = element.children.length;
        if (childElementCount < 3 || tagName !== 'DIV') { 
             return textContent.substring(0,50);
        }
    }
  }
  const nameAttr = element.getAttribute('name');
  if (nameAttr) return nameAttr;
  const idAttr = element.id;
  if (idAttr) return idAttr;
  const typeAttr = element.getAttribute('type');
  if (typeAttr && tagName === 'INPUT') return `${tagName} (${typeAttr})`;
  return tagName;
};
    
export const CreateTestPage: React.FC<CreateTestPageProps> = ({
  url, setUrl, iframeSrc, setIframeSrc, isLoadingPage, setIsLoadingPage, isPagePreviewVisible, setIsPagePreviewVisible,
  detectedElements, setDetectedElements, isDetectingElements, setIsDetectingElements,
  testSteps, setTestSteps, currentTestName, setCurrentTestName, currentTestId, setCurrentTestId,
  isRunningTest, setIsRunningTest, executionLog, setExecutionLog,
  savedTests, setSavedTests, onDeleteTestInPage, isProxyEnabled
}) => {
  const { theme } = useTheme();
  const { t, locale } = useLocalization();
  const [currentExecutingStepId, setCurrentExecutingStepId] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [showLoadModal, setShowLoadModal] = useState<boolean>(false);
  const [saveTestNameInput, setSaveTestNameInput] = useState<string>('');
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
  const [dropTargetInfo, setDropTargetInfo] = useState<{ stepId: string; type: 'element' | 'reorder' } | null>(null);
  const [naturalLanguageInput, setNaturalLanguageInput] = useState<string>('');
  const [isGeneratingNLPSteps, setIsGeneratingNLPSteps] = useState<boolean>(false);
  const [elementDetectionError, setElementDetectionError] = useState<string | null>(null);
  const [highlightedElementSelector, setHighlightedElementSelector] = useState<string | null>(null);
  const [highlightOverlayRect, setHighlightOverlayRect] = useState<{ top: number; left: number; width: number; height: number; } | null>(null);
  const [playwrightSessionId, setPlaywrightSessionId] = useState<string | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState<boolean>(false);


  const log = useCallback((messageKey: string, params?: Record<string, string | number | undefined>, type: 'info' | 'error' | 'warning' | 'success' = 'info') => {
    let fullMessage = t(messageKey, params);
    if (type === 'error') {
        fullMessage = `${t('general.error').toUpperCase()}: ${fullMessage}`;
    } else if (type === 'warning') {
        fullMessage = `${t('general.warning').toUpperCase()}: ${fullMessage}`;
    }
    setExecutionLog(prev => [fullMessage, ...prev].slice(0, 200));
  }, [setExecutionLog, t]);


  const handleLoadUrl = useCallback(async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      alert(t('createTestPage.alerts.noUrl'));
      return;
    }

    setIsLoadingPage(true); // Keep this for general page loading UI
    setIsSessionLoading(true);
    setIsPagePreviewVisible(false);
    setElementDetectionError(null);
    log('createTestPage.logs.loadingUrl', { url: trimmedUrl });

    // Close existing session first
    if (playwrightSessionId) {
      try {
        log('createTestPage.logs.closingPreviousSession', { sessionId: playwrightSessionId });
        await apiService.closePlaywrightSession(playwrightSessionId);
        setPlaywrightSessionId(null);
        log('createTestPage.logs.previousSessionClosed', { sessionId: playwrightSessionId });
      } catch (error) {
        console.error('Error closing previous Playwright session:', error);
        log('createTestPage.logs.errorClosingSession', { error: String(error) }, 'error');
        // Decide if we should proceed or stop; for now, we'll try to open a new one.
      }
    }
    setDetectedElements([]); // Clear detected elements from old session/page

    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://') && !trimmedUrl.startsWith('file:///')) {
      setIsLoadingPage(false);
      setIsSessionLoading(false);
      setIframeSrc(null);
      setIsPagePreviewVisible(false);
      log('createTestPage.logs.errorInvalidUrl', { url: trimmedUrl }, 'error');
      alert(t('createTestPage.alerts.invalidUrlFormat', { url: trimmedUrl }));
      setPlaywrightSessionId(null); // Ensure no session ID if URL is invalid
      return;
    }
    
    try {
      log('createTestPage.logs.startingPlaywrightSession', { url: trimmedUrl });
      // The backend's createSession navigates to the URL.
      const sessionDetails = await apiService.startPlaywrightSession(trimmedUrl);
      setPlaywrightSessionId(sessionDetails.sessionId);
      
      // Use the returned title (maybe update page title display)
      // For iframeSrc, decide: use a screenshot, a proxied URL, or the direct URL.
      // For now, continue using direct URL for iframe src, assuming Playwright handles it.
      // The screenshot (sessionDetails.screenshot) could be used as a placeholder or preview.
      setIframeSrc(trimmedUrl); // Or some representation from sessionDetails if needed
      
      setIsPagePreviewVisible(true);
      log('createTestPage.logs.playwrightSessionStarted', { sessionId: sessionDetails.sessionId, url: trimmedUrl });
      
      // Optionally, auto-detect elements after session starts
      // await handleDetectElements(); // Be careful with calling this here, ensure it uses the new session ID

    } catch (error) {
      console.error('Error starting Playwright session:', error);
      log('createTestPage.logs.errorStartingSession', { url: trimmedUrl, error: String(error) }, 'error');
      alert(t('createTestPage.alerts.sessionStartFailed', { error: String(error) }));
      setIframeSrc(null);
      setIsPagePreviewVisible(false);
      setPlaywrightSessionId(null);
    } finally {
      setIsLoadingPage(false);
      setIsSessionLoading(false);
    }
  }, [url, playwrightSessionId, log, t, setUrl, setIframeSrc, setIsPagePreviewVisible, setDetectedElements, setElementDetectionError, setIsLoadingPage]);

  const handleIframeLoadOrError = useCallback(() => {
    setIsLoadingPage(false);
    console.log(`[DEBUG] iframe load/error event. isLoadingPage set to false. iframeSrc: ${iframeSrc}`);
    if (iframeSrc && !iframeSrc.startsWith('data:')) { // Simplified condition
      const displayedUrl = (iframeSrc.startsWith(PROXY_PREFIX) && isProxyEnabled) 
        ? decodeURIComponent(iframeSrc.substring(PROXY_PREFIX.length)) 
        : iframeSrc;
      log('createTestPage.logs.externalPageAttemptLoad', { url: displayedUrl });
    }
  }, [iframeSrc, log, setIsLoadingPage, isProxyEnabled]);

  const handleDetectElements = useCallback(async () => {
    // console.log(`[DEBUG] handleDetectElements called. isPagePreviewVisible: ${isPagePreviewVisible}, iframeSrc: ${iframeSrc}, isLoadingPage: ${isLoadingPage}`);
    
    if (isLoadingPage) {
      log('createTestPage.logs.waitingForPageLoadBeforeDetect', undefined, 'warning');
      alert(t('createTestPage.alerts.pageStillLoading'));
      return;
    }
    if (!isPagePreviewVisible || !iframeSrc) {
      const messageKey = 'createTestPage.alerts.loadPageFirstForDetect';
      alert(t(messageKey));
      log(messageKey, undefined, 'warning');
      return;
    }
    if (!playwrightSessionId) {
      alert(t('createTestPage.alerts.noActiveSessionForDetect'));
      log('createTestPage.logs.noSessionForDetect', undefined, 'warning');
      return;
    }
    
    setIsDetectingElements(true);
    const sourceName = iframeSrc || url; // Or derive from session if possible
    log('createTestPage.logs.detectingElementsFrom', { source: sourceName });
    // console.log(`[DEBUG] Starting element detection from: ${sourceName} with session ID: ${playwrightSessionId}`);
    setDetectedElements([]);
    setElementDetectionError(null);

    try {
      // Always use Playwright backend service when a session ID is available
      log('createTestPage.logs.detectingElementsWithPlaywrightSession', { sessionId: playwrightSessionId }, 'info');
      // console.log(`[DEBUG] Detecting elements using Playwright session ID: ${playwrightSessionId}`);
      
      const backendElements = await apiService.detectElementsByPlaywright(playwrightSessionId); // ElementInfo[]

      const newDetectedElements: DetectedElement[] = backendElements.map((el: any, index: number) => {
        const tagName = el.tag?.toUpperCase() || 'UNKNOWN';
        let name = el.text?.trim().substring(0, 70);
        if (!name) name = el.attributes?.name || el.attributes?.id || el.attributes?.['aria-label'];
        if (!name) name = `${tagName} (${el.selector?.substring(0, 40)}...)`;
        if (!name) name = `${tagName} #${index}`;
        const feId = `el_pw_${el.selector?.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0,40)}_${index}`;
        
        return {
          id: feId,
          name: name,
          tagName: tagName,
          selector: el.selector || '',
          attributes: el.attributes || {},
          text: el.text?.trim() || undefined,
          boundingBox: el.boundingBox,
        };
      });

      setDetectedElements(newDetectedElements);
      if (newDetectedElements.length > 0) {
        log('createTestPage.logs.detectedElementsCount', { count: newDetectedElements.length, sourceDetails: sourceName });
        // console.log(`[DEBUG] Detected ${newDetectedElements.length} elements via Playwright session ${playwrightSessionId}.`);
      } else {
        log('createTestPage.logs.noInteractiveElementsFound', { sourceDetails: sourceName }, 'warning');
        // console.warn(`[DEBUG] No interactive elements found via Playwright session ${playwrightSessionId}.`);
      }
      
    } catch (error) {
      console.error("[DEBUG] Error during element detection (Playwright backend):", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      log('createTestPage.logs.errorDuringElementDetection', { source: sourceName, error: errorMessage }, 'error');
      setElementDetectionError(t('createTestPage.elementsPanel.detectionFailedSpecific', { error: errorMessage }));
      setDetectedElements([]);
    } finally {
      setIsDetectingElements(false);
      // console.log("[DEBUG] Element detection process finished.");
    }
  }, [isPagePreviewVisible, iframeSrc, playwrightSessionId, setIsDetectingElements, log, t, setDetectedElements, setElementDetectionError, isLoadingPage, url]);

  const handleRunTest = useCallback(async () => {
    if (!playwrightSessionId) { // Check for active session
      log('createTestPage.logs.cannotRunTestNoSession', undefined, 'error');
      alert(t('createTestPage.alerts.noActiveSessionForRun'));
      setIsRunningTest(false); // Ensure this is reset if called
      return;
    }

    if (testSteps.length === 0) {
      alert(t('createTestPage.alerts.noStepsToRun'));
      return;
    }
    setIsRunningTest(true);
    log("createTestPage.logs.testExecutionStarting", undefined, 'info');
    let testHasFailed = false;

    for (const [index, step] of testSteps.entries()) {
      setCurrentExecutingStepId(step.id);
      await new Promise(resolve => setTimeout(resolve, 300)); // Small delay for UI update

      const actionDef = getActionDefinition(step.actionId);
      const elementDef = step.targetElementId ? getElementDefinition(step.targetElementId, detectedElements) : undefined;
      const actionNameDisplay = actionDef ? t(actionDef.nameKey) : 'Unknown Action';

      log(`createTestPage.logs.executingStep`, { current: index + 1, total: testSteps.length, actionName: actionNameDisplay }, 'info');

      if (!actionDef) {
        log(`Step ${index + 1}: Action definition not found. Skipping.`, undefined, 'error');
        testHasFailed = true;
        continue;
      }

      if (actionDef.requiresElement && !elementDef && step.targetElementId) {
        log(`Step ${index + 1} (${actionNameDisplay}): Element (ID: ${step.targetElementId}) not found in detected elements. Skipping.`, undefined, 'error');
        testHasFailed = true;
        continue;
      }
       if (actionDef.requiresElement && !step.targetElementId && actionDef.type !== ActionType.TAKE_SCREENSHOT) { // Screenshot might be full page
        log(`Step ${index + 1} (${actionNameDisplay}): No target element specified for this action. Skipping.`, undefined, 'error');
        testHasFailed = true;
        continue;
      }

      const iframeElement = document.getElementById(IFRAME_PREVIEW_ID) as HTMLIFrameElement | null;
      // const currentIframeSrcForLog = iframeElement?.src || iframeSrc || "N/A"; // Less relevant with Playwright
      
      // Construct actionDetails for Playwright
      let actionDetails: any = {
          action: actionDef.id, // Use actionDef.id (e.g. 'click', 'type') which should match backend
          selector: elementDef?.selector,
          value: step.inputValue // Used for type, select, verify_text, goto_url, wait
      };
      
      // Special handling for GOTO_URL as it doesn't need a selector and value is the URL
      if (actionDef.type === ActionType.GOTO_URL) {
          actionDetails.action = 'goto_url'; // Ensure backend action name alignment
          actionDetails.selector = undefined; // No selector for goto_url
          actionDetails.value = step.inputValue || '';
          // The GOTO_URL logic is now primarily handled by the backend via executePlaywrightAction.
          // Frontend updates (iframeSrc, url, detectedElements) should happen based on response.
      } else if (actionDef.type === ActionType.WAIT) {
          actionDetails.action = 'wait';
          actionDetails.selector = undefined;
          actionDetails.value = step.inputValue || '1000'; // Default wait if not specified
      }


      try {
        console.log(`[DEBUG] Executing Playwright action via API: ${actionDetails.action} with selector: ${actionDetails.selector}, value: ${actionDetails.value} for session ${playwrightSessionId}`);
        const response = await apiService.executePlaywrightAction(playwrightSessionId, actionDetails);

        if (response.success) {
          let message = `Step ${index + 1} (${actionNameDisplay}): ${response.message || 'Completed successfully.'}`;
          if (actionDef.type === ActionType.VERIFY_TEXT) {
            message = `Step ${index + 1} (${actionNameDisplay}): ${response.message} (Expected: "${response.expected}", Actual: "${response.actual}")`;
          } else if (actionDef.type === ActionType.GOTO_URL && response.navigatedUrl) {
             setUrl(response.navigatedUrl); // Update frontend URL state
             setIframeSrc(response.navigatedUrl); // Update iframe src
             setDetectedElements([]); // Clear elements from old page
             log('Navigated to new URL. Elements cleared. Please re-detect if needed.', undefined, 'info');
          }
          // TODO: Handle screenshot data if action was TAKE_SCREENSHOT and response contains it
          log(message, undefined, 'success');
        } else {
          const errorMessage = `Step ${index + 1} (${actionNameDisplay}): Failed. ${response.message || 'No specific error message.'}` +
                             (actionDef.type === ActionType.VERIFY_TEXT ? ` (Expected: "${response.expected}", Actual: "${response.actual}")` : '');
          log(errorMessage, undefined, 'error');
          testHasFailed = true;
        }
      } catch (error: any) {
        log(`Step ${index + 1} (${actionNameDisplay}): API Error. ${error.message || 'Unknown error'}`, undefined, 'error');
        testHasFailed = true;
      }

      if (testHasFailed) {
        log("createTestPage.logs.executionInterruptedCriticalError", undefined, 'error');
        break; // Break from the for loop
      }
    } // End of for loop

    log(testHasFailed ? "createTestPage.logs.testResultFailed" : "createTestPage.logs.testResultSuccess", undefined, testHasFailed ? 'error' : 'success');
    log("createTestPage.logs.testExecutionCompleted", undefined, 'info');
    setIsRunningTest(false);
    setCurrentExecutingStepId(null);
  }, [testSteps, detectedElements, playwrightSessionId, setIsRunningTest, log, t, iframeSrc, setIframeSrc, url, setUrl, /*handleDetectElements,*/ isProxyEnabled, setElementDetectionError]);

  const handleSaveTestLocal = useCallback(async () => {
    if (testSteps.length === 0) {
      alert(t('createTestPage.alerts.noStepsToSave')); return;
    }
    const testUrlToSave = url; 
    if (currentTestId && savedTests.find(tst => tst.id === currentTestId)) {
      const updatedTest: SavedTest = {
        id: currentTestId, name: currentTestName || t('createTestPage.testCanvas.newTestNameDefault'), steps: testSteps,
        url: testUrlToSave, createdAt: savedTests.find(tst => tst.id === currentTestId)?.createdAt || new Date().toISOString(),
      };
      await updateTestInLocalStorage(updatedTest);
      const updatedTests = await loadAllTestsFromLocalStorage();
      setSavedTests(updatedTests);
      alert(t('createTestPage.alerts.testUpdated', { name: updatedTest.name }));
    } else {
      setSaveTestNameInput(currentTestName === t('createTestPage.testCanvas.newTestNameDefault') ? '' : currentTestName);
      setShowSaveModal(true);
    }
  }, [testSteps, currentTestId, savedTests, currentTestName, url, setSavedTests, t]);

  const handleSaveTestRemote = useCallback(async () => {
    try {
      const savedTest = await apiService.saveTest(currentTestName, testSteps, url);
      setSavedTests(prev => [...prev, savedTest]);
      setCurrentTestId(savedTest.id);
      log('createTestPage.logs.testSaved', { name: savedTest.name });
    } catch (error) {
      console.error('Error saving test:', error);
      log('createTestPage.logs.errorSavingTest', { error: String(error) }, 'error');
    }
  }, [currentTestName, testSteps, url, setSavedTests, setCurrentTestId, log]);

  const confirmSaveNewTest = useCallback(async () => {
    if (!saveTestNameInput.trim()) {
      alert(t('createTestPage.alerts.enterTestName')); return;
    }
    const testUrlToSave = url; 
    const newTest = await saveTestToLocalStorage(saveTestNameInput.trim(), testSteps, testUrlToSave);
    setCurrentTestName(newTest.name);
    setCurrentTestId(newTest.id);
    const updatedTests = await loadAllTestsFromLocalStorage();
    setSavedTests(updatedTests);
    setShowSaveModal(false);
    setSaveTestNameInput('');
    alert(t('createTestPage.alerts.testSaved', { name: newTest.name }));
  }, [saveTestNameInput, testSteps, url, setCurrentTestName, setCurrentTestId, setSavedTests, t]);

  const handleLoadSavedTestFromModal = useCallback((testToLoad: SavedTest) => {
    setElementDetectionError(null);
    setUrl(testToLoad.url || ''); 
    
    let srcToLoad: string | null = null;
    if (testToLoad.url && (testToLoad.url.startsWith('http://') || testToLoad.url.startsWith('https://'))) {
        if (isProxyEnabled) {
            srcToLoad = `${PROXY_PREFIX}${encodeURIComponent(testToLoad.url)}`;
        } else {
            srcToLoad = testToLoad.url;
            setElementDetectionError(t('createTestPage.elementsPanel.externalPageNoProxyLimitations'));
        }
    } else if (testToLoad.url && testToLoad.url.startsWith('file:///')) {
        srcToLoad = testToLoad.url;
        setElementDetectionError(t('createTestPage.elementsPanel.fileUrlLimitations'));
    } else if (testToLoad.url === "internal://test-page") {
        // Handle loading of a legacy "internal://test-page" URL
        log('createTestPage.logs.legacyInternalTestPageLoadAttempt', { name: testToLoad.name }, 'warning');
        alert(t('createTestPage.alerts.internalPageRemovedLoad', { testName: testToLoad.name }));
        // Optionally, clear the URL or set to a default, or allow user to update
        setUrl(''); // Clear the URL as it's no longer valid
        srcToLoad = null; // Do not attempt to load it
        setElementDetectionError(t('createTestPage.alerts.internalPageRemoved'));
    } else if (testToLoad.url) { // Other non-empty URLs
        srcToLoad = testToLoad.url;
         log('createTestPage.logs.unknownUrlTypeLoad', { url: testToLoad.url }, 'warning');
    }


    setIframeSrc(srcToLoad);
    setIsPagePreviewVisible(!!srcToLoad);
    
    setTestSteps(testToLoad.steps);
    setCurrentTestName(testToLoad.name);
    setCurrentTestId(testToLoad.id);
    setDetectedElements([]);
    
    let logKey = 'createTestPage.logs.testLoadedNoUrl';
    let params: Record<string,string|number|undefined> = { name: testToLoad.name };
    if (testToLoad.url && testToLoad.url !== "internal://test-page") { // Ensure it's not the removed internal page for this log
        logKey = 'createTestPage.logs.testLoadedWithUrl'; 
        params.url = testToLoad.url;
    }
    log(logKey, params);
    setShowLoadModal(false);
  }, [setUrl, setIframeSrc, setIsPagePreviewVisible, setTestSteps, setCurrentTestName, setCurrentTestId, setDetectedElements, log, setElementDetectionError, t, isProxyEnabled]);

  const handleDeleteSavedTestInModal = useCallback((testId: string) => { onDeleteTestInPage(testId); }, [onDeleteTestInPage]);

  const onDragStart = useCallback((event: DragEvent<HTMLElement>, itemType: ItemTypes, id: string) => {
    const dragItem: DragItem = { type: itemType, id };
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/json', JSON.stringify(dragItem));
    setDraggedItem(dragItem);
  }, []);
  const onDragStartAction = useCallback((event: DragEvent<HTMLElement>, actionId: string) => onDragStart(event, ItemTypes.ACTION, actionId), [onDragStart]);
  const onDragStartElement = useCallback((event: DragEvent<HTMLElement>, elementId: string) => onDragStart(event, ItemTypes.ELEMENT, elementId), [onDragStart]);
  const onDragStartStep = useCallback((event: DragEvent<HTMLElement>, stepId: string) => onDragStart(event, ItemTypes.TEST_STEP, stepId), [onDragStart]);
  const onDragOverGeneral = useCallback((event: DragEvent<HTMLDivElement>) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; if (dropTargetInfo !== null) setDropTargetInfo(null); }, [dropTargetInfo]);
  const onDragOverStepOrElementZone = useCallback((event: DragEvent<HTMLDivElement>, stepId: string, type: 'element' | 'reorder') => {
    event.preventDefault(); event.stopPropagation();
    if (!draggedItem) { if (dropTargetInfo !== null) setDropTargetInfo(null); return; }
    let isCompatible = (type === 'element' && draggedItem.type === ItemTypes.ELEMENT) || (type === 'reorder' && draggedItem.type === ItemTypes.TEST_STEP && draggedItem.id !== stepId);
    if (isCompatible) { event.dataTransfer.dropEffect = 'move'; if (!dropTargetInfo || dropTargetInfo.stepId !== stepId || dropTargetInfo.type !== type) setDropTargetInfo({ stepId, type }); }
    else { event.dataTransfer.dropEffect = 'none'; if (dropTargetInfo && dropTargetInfo.stepId === stepId) setDropTargetInfo(null); }
  }, [draggedItem, dropTargetInfo]);

  const onDropOnCanvas = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const itemString = event.dataTransfer.getData('application/json');
    if (!itemString || !draggedItem) return;
    let item: DragItem; try { item = JSON.parse(itemString) as DragItem; } catch (e) { console.error("Fail parse on canvas drop:", e); setDraggedItem(null); setDropTargetInfo(null); return; }
    if (item.type === ItemTypes.ACTION) {
      const newStep: TestStep = { id: `step_${Date.now()}`, actionId: item.id, inputValue: '', comment: '' };
      setTestSteps(prev => [...prev, newStep]);
    } else if (item.type === ItemTypes.TEST_STEP && draggedItem.type === ItemTypes.TEST_STEP) {
        const reordered = [...testSteps]; const idx = reordered.findIndex(s => s.id === draggedItem.id); if (idx === -1) return;
        const [moved] = reordered.splice(idx, 1); reordered.push(moved); setTestSteps(reordered);
    }
    setDraggedItem(null); setDropTargetInfo(null);
  }, [draggedItem, testSteps, setTestSteps]);

  const onDropOnStep = useCallback((event: DragEvent<HTMLDivElement>, targetStepId: string) => {
    event.preventDefault(); event.stopPropagation();
    const itemString = event.dataTransfer.getData('application/json'); if (!itemString) { console.error("No data on step drop"); setDraggedItem(null); setDropTargetInfo(null); return; }
    let item: DragItem; try { item = JSON.parse(itemString) as DragItem; } catch (e) { console.error("Fail parse on step drop:", e); setDraggedItem(null); setDropTargetInfo(null); return; }
    if (item.type === ItemTypes.ELEMENT) {
      setTestSteps(prev => prev.map(s => s.id === targetStepId ? { ...s, targetElementId: item.id } : s));
    } else if (item.type === ItemTypes.TEST_STEP && draggedItem?.type === ItemTypes.TEST_STEP) {
        if (draggedItem.id === targetStepId) { setDraggedItem(null); setDropTargetInfo(null); return; }
        const reordered = [...testSteps]; const dIdx = reordered.findIndex(s => s.id === draggedItem.id); const tIdx = reordered.findIndex(s => s.id === targetStepId);
        if (dIdx === -1 || tIdx === -1) return;
        const [moved] = reordered.splice(dIdx, 1); reordered.splice(tIdx, 0, moved); setTestSteps(reordered);
    }
    setDraggedItem(null); setDropTargetInfo(null);
  }, [draggedItem, testSteps, setTestSteps]);

  const updateStepValue = useCallback((stepId: string, field: 'inputValue' | 'comment' | 'targetElementId', value: string) => setTestSteps(prev => prev.map(s => s.id === stepId ? { ...s, [field]: value } : s)), [setTestSteps]);
  const deleteTestStep = useCallback((stepId: string) => setTestSteps(prev => prev.filter(s => s.id !== stepId)), [setTestSteps]);
  const handleShowLoadModal = useCallback(() => setShowLoadModal(true), []);

  const handleGenerateNLPSteps = useCallback(async () => {
    if (!naturalLanguageInput.trim()) {
      alert(t('createTestPage.alerts.naturalLanguageCommandNeeded')); return;
    }
    setIsGeneratingNLPSteps(true);
    log('createTestPage.logs.generatingNLPSteps');
    try {
      const actionTypesForGemini = AVAILABLE_ACTIONS.map(a => a.type.toString());
      const geminiSteps: GeminiGeneratedStep[] = await generateStepsFromNaturalLanguage(naturalLanguageInput, actionTypesForGemini);
      const newTestSteps: TestStep[] = geminiSteps.map((gs, index) => {
        const actionDef = AVAILABLE_ACTIONS.find(a => a.type.toString() === gs.actionName); // Match ActionType string
        if (!actionDef) {
          log('createTestPage.logs.errorNLPActionNotRecognized', { actionName: gs.actionName }, 'error'); return null;
        }
        let targetElementId: string | undefined = undefined;
        if (gs.targetElementNameOrSelector && actionDef.requiresElement) {
          const foundEl = detectedElements.find(el => el.name.toLowerCase() === gs.targetElementNameOrSelector!.toLowerCase() || (el.selector && el.selector.toLowerCase() === gs.targetElementNameOrSelector!.toLowerCase()));
          if (foundEl) targetElementId = foundEl.id;
          else log('createTestPage.logs.warningNLPElementNotFound', { elementNameOrSelector: gs.targetElementNameOrSelector, actionName: t(actionDef.nameKey) }, 'warning');
        }
        return {
          id: `nlp_step_${Date.now()}_${index}`, actionId: actionDef.id, targetElementId: targetElementId,
          inputValue: gs.inputValue || '',
          comment: `Generated from: "${gs.actionName}${gs.targetElementNameOrSelector ? ' on ' + gs.targetElementNameOrSelector : ''}${gs.inputValue ? ' with value ' + gs.inputValue : ''}"`
        };
      }).filter(step => step !== null) as TestStep[];
      setTestSteps(prev => [...prev, ...newTestSteps]);
      log('createTestPage.logs.addedNLPSteps', { count: newTestSteps.length });
      setNaturalLanguageInput('');
    } catch (error) {
      console.error("NLP generation error:", error);
      let userMsgKey = 'createTestPage.alerts.geminiGenericError';
      let logMsgKey = 'createTestPage.logs.errorNLPGenericWithMessage';
      let params:Record<string, string|undefined> = { details: String(error) };

      if (error instanceof Error) {
          params.details = error.message;
          if (error.message.includes("API key might be missing") || error.message.includes("Gemini API client not initialized")) {
              userMsgKey = 'createTestPage.alerts.geminiApiKeyMissing';
              logMsgKey = 'createTestPage.logs.errorNLPGenericWithMessage'; 
              params = { details: t('createTestPage.alerts.geminiApiKeyMissing') }; 
          }
      }
      alert(t(userMsgKey, params)); 
      log(logMsgKey, {message: (error instanceof Error ? error.message : String(error))}, 'error'); 
    } finally {
      setIsGeneratingNLPSteps(false);
    }
  }, [naturalLanguageInput, detectedElements, log, t, setTestSteps]);

  const handleClearExecutionLog = useCallback(() => {
    setExecutionLog([t('createTestPage.logs.logCleared')]);
  }, [setExecutionLog, t]);

  const HIGHLIGHT_STYLE_ID = 'gstd-element-highlighter-style';

  // applyHighlight and removeHighlight now primarily send messages to the iframe
  const applyHighlight = (selector: string) => {
    const iframe = document.getElementById(IFRAME_PREVIEW_ID) as HTMLIFrameElement | null;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'HIGHLIGHT_ELEMENT', selector: selector }, '*');
    } else {
      console.warn('[DEBUG] applyHighlight: Iframe or contentWindow not available.');
    }
  };

  const removeHighlight = () => {
    const iframe = document.getElementById(IFRAME_PREVIEW_ID) as HTMLIFrameElement | null;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'REMOVE_HIGHLIGHT' }, '*');
    } else {
      console.warn('[DEBUG] removeHighlight: Iframe or contentWindow not available.');
    }
  };

  const handleElementMouseEnter = (element: DetectedElement) => {
    setHighlightedElementSelector(element.selector); // Keep this for potential debugging/display
    applyHighlight(element.selector); // Tell iframe to highlight its internal element

    if (!element.boundingBox) {
      setHighlightOverlayRect(null);
      console.warn('[DEBUG] MouseEnter: Element has no boundingBox. Cannot display overlay.', element);
      return;
    }
    const { x, y, width, height } = element.boundingBox;
    if (width === 0 || height === 0) {
        setHighlightOverlayRect(null);
        console.warn('[DEBUG] MouseEnter: Element boundingBox has zero width or height.', element);
        return;
    }

    const iframeElement = document.getElementById(IFRAME_PREVIEW_ID) as HTMLIFrameElement | null;
    if (!iframeElement) {
      setHighlightOverlayRect(null);
      console.warn('[DEBUG] MouseEnter: Iframe element not found.');
      return;
    }

    const iframeRect = iframeElement.getBoundingClientRect();
    // The overlay's parent is the div with 'relative' class.
    // We need to find this container to correctly offset the overlay.
    const overlayContainer = iframeElement.closest('.relative') as HTMLElement | null;

    if (!overlayContainer) {
        setHighlightOverlayRect(null);
        console.warn('[DEBUG] MouseEnter: Overlay container with ".relative" class not found.');
        return;
    }
    const overlayContainerRect = overlayContainer.getBoundingClientRect();

    const calculatedTop = iframeRect.top - overlayContainerRect.top + y;
    const calculatedLeft = iframeRect.left - overlayContainerRect.left + x;

    setHighlightOverlayRect({
      top: calculatedTop,
      left: calculatedLeft,
      width: width,
      height: height,
    });
  };

  const handleElementMouseLeave = () => {
    setHighlightedElementSelector(null);
    removeHighlight(); // Tell iframe to remove its internal highlight
    setHighlightOverlayRect(null); // Hide the parent-level overlay
  };

  useEffect(() => {
    const iframeElement = document.getElementById(IFRAME_PREVIEW_ID) as HTMLIFrameElement | null;
    if (iframeElement) {
      iframeElement.addEventListener('load', handleIframeLoadOrError);
      iframeElement.addEventListener('error', handleIframeLoadOrError); 
      return () => {
        iframeElement.removeEventListener('load', handleIframeLoadOrError);
        iframeElement.removeEventListener('error', handleIframeLoadOrError);
      };
    }
  }, [iframeSrc, handleIframeLoadOrError]);

  const handleLoadSavedTests = useCallback(async () => {
    try {
      const loadedTests = await apiService.getAllTests();
      setSavedTests(loadedTests);
    } catch (error) {
      console.error('Error loading tests:', error);
    }
  }, [setSavedTests]);

  const loadTest = useCallback((testToLoad: SavedTest) => {
    setUrl(testToLoad.url || '');
    let srcToLoad = '';

    if (testToLoad.url && (testToLoad.url.startsWith('http://') || testToLoad.url.startsWith('https://'))) {
        srcToLoad = testToLoad.url;
    } else if (testToLoad.url && testToLoad.url.startsWith('file:///')) {
        srcToLoad = testToLoad.url;
        setElementDetectionError(t('createTestPage.elementsPanel.fileUrlLimitations'));
    } else if (testToLoad.url === "internal://test-page") {
        log('createTestPage.logs.legacyInternalTestPageLoadAttempt', { name: testToLoad.name }, 'warning');
        alert(t('createTestPage.alerts.internalPageRemovedLoad', { testName: testToLoad.name }));
        setUrl('');
        srcToLoad = '';
        setElementDetectionError(t('createTestPage.alerts.internalPageRemoved'));
    } else if (testToLoad.url) {
      srcToLoad = testToLoad.url;
      log('createTestPage.logs.unknownUrlTypeLoad', { url: testToLoad.url }, 'warning');
    }


    setIframeSrc(srcToLoad);
    setIsPagePreviewVisible(!!srcToLoad);
    
    setTestSteps(testToLoad.steps);
    setCurrentTestName(testToLoad.name);
    setCurrentTestId(testToLoad.id);
    setDetectedElements([]);
    
    let logKey = 'createTestPage.logs.testLoadedNoUrl';
    let params: Record<string,string|number|undefined> = { name: testToLoad.name };
    // if (testToLoad.url === "internal://test-page") { // This case is handled by alert and different logging now
    //     logKey = 'createTestPage.logs.testLoadedInternal';
    // } else
    if (testToLoad.url && testToLoad.url !== "internal://test-page") {
        logKey = 'createTestPage.logs.testLoadedWithUrl'; 
        params.url = testToLoad.url;
        log(logKey, params);
    } else if (!testToLoad.url) { // Log if URL is empty
        log(logKey, params); // Logs "Test loaded: ..."
    }
    // If it was "internal://test-page", specific logging already happened.

    setShowLoadModal(false);
  }, [setUrl, setIframeSrc, setIsPagePreviewVisible, setTestSteps, setCurrentTestName, setCurrentTestId, setDetectedElements, log, setElementDetectionError, t]);

  useEffect(() => {
  return () => {
    if (playwrightSessionId) {
      console.log('[CreateTestPage] Component unmounting, closing Playwright session:', playwrightSessionId);
      apiService.closePlaywrightSession(playwrightSessionId) // L'errore per closePlaywrightSession è gestito sotto
        .then(() => console.log('[CreateTestPage] Session closed on unmount:', playwrightSessionId))
        .catch((err: Error) => console.error('[CreateTestPage] Error closing session on unmount:', err.message)); // Specificato il tipo Error e usato err.message
    }
  };
}, [playwrightSessionId]);

  return (
    <div className="flex flex-col h-full">
      <Header
        url={url}
        setUrl={setUrl}
        isLoadingPage={isLoadingPage}
        isRunningTest={isRunningTest}
        handleLoadUrl={handleLoadUrl}
        isPagePreviewVisible={isPagePreviewVisible}
        isDetectingElements={isDetectingElements}
        handleDetectElements={handleDetectElements}
        testStepsCount={testSteps.length}
        handleRunTest={handleRunTest}
        onSaveTest={handleSaveTestLocal}
        currentTestId={currentTestId}
        onShowLoadModal={() => setShowLoadModal(true)}
      />
      <main className="flex-grow flex overflow-hidden">
        <ActionsPanel onDragStartAction={onDragStartAction} naturalLanguageInput={naturalLanguageInput} setNaturalLanguageInput={setNaturalLanguageInput} handleGenerateNLPSteps={handleGenerateNLPSteps} isGeneratingNLPSteps={isGeneratingNLPSteps} />
        <div className="flex-grow flex flex-col overflow-hidden">
          <div className="flex-grow overflow-hidden">
             <TestCanvas currentTestName={currentTestName} setCurrentTestName={setCurrentTestName} testSteps={testSteps} draggedItem={draggedItem} dropTargetInfo={dropTargetInfo} onDragOverCanvas={onDragOverGeneral} onDropOnCanvas={onDropOnCanvas} detectedElements={detectedElements} currentExecutingStepId={currentExecutingStepId} onDragStartStep={onDragStartStep} onDragOverStep={onDragOverStepOrElementZone} onDropOnStep={onDropOnStep} updateStepValue={updateStepValue} deleteTestStep={deleteTestStep} />
          </div>
          <div className={`flex-grow border-t-2 overflow-hidden ${theme === 'light' ? 'border-slate-300' : 'border-slate-700'} relative`}>
            <WebPreviewPanel
                iframeSrc={iframeSrc}
                actualLoadedUrl={url}
                isPagePreviewVisible={isPagePreviewVisible} 
                executionLog={executionLog} 
                isRunningTest={isRunningTest} 
                isProxyEnabled={isProxyEnabled} // Pass new prop
                onClearLog={handleClearExecutionLog}
            />
            <HighlightOverlay rect={highlightOverlayRect} />
          </div>
        </div>
        <ElementsPanel
          isDetectingElements={isDetectingElements} 
          detectedElements={detectedElements} 
          isPagePreviewVisible={isPagePreviewVisible} 
          onDragStartElement={onDragStartElement} 
          onElementMouseEnter={handleElementMouseEnter}
          onElementMouseLeave={handleElementMouseLeave}
          elementDetectionError={elementDetectionError} 
        />
      </main>
      <Modal isOpen={showSaveModal} onClose={() => setShowSaveModal(false)} title={t('createTestPage.saveModal.title')}
        footer={
          <div className="flex justify-end space-x-2">
            <button onClick={() => setShowSaveModal(false)} className={`px-4 py-2 rounded transition-colors ${theme === 'light' ? 'bg-slate-200 hover:bg-slate-300 text-slate-700' : 'bg-slate-600 hover:bg-slate-500 text-white'}`}>{t('general.cancel')}</button>
            <button onClick={confirmSaveNewTest} className={`px-4 py-2 text-white rounded transition-colors ${theme === 'light' ? 'bg-sky-500 hover:bg-sky-600' : 'bg-sky-600 hover:bg-sky-500'}`}>{t('general.save')}</button>
          </div>
        }
      >
        <label htmlFor="testName" className={`block text-sm font-medium mb-1 ${theme === 'light' ? 'text-slate-700' : 'text-gray-300'}`}>{t('createTestPage.saveModal.testNameLabel')}</label>
        <input id="testName" type="text" value={saveTestNameInput} onChange={e => setSaveTestNameInput(e.target.value)} className={`w-full p-2 rounded border outline-none ${theme === 'light' ? 'bg-white text-slate-700 border-slate-300 focus:ring-2 focus:ring-sky-500 placeholder-slate-400' : 'bg-slate-700 text-gray-200 border-slate-600 focus:ring-2 focus:ring-sky-500 placeholder-gray-400'}`} placeholder={t('createTestPage.saveModal.testNamePlaceholder')} />
      </Modal>
      <Modal isOpen={showLoadModal} onClose={() => setShowLoadModal(false)} title={t('createTestPage.loadModal.title')}
         footer={<div className="flex justify-end"><button onClick={() => setShowLoadModal(false)} className={`px-4 py-2 rounded transition-colors ${theme === 'light' ? 'bg-slate-200 hover:bg-slate-300 text-slate-700' : 'bg-slate-600 hover:bg-slate-500 text-white'}`}>{t('general.close')}</button></div>}
      >
        {savedTests.length === 0 ? ( <p className={`${theme === 'light' ? 'text-slate-500' : 'text-gray-400'}`}>{t('createTestPage.loadModal.noSavedTests')}</p> ) : (
          <ul className="space-y-2 max-h-96 overflow-y-auto">
            {savedTests.map(test => (
              <li key={test.id} className={`p-3 rounded shadow flex justify-between items-center ${theme === 'light' ? 'bg-slate-50 border border-slate-200' : 'bg-slate-700'}`}>
                <div>
                  <p className={`font-semibold ${theme === 'light' ? 'text-sky-700' : 'text-sky-300'}`}>{test.name}</p>
                  <p className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-gray-400'}`}>
                    {t('createTestPage.loadModal.urlLabel', { url: test.url || t('createTestPage.loadModal.notAvailableUrl')})}
                    {test.url === "internal://test-page" && <span className="text-yellow-500"> ({t('general.legacy')})</span>}
                    {' - '}
                    {t('createTestPage.loadModal.stepsLabel', { count: test.steps.length })}
                  </p>
                  <p className={`text-xs ${theme === 'light' ? 'text-slate-400' : 'text-gray-500'}`}>{t('createTestPage.loadModal.savedAtLabel', { date: new Date(test.createdAt).toLocaleString(locale) })}</p>
                </div>
                <div className="space-x-2">
                  <button onClick={() => handleLoadSavedTestFromModal(test)} className={`text-xs px-2 py-1 rounded transition-colors text-white ${theme === 'light' ? 'bg-sky-500 hover:bg-sky-600' : 'bg-sky-600 hover:bg-sky-500'}`}>{t('general.load')}</button>
                  <button onClick={() => handleDeleteSavedTestInModal(test.id)} className="text-xs bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded transition-colors">{t('general.delete')}</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
};
