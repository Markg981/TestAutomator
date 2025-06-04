import { SavedTest, TestStep } from '../types';
import { apiService } from './apiService';

export const saveTestToLocalStorage = async (name: string, steps: TestStep[], url?: string): Promise<SavedTest> => {
  return apiService.saveTest(name, steps, url);
};

export const loadAllTestsFromLocalStorage = async (): Promise<SavedTest[]> => {
  return apiService.getAllTests();
};

export const deleteTestFromLocalStorage = async (testId: string): Promise<void> => {
  return apiService.deleteTest(testId);
};

export const updateTestInLocalStorage = async (updatedTest: SavedTest): Promise<SavedTest | null> => {
  return apiService.updateTest(updatedTest);
};
