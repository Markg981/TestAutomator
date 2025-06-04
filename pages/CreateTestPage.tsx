import React, { useState, useEffect, useCallback, DragEvent, ReactNode, Dispatch, SetStateAction } from 'react';
import { ActionDefinition, DetectedElement, TestStep, SavedTest, ItemTypes, DragItem, GeminiGeneratedStep, ActionType } from '../types';
import { AVAILABLE_ACTIONS, getActionDefinition } from '../constants';
import { saveTestToLocalStorage, loadAllTestsFromLocalStorage, deleteTestFromLocalStorage, updateTestInLocalStorage } from '../services/testStorageService';
import { generateStepsFromNaturalLanguage } from '../services/geminiService';
import { Modal } from '../components/Modal';
import { useTheme } from '../ThemeContext';
import { useLocalization } from '../LocalizationContext';
import { apiService } from '../services/apiService';

// Helper Functions
// getActionDefinition is now imported from constants.tsx

const getElementDefinition = (elementId: string, elements: DetectedElement[]): DetectedElement | undefined => {
  return elements.find(e => e.id === elementId);
};

// --- Sub-Components ---
interface HeaderProps {
  url: string;
  setUrl: (url: string) => void;
  isLoadingPage: boolean;
  isRunningTest: boolean;
  handleLoadUrl: () => void;
  handleLoadInternalTestPage: () => void; 
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
  url, setUrl, isLoadingPage, isRunningTest, handleLoadUrl, handleLoadInternalTestPage,
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
      <button onClick={handleLoadInternalTestPage} disabled={isLoadingPage || isRunningTest}
              className={`px-4 py-2 rounded disabled:opacity-50 transition-colors text-sm
                          ${theme === 'light' ? 'bg-lime-500 hover:bg-lime-600 text-white' : 'bg-lime-600 hover:bg-lime-500 text-white'}`}>
        {t('createTestPage.header.loadInternalTestPageButton')}
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
}
const ElementsPanel = React.memo<ElementsPanelProps>(({
  isDetectingElements, detectedElements, isPagePreviewVisible, onDragStartElement, elementDetectionError
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
  isInternalTestPage: boolean;
  isProxyEnabled: boolean;
  onClearLog: () => void;
}

const WebPreviewPanel = React.memo<WebPreviewPanelProps>(({ 
  iframeSrc, actualLoadedUrl, isPagePreviewVisible, executionLog, isRunningTest, isInternalTestPage, isProxyEnabled, onClearLog 
}) => {
  const { theme } = useTheme();
  const { t } = useLocalization();

  const displayUrl = isInternalTestPage ? t('general.internalTestPageName') : (actualLoadedUrl || t('general.none'));
  
  let pageTypeQualifier = '';
  if (isInternalTestPage) {
    pageTypeQualifier = t('createTestPage.webPreviewPanel.internalPageQualifier');
  } else if (iframeSrc) {
    if (iframeSrc.startsWith('data:')) {
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
        isInternalTestPage || actualLoadedUrl.includes('/gstd/gstd-report') ? (
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
        <div className={`w-full h-4/5 flex-grow flex items-center justify-center p-4
                       ${theme === 'light' ? 'bg-slate-100 text-slate-500' : 'bg-slate-700 text-gray-500'}`}>
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

export const INTERNAL_TEST_PAGE_HTML = `
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <title>Pagina di Test Interna</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 20px; background-color: #f4f7f9; color: #333; margin:0;}
        .container { background-color: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 600px; margin: 20px auto; }
        h1 { color: #2c3e50; margin-top: 0; }
        p { line-height: 1.6; }
        label { display: block; margin-bottom: 5px; font-weight: 500; color: #555; }
        input[type="text"], input[type="password"], button {
            padding: 10px 12px; margin: 5px 0 15px 0; border-radius: 5px; border: 1px solid #ddd;
            box-sizing: border-box; width: 100%; font-size: 1rem;
        }
        input[type="text"]:focus, input[type="password"]:focus { border-color: #007bff; box-shadow: 0 0 0 2px rgba(0,123,255,.25); outline: none;}
        button { cursor: pointer; background-color: #007bff; color: white; font-weight: 500; transition: background-color 0.2s ease; border: none; }
        button:hover { background-color: #0056b3; }
        button.secondary { background-color: #6c757d; }
        button.secondary:hover { background-color: #545b62; }
        .output { margin-top: 15px; padding: 12px; border: 1px dashed #ccc; min-height: 30px; background-color: #eef2f5; border-radius: 5px; font-family: monospace; white-space: pre-wrap;}
        .hidden-element { display: none; }
    </style>
</head>
<body>
    <div class="container">
        <h1 id="mainHeading">Pagina di Test Interna</h1>
        <p id="descriptionParagraph">Questa pagina è caricata dall'applicazione per testare le funzionalità in un ambiente same-origin.</p>
        <div>
            <label for="textInput">Input Testo:</label>
            <input type="text" id="textInput" name="test_input" placeholder="Scrivi qualcosa qui...">
        </div>
        <div>
            <label for="passwordInput">Input Password:</label>
            <input type="password" id="passwordInput" name="test_password" data-testid="password-field">
        </div>
        <button id="clickButton">Clicca per Messaggio</button>
        <button id="verifyButton" class="secondary" data-testid="verify-btn">Verifica Testo Output</button>
        <button id="toggleVisibilityButton" class="secondary">Mostra/Nascondi Elemento</button>
        <div id="outputArea" class="output">Contenuto Iniziale Output</div>
        <div id="hiddenElement" class="hidden-element">Elemento Nascosto Visibile!</div>
    </div>
    <script>
        document.getElementById('clickButton').addEventListener('click', () => {
            const inputText = document.getElementById('textInput').value;
            document.getElementById('outputArea').textContent = 'Bottone "Clicca per Messaggio" cliccato! Testo input: ' + (inputText || '(vuoto)');
        });
        document.getElementById('verifyButton').addEventListener('click', () => {
            document.getElementById('outputArea').textContent = 'Contenuto Output per Verifica Testo';
        });
        document.getElementById('toggleVisibilityButton').addEventListener('click', () => {
            const el = document.getElementById('hiddenElement');
            const isHidden = el.classList.contains('hidden-element');
            el.classList.toggle('hidden-element');
            document.getElementById('outputArea').textContent = 'Elemento nascosto ora ' + (isHidden ? 'VISIBILE' : 'NASCOSTO');
        });
    </script>
</body>
</html>`;

const PROXY_PREFIX = '/__app_proxy__/';

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
  const [isInternalTestPageLoaded, setIsInternalTestPageLoaded] = useState<boolean>(false);
  const [elementDetectionError, setElementDetectionError] = useState<string | null>(null);


  const log = useCallback((messageKey: string, params?: Record<string, string | number | undefined>, type: 'info' | 'error' | 'warning' | 'success' = 'info') => {
    let fullMessage = t(messageKey, params);
    if (type === 'error') {
        fullMessage = `${t('general.error').toUpperCase()}: ${fullMessage}`;
    } else if (type === 'warning') {
        fullMessage = `${t('general.warning').toUpperCase()}: ${fullMessage}`;
    }
    setExecutionLog(prev => [fullMessage, ...prev].slice(0, 200));
  }, [setExecutionLog, t]);


  const handleLoadUrl = useCallback(() => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      alert(t('createTestPage.alerts.noUrl'));
      return;
    }
    setIsLoadingPage(true);
    setIsPagePreviewVisible(false); 
    setIsInternalTestPageLoaded(false);
    setElementDetectionError(null);
    log('createTestPage.logs.loadingUrl', { url: trimmedUrl });

    let srcToLoad: string;
    if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
      srcToLoad = trimmedUrl;
      log('createTestPage.logs.loadingDirectlyNoProxy', { url: trimmedUrl });
    } else if (trimmedUrl.startsWith('file:///')) {
      srcToLoad = trimmedUrl;
      log('createTestPage.logs.loadingFileUrl', { url: trimmedUrl });
      setElementDetectionError(t('createTestPage.elementsPanel.fileUrlLimitations'));
    } else {
       setIsLoadingPage(false);
       setIframeSrc(null);
       setIsPagePreviewVisible(false);
       log('createTestPage.logs.errorInvalidUrl', { url: trimmedUrl }, 'error');
       alert(t('createTestPage.alerts.invalidUrlFormat', { url: trimmedUrl }));
       return;
    }
    
    setTimeout(() => {
        setIframeSrc(srcToLoad);
        setIsPagePreviewVisible(true);
        setDetectedElements([]);
        // Imposta come pagina interna se è GSTD per forzare l'uso dell'iframe
        if (trimmedUrl.includes('/gstd/gstd-report')) {
          setIsInternalTestPageLoaded(true);
        }
        if (!currentTestId) { 
            setTestSteps([]);
            setCurrentTestName(t('createTestPage.testCanvas.newTestNameDefault'));
        }
    }, 100); 

  }, [url, setIsLoadingPage, setIsPagePreviewVisible, setIframeSrc, log, t, setDetectedElements, setTestSteps, setCurrentTestName, currentTestId, setElementDetectionError, setIsInternalTestPageLoaded]);

  const handleLoadInternalTestPage = useCallback(() => {
    setIsLoadingPage(true);
    setIsPagePreviewVisible(false);
    setElementDetectionError(null);
    log('createTestPage.logs.loadingInternalTestPage');
    console.log("[DEBUG] handleLoadInternalTestPage called");

    const internalPageDataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(INTERNAL_TEST_PAGE_HTML)}`;
    
    setTimeout(() => {
        console.log("[DEBUG] Setting iframeSrc for internal page and updating states.");
        setUrl("internal://test-page"); 
        setIframeSrc(internalPageDataUrl);
        setIsPagePreviewVisible(true);
        setIsInternalTestPageLoaded(true);
        log('createTestPage.logs.internalTestPageLoaded');
        setDetectedElements([]);
    }, 100);
  }, [setUrl, setIframeSrc, setIsLoadingPage, setIsPagePreviewVisible, log, setDetectedElements, setElementDetectionError]);

  const handleIframeLoadOrError = useCallback(() => {
    setIsLoadingPage(false);
    console.log(`[DEBUG] iframe load/error event. isLoadingPage set to false. iframeSrc: ${iframeSrc}, isInternalTestPageLoaded: ${isInternalTestPageLoaded}`);
    if (isInternalTestPageLoaded && iframeSrc?.startsWith('data:')) {
      console.log("[DEBUG] Internal test page successfully loaded (iframe onload).");
      log('createTestPage.logs.internalTestPageLoaded'); // Log success again here for clarity
    } else if (iframeSrc && !isInternalTestPageLoaded && !iframeSrc.startsWith('data:')) {
      const displayedUrl = (iframeSrc.startsWith(PROXY_PREFIX) && isProxyEnabled) 
        ? decodeURIComponent(iframeSrc.substring(PROXY_PREFIX.length)) 
        : iframeSrc;
      log('createTestPage.logs.externalPageAttemptLoad', { url: displayedUrl });
    }
  }, [iframeSrc, isInternalTestPageLoaded, log, setIsLoadingPage, isProxyEnabled]);


  const handleDetectElements = useCallback(async () => {
    console.log(`[DEBUG] handleDetectElements called. isInternalTestPageLoaded: ${isInternalTestPageLoaded}, isPagePreviewVisible: ${isPagePreviewVisible}, iframeSrc: ${iframeSrc}, isLoadingPage: ${isLoadingPage}`);
    
    if (isLoadingPage) {
      log('createTestPage.logs.waitingForPageLoadBeforeDetect', undefined, 'warning');
      alert(t('createTestPage.alerts.pageStillLoading'));
      return;
    }
    if (!isPagePreviewVisible || !iframeSrc) {
      const messageKey = isInternalTestPageLoaded ? 'createTestPage.alerts.internalPageNotReadyForDetect' : 'createTestPage.alerts.loadPageFirstForDetect';
      alert(t(messageKey));
      log(messageKey, undefined, 'warning');
      return;
    }
    
    setIsDetectingElements(true);
    const sourceName = isInternalTestPageLoaded ? t('general.internalTestPageName') : iframeSrc;
    log('createTestPage.logs.detectingElementsFrom', { source: sourceName });
    console.log(`[DEBUG] Starting element detection from: ${sourceName}`);
    setDetectedElements([]);

    try {
      // Per le pagine interne, manteniamo la logica esistente
      if (isInternalTestPageLoaded) {
        // Mantieni la logica esistente per le pagine interne
        setTimeout(() => {
          const iframe = document.getElementById(IFRAME_PREVIEW_ID) as HTMLIFrameElement | null;
          console.log("[DEBUG] [DetectElements Timeout] iframe element:", iframe);
          if (!iframe) {
            log('createTestPage.logs.errorIframeNotFound', undefined, 'error');
            console.error("[DEBUG] [DetectElements Timeout] Iframe not found.");
            setIsDetectingElements(false);
            return;
          }

          try {
            const iframeDocument = iframe.contentDocument || iframe.contentWindow?.document;
            console.log("[DEBUG] [DetectElements Timeout] iframeDocument:", iframeDocument);
            if (isInternalTestPageLoaded) {
                console.log("[DEBUG] [DetectElements Timeout] Attempting detection on INTERNAL TEST PAGE.");
                if (iframeDocument && iframeDocument.body) {
                    console.log("[DEBUG] [DetectElements Timeout] Internal page body outerHTML (first 200 chars):", iframeDocument.body.outerHTML.substring(0, 200));
                    console.log("[DEBUG] [DetectElements Timeout] Internal page readyState:", iframeDocument.readyState);
                } else if (iframeDocument) {
                     console.warn("[DEBUG] [DetectElements Timeout] Internal page iframeDocument exists, but body is null/undefined.");
                }
            }

            if (!iframeDocument) {
              log('createTestPage.logs.errorAccessingIframeDom', { source: sourceName }, 'error');
              console.error(`[DEBUG] [DetectElements Timeout] Cannot access iframe DOM from: ${sourceName}`);
              setElementDetectionError(t('createTestPage.elementsPanel.detectionFailedGeneralHelp'));
              setIsDetectingElements(false);
              return;
            }
            log('createTestPage.logs.iframeAccessSuccessScanning', { source: sourceName });
            const foundHtmlElements = iframeDocument.querySelectorAll('input, button, a, select, textarea, [role="button"], [role="link"], [role="tab"], [data-testid], p, h1, h2, h3, h4, h5, h6, div[id], span[id]');
            console.log("[DEBUG] [DetectElements Timeout] foundHtmlElements length:", foundHtmlElements.length);
            if (isInternalTestPageLoaded && foundHtmlElements.length === 0 && iframeDocument.body) {
                console.warn("[DEBUG] [DetectElements Timeout] Query selector found 0 elements on internal page, but body content exists. Check selector string and page content.");
            }
            
            const newDetectedElements: DetectedElement[] = [];
            const tempSelectors = new Set<string>();

            foundHtmlElements.forEach((htmlEl, index) => {
              const element = htmlEl as HTMLElement;
              const tagName = element.tagName.toUpperCase();
              if (['SCRIPT', 'STYLE', 'META', 'LINK', 'HEAD', 'TITLE'].includes(tagName)) return;
              const name = getElementUserFriendlyName(element, tagName);
              const selector = getElementCssSelector(element);
              let elId = `el_${selector.replace(/[^a-zA-Z0-9_]/g, '_').substring(0,50)}_${index}`;
              if (tempSelectors.has(elId)) elId = `${elId}_${Math.random().toString(36).substring(2, 5)}`;
              tempSelectors.add(elId);
              const attributes: Record<string, string> = {};
              if (element.id) attributes.id = element.id;
              if (element.className && typeof element.className === 'string') attributes.class = element.className;
              if (element.getAttribute('data-testid')) attributes['data-testid'] = element.getAttribute('data-testid')!;
              if (element.getAttribute('role')) attributes.role = element.getAttribute('role')!;
              if (element.getAttribute('name')) attributes.name = element.getAttribute('name')!;
              if (element.getAttribute('type')) attributes.type = element.getAttribute('type')!;
              if (element.getAttribute('value')) attributes.value = element.getAttribute('value')!;
              if (element.getAttribute('placeholder')) attributes.placeholder = element.getAttribute('placeholder')!;
              if (element.getAttribute('href')) attributes.href = element.getAttribute('href')!;
              if (element.getAttribute('src')) attributes.src = element.getAttribute('src')!;
              if (element.getAttribute('alt')) attributes.alt = element.getAttribute('alt')!;
              if (element.getAttribute('title')) attributes.title = element.getAttribute('title')!;
              if (element.getAttribute('aria-label')) attributes['aria-label'] = element.getAttribute('aria-label')!;
              
              newDetectedElements.push({
                id: elId,
                name,
                tagName,
                selector,
                attributes,
                text: element.textContent || undefined
              });
            });

            if (newDetectedElements.length > 0) {
              setDetectedElements(newDetectedElements);
              const sourceDetails = isInternalTestPageLoaded ? t('general.internalTestPageName') : sourceName;
              log('createTestPage.logs.detectedElementsCount', { count: newDetectedElements.length, sourceDetails });
              console.log(`[DEBUG] [DetectElements Timeout] Detected ${newDetectedElements.length} elements.`);
            } else {
              log('createTestPage.logs.noInteractiveElementsFound', { sourceDetails: sourceName }, 'warning');
              console.warn(`[DEBUG] [DetectElements Timeout] No interactive elements found for ${sourceName}.`);
            }
          } catch (error) {
            console.error("[DEBUG] [DetectElements Timeout] Error during iframe DOM access or element processing:", error);
            log('createTestPage.logs.errorAccessingIframeDomUnexpected', { source: sourceName, error: String(error) }, 'error');
            setElementDetectionError(t('createTestPage.elementsPanel.detectionFailedGeneralHelp'));
            setDetectedElements([]);
          } finally {
            setIsDetectingElements(false);
            console.log("[DEBUG] [DetectElements Timeout] Detection process finished.");
          }
        }, 500);
      } else {
        // For external pages, use the new Playwright backend service
        log('createTestPage.logs.detectingElementsWithPlaywright', { url }, 'info');
        console.log(`[DEBUG] Detecting elements for external URL: ${url} using Playwright backend service.`);
        const backendElements = await apiService.detectElementsByPlaywright(url); // ElementInfo[]

        const newDetectedElements: DetectedElement[] = backendElements.map((el: any, index: number) => {
          // el is ElementInfo: { tag, id?, classes?, text?, attributes, xpath, selector, boundingBox? }
          const tagName = el.tag?.toUpperCase() || 'UNKNOWN';
          
          // Simplified name generation. Can be enhanced later.
          let name = el.text?.trim().substring(0, 70);
          if (!name) name = el.attributes?.name || el.attributes?.id || el.attributes?.['aria-label'];
          if (!name) name = `${tagName} (${el.selector?.substring(0, 40)}...)`;
          if (!name) name = `${tagName} #${index}`;


          const feId = `el_pw_${el.selector?.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0,40)}_${index}`;
          
          return {
            id: feId,
            name: name,
            tagName: tagName,
            selector: el.selector || '', // CSS selector from Playwright
            attributes: el.attributes || {},
            text: el.text?.trim() || undefined,
            // boundingBox: el.boundingBox // Available if needed later
          };
        });

        setDetectedElements(newDetectedElements);
        if (newDetectedElements.length > 0) {
          log('createTestPage.logs.detectedElementsCount', { count: newDetectedElements.length, sourceDetails: sourceName });
          console.log(`[DEBUG] Detected ${newDetectedElements.length} elements via Playwright backend API for ${url}.`);
        } else {
          log('createTestPage.logs.noInteractiveElementsFound', { sourceDetails: sourceName }, 'warning');
          console.warn(`[DEBUG] No interactive elements found via Playwright backend API for ${url}.`);
        }
      }
    } catch (error) {
      console.error("[DEBUG] Error during element detection (either internal or Playwright backend):", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      log('createTestPage.logs.errorDuringElementDetection', { source: sourceName, error: errorMessage }, 'error');
      setElementDetectionError(t('createTestPage.elementsPanel.detectionFailedSpecific', { error: errorMessage }));
      setDetectedElements([]);
    } finally {
      setIsDetectingElements(false);
      console.log("[DEBUG] Element detection process finished.");
    }
  }, [isPagePreviewVisible, iframeSrc, setIsDetectingElements, log, t, setDetectedElements, isInternalTestPageLoaded, setElementDetectionError, isLoadingPage, url]);

  const handleRunTest = useCallback(async () => {
    if (testSteps.length === 0) {
      alert(t('createTestPage.alerts.noStepsToRun'));
      return;
    }
    setIsRunningTest(true);
    log("createTestPage.logs.testExecutionStarting");
    let testHasFailed = false;

    for (const [index, step] of testSteps.entries()) {
      setCurrentExecutingStepId(step.id);
      await new Promise(resolve => setTimeout(resolve, 300));

      const actionDef = getActionDefinition(step.actionId);
      const elementDef = step.targetElementId ? getElementDefinition(step.targetElementId, detectedElements) : undefined;
      const actionNameDisplay = actionDef ? t(actionDef.nameKey) : t('createTestPage.testStepCard.unknownAction');
      
      log('createTestPage.logs.executingStep', { current: index + 1, total: testSteps.length, actionName: actionNameDisplay });

      if (!actionDef) {
        log('createTestPage.logs.errorActionDefinitionNotFound', undefined, 'error');
        testHasFailed = true; continue;
      }
      if (actionDef.requiresElement && !elementDef && step.targetElementId) {
         log('createTestPage.logs.errorElementNotFoundForStep', { elementId: step.targetElementId }, 'error');
         testHasFailed = true; continue;
      }
      if (actionDef.requiresElement && !step.targetElementId) {
        log('createTestPage.logs.errorNoTargetElement', undefined, 'error');
        testHasFailed = true; continue;
      }

      const iframeElement = document.getElementById(IFRAME_PREVIEW_ID) as HTMLIFrameElement | null;
      const currentIframeSrcForLog = iframeElement?.src || iframeSrc || "N/A";
      
      switch (actionDef.type) {
        case ActionType.GOTO_URL:
          const targetUrlValue = step.inputValue || '';
          log('createTestPage.logs.gotoUrlActionLog', { url: targetUrlValue });
          let newIframeSrc: string;
          if (targetUrlValue.startsWith('http://') || targetUrlValue.startsWith('https://')) {
            if (isProxyEnabled) {
                newIframeSrc = `${PROXY_PREFIX}${encodeURIComponent(targetUrlValue)}`;
            } else {
                newIframeSrc = targetUrlValue;
                setElementDetectionError(t('createTestPage.elementsPanel.externalPageNoProxyLimitations'));
            }
            setIsInternalTestPageLoaded(false);
          } else if (targetUrlValue.startsWith('file:///')) {
            newIframeSrc = targetUrlValue;
            setIsInternalTestPageLoaded(false);
            log('createTestPage.logs.navigatingToFileUrl', { url: targetUrlValue }, 'warning');
            setElementDetectionError(t('createTestPage.elementsPanel.fileUrlLimitations'));
          } else if (targetUrlValue === "internal://test-page") {
            newIframeSrc = `data:text/html;charset=utf-8,${encodeURIComponent(INTERNAL_TEST_PAGE_HTML)}`;
            setIsInternalTestPageLoaded(true);
            setElementDetectionError(null);
          }
          else {
            log('createTestPage.logs.errorInvalidNavigationUrl', { url: targetUrlValue }, 'error');
            testHasFailed = true;
            break; // from switch
          }
          
          setIframeSrc(newIframeSrc); 
          setUrl(targetUrlValue); 
          log('createTestPage.logs.navigatingToUrl', { url: targetUrlValue });
          await new Promise(resolve => setTimeout(resolve, 1500)); 
          log('createTestPage.logs.pageNavigationCompleted', { url: targetUrlValue });
          setDetectedElements([]); 
          break;

        case ActionType.INPUT_TEXT:
        case ActionType.CLICK:
        case ActionType.VERIFY_TEXT:
          if (!elementDef) {
            log(actionDef.type === ActionType.CLICK ? 'createTestPage.logs.errorElementNotSpecifiedForClick' : actionDef.type === ActionType.INPUT_TEXT ? 'createTestPage.logs.errorElementNotSpecifiedForInput' : 'createTestPage.logs.errorElementNotSpecifiedForVerify', undefined, 'error');
            testHasFailed = true;
            break;
          }
          const baseLogKey = actionDef.type === ActionType.CLICK ? 'click' : actionDef.type === ActionType.INPUT_TEXT ? 'input' : 'verify';
          log(`createTestPage.logs.${baseLogKey}ActionLog`, { elementName: elementDef.name, value: step.inputValue, expectedText: step.inputValue });

          try {
            if (!iframeElement?.contentDocument) {
              log('createTestPage.logs.errorAccessingIframeContentForAction', { actionName: actionNameDisplay, source: currentIframeSrcForLog }, 'error');
              testHasFailed = true; break;
            }
            const targetElement = iframeElement.contentDocument.querySelector(elementDef.selector) as HTMLElement | null;
            if (!targetElement) {
              log(`createTestPage.logs.error${actionDef.type}ElementNotFound`, { elementName: elementDef.name, selector: elementDef.selector }, 'error');
              testHasFailed = true; break;
            }

            if (actionDef.type === ActionType.CLICK) {
              targetElement.click();
              log('createTestPage.logs.clickSuccess', { elementName: elementDef.name, selector: elementDef.selector });
              await new Promise(resolve => setTimeout(resolve, 700)); 
              log('createTestPage.logs.clickActionCompletedUpdatingElements');
              handleDetectElements(); 
            } else if (actionDef.type === ActionType.INPUT_TEXT) {
              if ('value' in targetElement) {
                (targetElement as HTMLInputElement | HTMLTextAreaElement).focus();
                (targetElement as HTMLInputElement | HTMLTextAreaElement).value = step.inputValue || '';
                targetElement.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                targetElement.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
                (targetElement as HTMLInputElement | HTMLTextAreaElement).blur();
                log('createTestPage.logs.inputTextSuccess', { value: step.inputValue, elementName: elementDef.name });
              } else {
                log('createTestPage.logs.errorInputElementNotInputField', { elementName: elementDef.name }, 'error');
                testHasFailed = true;
              }
            } else if (actionDef.type === ActionType.VERIFY_TEXT) {
              const actualText = ('value' in targetElement && (targetElement as HTMLInputElement).value !== undefined) ? (targetElement as HTMLInputElement).value : targetElement.textContent;
              if (actualText?.trim() === (step.inputValue || '').trim()) {
                log('createTestPage.logs.verifyTextSuccess', { expectedText: step.inputValue, elementName: elementDef.name }, 'success');
              } else {
                log('createTestPage.logs.verifyTextFailed', { elementName: elementDef.name, expectedText: step.inputValue, actualText: (actualText?.trim() || '') }, 'error');
                testHasFailed = true;
              }
            }
          } catch (e: any) {
            log(`createTestPage.logs.error${actionDef.type}InteractionFailed`, { elementName: elementDef.name, error: (e.message || String(e)) }, 'error');
            testHasFailed = true;
          }
          break;
        case ActionType.WAIT:
          const waitSeconds = parseFloat(step.inputValue || '1');
          if (isNaN(waitSeconds) || waitSeconds <= 0) {
            log('createTestPage.logs.waitActionInvalidValue', { value: step.inputValue }, 'warning');
            await new Promise(resolve => setTimeout(resolve, 1000));
            log('createTestPage.logs.waitCompleted', {seconds: 1});
          } else {
            log('createTestPage.logs.waitActionLog', { seconds: waitSeconds });
            await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
            log('createTestPage.logs.waitCompleted', { seconds: waitSeconds });
          }
          break;
        default: log('createTestPage.logs.unhandledActionType', undefined, 'warning');
      }
      
      if (testHasFailed) {
         log('createTestPage.logs.executionInterruptedCriticalError', undefined, 'error'); break;
      }
    }
    log(testHasFailed ? 'createTestPage.logs.testResultFailed' : 'createTestPage.logs.testResultSuccess', undefined, testHasFailed ? 'error' : 'success');
    log("createTestPage.logs.testExecutionCompleted");
    setIsRunningTest(false);
    setCurrentExecutingStepId(null);
  }, [testSteps, detectedElements, setIsRunningTest, log, t, iframeSrc, setIframeSrc, url, setUrl, handleDetectElements, isInternalTestPageLoaded, setIsInternalTestPageLoaded, isProxyEnabled, setElementDetectionError]);

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
    if (testToLoad.url === "internal://test-page") {
        srcToLoad = `data:text/html;charset=utf-8,${encodeURIComponent(INTERNAL_TEST_PAGE_HTML)}`;
        setIsInternalTestPageLoaded(true);
    } else if (testToLoad.url && (testToLoad.url.startsWith('http://') || testToLoad.url.startsWith('https://'))) {
        if (isProxyEnabled) {
            srcToLoad = `${PROXY_PREFIX}${encodeURIComponent(testToLoad.url)}`;
        } else {
            srcToLoad = testToLoad.url;
            setElementDetectionError(t('createTestPage.elementsPanel.externalPageNoProxyLimitations'));
        }
        setIsInternalTestPageLoaded(false);
    } else if (testToLoad.url) { 
        srcToLoad = testToLoad.url; // e.g. file:///
        setIsInternalTestPageLoaded(false);
        setElementDetectionError(t('createTestPage.elementsPanel.fileUrlLimitations'));
    }

    setIframeSrc(srcToLoad);
    setIsPagePreviewVisible(!!srcToLoad);
    
    setTestSteps(testToLoad.steps);
    setCurrentTestName(testToLoad.name);
    setCurrentTestId(testToLoad.id);
    setDetectedElements([]);
    
    let logKey = 'createTestPage.logs.testLoadedNoUrl';
    let params: Record<string,string|number|undefined> = { name: testToLoad.name };
    if (testToLoad.url === "internal://test-page") {
        logKey = 'createTestPage.logs.testLoadedInternal';
    } else if (testToLoad.url) {
        logKey = 'createTestPage.logs.testLoadedWithUrl'; 
        params.url = testToLoad.url;
    }
    log(logKey, params);
    setShowLoadModal(false);
  }, [setUrl, setIframeSrc, setIsPagePreviewVisible, setTestSteps, setCurrentTestName, setCurrentTestId, setDetectedElements, log, setIsInternalTestPageLoaded, setElementDetectionError, t, isProxyEnabled]);

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

    if (testToLoad.url === "internal://test-page") {
        srcToLoad = `data:text/html;charset=utf-8,${encodeURIComponent(INTERNAL_TEST_PAGE_HTML)}`;
        setIsInternalTestPageLoaded(true);
    } else if (testToLoad.url && (testToLoad.url.startsWith('http://') || testToLoad.url.startsWith('https://'))) {
        srcToLoad = testToLoad.url;
        setIsInternalTestPageLoaded(false);
    } else if (testToLoad.url) { 
        srcToLoad = testToLoad.url; // e.g. file:///
        setIsInternalTestPageLoaded(false);
        setElementDetectionError(t('createTestPage.elementsPanel.fileUrlLimitations'));
    }

    setIframeSrc(srcToLoad);
    setIsPagePreviewVisible(!!srcToLoad);
    
    setTestSteps(testToLoad.steps);
    setCurrentTestName(testToLoad.name);
    setCurrentTestId(testToLoad.id);
    setDetectedElements([]);
    
    let logKey = 'createTestPage.logs.testLoadedNoUrl';
    let params: Record<string,string|number|undefined> = { name: testToLoad.name };
    if (testToLoad.url === "internal://test-page") {
        logKey = 'createTestPage.logs.testLoadedInternal';
    } else if (testToLoad.url) {
        logKey = 'createTestPage.logs.testLoadedWithUrl'; 
        params.url = testToLoad.url;
    }
    log(logKey, params);
    setShowLoadModal(false);
  }, [setUrl, setIframeSrc, setIsPagePreviewVisible, setTestSteps, setCurrentTestName, setCurrentTestId, setDetectedElements, log, setIsInternalTestPageLoaded, setElementDetectionError, t]);

  return (
    <div className="flex flex-col h-full">
      <Header
        url={url}
        setUrl={setUrl}
        isLoadingPage={isLoadingPage}
        isRunningTest={isRunningTest}
        handleLoadUrl={handleLoadUrl}
        handleLoadInternalTestPage={handleLoadInternalTestPage}
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
          <div className={`flex-grow border-t-2 overflow-hidden ${theme === 'light' ? 'border-slate-300' : 'border-slate-700'}`}>
            <WebPreviewPanel 
                iframeSrc={iframeSrc} 
                actualLoadedUrl={url} 
                isPagePreviewVisible={isPagePreviewVisible} 
                executionLog={executionLog} 
                isRunningTest={isRunningTest} 
                isInternalTestPage={isInternalTestPageLoaded} 
                isProxyEnabled={isProxyEnabled} // Pass new prop
                onClearLog={handleClearExecutionLog} 
            />
          </div>
        </div>
        <ElementsPanel isDetectingElements={isDetectingElements} detectedElements={detectedElements} isPagePreviewVisible={isPagePreviewVisible} onDragStartElement={onDragStartElement} elementDetectionError={elementDetectionError} />
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
                    {test.url === "internal://test-page" ? t('createTestPage.loadModal.urlLabel', { url: t('general.internalTestPageName')}) : t('createTestPage.loadModal.urlLabel', { url: test.url || t('createTestPage.loadModal.notAvailableUrl')})} - {t('createTestPage.loadModal.stepsLabel', { count: test.steps.length })}
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
