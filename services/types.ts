export interface SavedTest {
  id: string;
  name: string;
  steps: TestStep[];
  createdAt: string;
  url?: string;
}

export interface TestStep {
  id: string;
  actionId: string;
  targetElementId?: string;
  targetElementName?: string;
  inputValue?: string;
  comment?: string;
} 