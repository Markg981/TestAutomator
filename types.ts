import { ReactNode } from 'react';

export enum Page {
  DASHBOARD = 'DASHBOARD',
  CREATE_TEST = 'CREATE_TEST',
  SETTINGS = 'SETTINGS',
  RECORD_TEST = 'RECORD_TEST', 
}

export enum ActionType {
  GOTO_URL = 'GOTO_URL',
  INPUT_TEXT = 'INPUT_TEXT',
  CLICK = 'CLICK',
  WAIT = 'WAIT',
  VERIFY_TEXT = 'VERIFY_TEXT',
  SCROLL_TO_ELEMENT = 'SCROLL_TO_ELEMENT',
  TAKE_SCREENSHOT = 'TAKE_SCREENSHOT',
}

export interface ActionDefinition {
  id: string; // Unique ID for the action definition (e.g., "ACT_GOTO_URL")
  nameKey: string; // Translation key for the action's display name (e.g., "actionNames.GOTO_URL")
  type: ActionType; // The canonical type of the action
  requiresElement: boolean;
  requiresValue: boolean;
  valuePlaceholder?: string; // Can be a translation key or literal
  icon?: ReactNode;
}

export interface DetectedElement {
  id: string;
  name: string;
  tagName: string;
  selector: string;
  attributes: Record<string, any>; 
  text?: string;
  boundingBox?: { 
    x: number;
    y: number;
    width: number;
    height: number;
  }; 
}

export interface TestStep {
  id: string;
  actionId: string; // ID of the ActionDefinition (e.g. "ACT_GOTO_URL")
  targetElementId?: string; 
  targetElementName?: string; 
  inputValue?: string;
  comment?: string; 
}

export interface SavedTest {
  id: string;
  name: string;
  steps: TestStep[];
  createdAt: string;
  url?: string; 
}

export enum ItemTypes {
  ACTION = 'ACTION_ITEM',
  ELEMENT = 'ELEMENT_ITEM',
  TEST_STEP = 'TEST_STEP_ITEM',
}

export interface DragItem {
  type: ItemTypes;
  id: string; 
  payload?: any; 
}

export interface GeminiGeneratedStep {
  actionName: string; // Will be an ActionType string value, e.g., "GOTO_URL"
  targetElementNameOrSelector?: string; 
  inputValue?: string; 
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: string;
}
