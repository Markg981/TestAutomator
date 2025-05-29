
import { SavedTest, TestStep } from '../types';

const STORAGE_KEY = 'visualTester_savedTests_v2';

export const saveTestToLocalStorage = (name: string, steps: TestStep[], url?: string): SavedTest => {
  const tests = loadAllTestsFromLocalStorage();
  const newTest: SavedTest = {
    id: Date.now().toString(),
    name,
    steps,
    createdAt: new Date().toISOString(),
    url,
  };
  tests.push(newTest);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tests));
  return newTest;
};

export const loadAllTestsFromLocalStorage = (): SavedTest[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    try {
      const parsedData = JSON.parse(data);
      // Basic validation: check if it's an array
      if (Array.isArray(parsedData)) {
        return parsedData.map(test => ({ // Ensure all fields exist
          ...test,
          steps: test.steps || [],
        }));
      }
      return [];
    } catch (error) {
      console.error("Error parsing saved tests from localStorage:", error);
      return [];
    }
  }
  return [];
};

export const deleteTestFromLocalStorage = (testId: string): void => {
  let tests = loadAllTestsFromLocalStorage();
  tests = tests.filter(test => test.id !== testId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tests));
};

export const updateTestInLocalStorage = (updatedTest: SavedTest): SavedTest | null => {
  const tests = loadAllTestsFromLocalStorage();
  const testIndex = tests.findIndex(test => test.id === updatedTest.id);
  if (testIndex > -1) {
    tests[testIndex] = updatedTest;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tests));
    return updatedTest;
  }
  return null;
};
