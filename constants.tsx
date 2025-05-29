import React from 'react';
import { ActionDefinition, ActionType, DetectedElement } from './types';

// SVG Icons as React Components
export const IconLink = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-2" {...props}>
    <path fillRule="evenodd" d="M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.976-1.138 2.5 2.5 0 01-.142-3.665l3-3z" clipRule="evenodd" />
    <path fillRule="evenodd" d="M8.603 3.799a4.002 4.002 0 00-5.656 5.656l1.225 1.224a.75.75 0 001.061-1.06l-1.224-1.224a2.5 2.5 0 013.536-3.536l3 3a2.5 2.5 0 01-.225 3.855.75.75 0 00.976 1.138 4.002 4.002 0 00-.225-5.865l-3-3z" clipRule="evenodd" />
  </svg>
);
export const IconKeyboard = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-2" {...props}>
    <path fillRule="evenodd" d="M18 5H2a1 1 0 00-1 1v8a1 1 0 001 1h16a1 1 0 001-1V6a1 1 0 00-1-1zM2 7.5V6h16v1.5H2zm0 1.5h16V14H2V9zm12.5 2a.5.5 0 000-1h-2a.5.5 0 000 1h2zM10 11.5a.5.5 0 01-.5.5h-2a.5.5 0 010-1h2a.5.5 0 01.5.5zM6 11a.5.5 0 000 1H4a.5.5 0 000-1h2zm1.5-2a.5.5 0 01-.5.5h-2a.5.5 0 010-1h2a.5.5 0 01.5.5zm3.5.5a.5.5 0 00-.5-.5h-2a.5.5 0 000 1h2a.5.5 0 00.5-.5zm3.5-.5a.5.5 0 00-.5-.5h-2a.5.5 0 000 1h2a.5.5 0 00.5-.5z" clipRule="evenodd" />
  </svg>
);
export const IconClick = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-2" {...props}>
    <path d="M2.504 3.276A21.56 21.56 0 001.406 5.532C1.063 6.404 1 7.438 1 8.5c0 3.866 3.134 7 7 7s7-3.134 7-7c0-1.062-.063-2.096-.406-2.968a21.573 21.573 0 00-1.098-2.256 1.5 1.5 0 00-2.312-.755l-2.68 1.34a.75.75 0 01-.916 0l-2.68-1.34a1.5 1.5 0 00-2.312.755z" />
    <path d="M12.56 10.034a.75.75 0 00-1.12 0L10 11.476l-1.44-1.442a.75.75 0 00-1.12 1.06l1.762 1.763a.75.75 0 001.12 0l1.762-1.763a.75.75 0 000-1.06z" />
  </svg>
);
export const IconWait = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-2" {...props}>
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" />
  </svg>
);
export const IconVerify = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-2" {...props}>
    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
  </svg>
);

export const AVAILABLE_ACTIONS: ActionDefinition[] = [
  { id: 'ACT_GOTO_URL', nameKey: `createTestPage.actionNames.${ActionType.GOTO_URL}`, type: ActionType.GOTO_URL, requiresElement: false, requiresValue: true, valuePlaceholder: 'https://example.com', icon: <IconLink /> },
  { id: 'ACT_INPUT_TEXT', nameKey: `createTestPage.actionNames.${ActionType.INPUT_TEXT}`, type: ActionType.INPUT_TEXT, requiresElement: true, requiresValue: true, valuePlaceholder: 'createTestPage.testStepCard.valuePlaceholderGeneric', icon: <IconKeyboard /> },
  { id: 'ACT_CLICK', nameKey: `createTestPage.actionNames.${ActionType.CLICK}`, type: ActionType.CLICK, requiresElement: true, requiresValue: false, icon: <IconClick /> },
  { id: 'ACT_WAIT', nameKey: `createTestPage.actionNames.${ActionType.WAIT}`, type: ActionType.WAIT, requiresElement: false, requiresValue: true, valuePlaceholder: 'createTestPage.testStepCard.valuePlaceholderGeneric', icon: <IconWait /> },
  { id: 'ACT_VERIFY_TEXT', nameKey: `createTestPage.actionNames.${ActionType.VERIFY_TEXT}`, type: ActionType.VERIFY_TEXT, requiresElement: true, requiresValue: true, valuePlaceholder: 'createTestPage.testStepCard.valuePlaceholderGeneric', icon: <IconVerify /> },
];

export const getActionDefinition = (actionId: string): ActionDefinition | undefined => {
  return AVAILABLE_ACTIONS.find(a => a.id === actionId);
};

// Mock data - these are not translated as they represent actual element data
export const MOCK_DETECTED_ELEMENTS_GOOGLE: DetectedElement[] = [
  { id: 'el_google_search_input', name: 'Google Search Input', tagName: 'INPUT', attributes: { name: 'q', type: 'text' }, selector: 'input[name="q"]' },
  { id: 'el_google_search_button', name: 'Google Search Button', tagName: 'INPUT', attributes: { name: 'btnK', type: 'submit' }, selector: 'input[name="btnK"]' },
  { id: 'el_google_feeling_lucky', name: 'Google I\'m Feeling Lucky Button', tagName: 'INPUT', attributes: { name: 'btnI', type: 'submit' }, selector: 'input[name="btnI"]' },
  { id: 'el_gmail_link', name: 'Gmail Link', tagName: 'A', attributes: { 'data-pid': '23' }, selector: 'a[data-pid="23"]' },
];

export const MOCK_ELEMENTS_GOOGLE_DYNAMIC: DetectedElement[] = [
  { id: 'el_google_result_stats', name: 'Google Result Stats', tagName: 'DIV', attributes: { id: 'result-stats' }, selector: '#result-stats' },
  { id: 'el_google_first_result_link', name: 'Google First Result Link', tagName: 'A', attributes: {}, selector: 'div#rso > div:first-child a > h3' },
];


export const MOCK_DETECTED_ELEMENTS_EXAMPLE: DetectedElement[] = [
    { id: 'el_example_heading', name: 'Example Domain Heading', tagName: 'H1', attributes: {}, selector: 'h1' },
    { id: 'el_example_link', name: 'More Information Link', tagName: 'A', attributes: { href: 'https://www.iana.org/domains/example' }, selector: 'p > a' },
];

export const MOCK_ELEMENTS_GENERIC_MODAL: DetectedElement[] = [
  { id: 'el_modal_title_generic', name: 'Generic Modal Title', tagName: 'H2', attributes: { class: 'modal-title' }, selector: '.modal-title' },
  { id: 'el_modal_confirm_button_generic', name: 'Generic Modal Confirm Button', tagName: 'BUTTON', attributes: {}, selector: 'button.modal-confirm' },
  { id: 'el_modal_cancel_button_generic', name: 'Generic Modal Cancel Button', tagName: 'BUTTON', attributes: {}, selector: 'button.modal-cancel' },
];

export const MOCK_DETECTED_ELEMENTS_ANGULAR_APP: DetectedElement[] = [
  { id: 'el_gstd_wizard_title', name: 'GSTD Wizard Title', tagName: 'H2', attributes: { class: 'gstd-wizard-title' }, selector: 'h2.gstd-wizard-title' },
  { id: 'el_date_d_button', name: 'Date Range D Button', tagName: 'BUTTON', attributes: {}, selector: 'button[data-testid="date-range-d"]' }, 
  { id: 'el_date_3d_button', name: 'Date Range 3D Button', tagName: 'BUTTON', attributes: {}, selector: 'button[data-testid="date-range-3d"]' },
  { id: 'el_date_w_button', name: 'Date Range W Button', tagName: 'BUTTON', attributes: {}, selector: 'button[data-testid="date-range-w"]' },
  { id: 'el_date_m_button', name: 'Date Range M Button', tagName: 'BUTTON', attributes: {}, selector: 'button[data-testid="date-range-m"]' },
  { id: 'el_date_y_button', name: 'Date Range Y Button', tagName: 'BUTTON', attributes: {}, selector: 'button[data-testid="date-range-y"]' },
  { id: 'el_calendar_button', name: 'Calendar Button', tagName: 'BUTTON', attributes: { 'aria-label': 'Open calendar' }, selector: 'button[aria-label="Open calendar"]' },
  { id: 'el_prev_date_button', name: 'Previous Date Button', tagName: 'BUTTON', attributes: { 'aria-label': 'Previous period' }, selector: 'button[aria-label="Previous period"]' },
  { id: 'el_next_date_button', name: 'Next Date Button', tagName: 'BUTTON', attributes: { 'aria-label': 'Next period' }, selector: 'button[aria-label="Next period"]' },
  { id: 'el_date_display', name: 'Date Display', tagName: 'SPAN', attributes: { class: 'date-display' }, selector: 'span.date-display' },
  { id: 'el_asterisk_button', name: 'Asterisk Button', tagName: 'BUTTON', attributes: {}, selector: 'button[data-testid="asterisk-button"]' },
  { id: 'el_c_button', name: 'C Button', tagName: 'BUTTON', attributes: {}, selector: 'button[data-testid="c-button"]' },
  { id: 'el_refresh_button', name: 'Refresh Button', tagName: 'BUTTON', attributes: {}, selector: 'button[data-testid="gstd-refresh-button"]' },
  { id: 'el_reset_button', name: 'Reset Button', tagName: 'BUTTON', attributes: {}, selector: 'button[data-testid="gstd-reset-button"]' },
  { id: 'el_new_button', name: 'New Button', tagName: 'BUTTON', attributes: {}, selector: 'button[data-testid="gstd-new-button"]' }, 
  { id: 'el_export_actions_button', name: 'Export Actions Button', tagName: 'BUTTON', attributes: {}, selector: 'button[data-testid="gstd-export-actions-button"]' },
  { id: 'el_secondary_export_button', name: 'Secondary Export Button', tagName: 'BUTTON', attributes: { 'aria-label': 'Export data'}, selector: 'button[aria-label="Export data"]' },
];

export const MOCK_ELEMENTS_ANGULAR_MODAL: DetectedElement[] = [
  { id: 'el_angular_modal_close_button', name: 'Angular Modal Close Button', tagName: 'BUTTON', attributes: { 'aria-label': 'Close modal' }, selector: '.modal-header button[aria-label="Close"]' },
  { id: 'el_angular_modal_header', name: 'Angular App Modal Header', tagName: 'DIV', attributes: { class: 'modal-header' }, selector: '.modal-header h5.modal-title' },
  { id: 'el_angular_modal_body', name: 'Angular Modal Body Content', tagName: 'DIV', attributes: { class: 'modal-body' }, selector: '.modal-body' },
  { id: 'el_angular_modal_tablist', name: 'Angular Modal Tab List', tagName: 'UL', attributes: { role: 'tablist', class: 'nav nav-tabs' }, selector: '.modal-body ul.nav-tabs[role="tablist"]' },
  { id: 'el_angular_modal_tab_1_button', name: 'Angular Modal Tab 1', tagName: 'BUTTON', attributes: { role: 'tab', 'data-bs-target': '#tab1-pane' }, selector: 'button#tab1-tab[role="tab"]' },
  { id: 'el_angular_modal_tab_2_button', name: 'Angular Modal Tab 2', tagName: 'BUTTON', attributes: { role: 'tab', 'data-bs-target': '#tab2-pane' }, selector: 'button#tab2-tab[role="tab"]' },
  { id: 'el_angular_modal_tab_3_button', name: 'Angular Modal Tab 3', tagName: 'BUTTON', attributes: { role: 'tab', 'data-bs-target': '#tab3-pane' }, selector: 'button#tab3-tab[role="tab"]' },
  { id: 'el_angular_modal_tabpanel_1_content', name: 'Angular Modal Tab Panel 1 Content', tagName: 'DIV', attributes: { role: 'tabpanel', id: 'tab1-pane', class: 'tab-pane fade show active' }, selector: 'div#tab1-pane.active[role="tabpanel"]' },
  { id: 'el_angular_modal_tab1_input_field', name: 'Angular Modal Tab 1 - Input', tagName: 'INPUT', attributes: { type: 'text', name: 'tab1Input' }, selector: 'div#tab1-pane.active input[name="tab1Input"]' },
  { id: 'el_angular_modal_tab1_checkbox', name: 'Angular Modal Tab 1 - Checkbox', tagName: 'INPUT', attributes: { type: 'checkbox', name: 'tab1Checkbox' }, selector: 'div#tab1-pane.active input[name="tab1Checkbox"]' },
  { id: 'el_angular_modal_main_input_field', name: 'Angular App Modal Main Input', tagName: 'INPUT', attributes: { type: 'text', name: 'modalInput' }, selector: '.modal-body input[name="modalInput"]' }, 
  { id: 'el_angular_modal_footer', name: 'Angular Modal Footer', tagName: 'DIV', attributes: { class: 'modal-footer' }, selector: '.modal-footer' },
  { id: 'el_angular_modal_cancel_button', name: 'Angular Modal Cancel Button', tagName: 'BUTTON', attributes: { class: 'btn-secondary' }, selector: '.modal-footer button.btn-secondary' },
  { id: 'el_angular_modal_save_button', name: 'Angular App Modal Save Button', tagName: 'BUTTON', attributes: { class: 'btn-primary' }, selector: '.modal-footer button.btn-primary' },
];
