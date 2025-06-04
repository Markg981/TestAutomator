import { Router } from 'express';
import { saveTest, getAllTests, deleteTest, updateTest } from '../services/database';
import type { SavedTest } from '../services/database';

const router = Router();

// Get all tests (publicly accessible)
router.get('/', (req, res) => {
  try {
    const tests = getAllTests();
    res.json({ tests }); // Ensure the response is { tests: [...] }
  } catch (error) {
    console.error('Error getting tests:', error);
    res.status(500).json({ error: 'Failed to get tests' });
  }
});

// Save a new test (protected)
router.post('/', (req, res) => {
  try {
    const { name, steps, url } = req.body;
    if (!name || !Array.isArray(steps)) {
      return res.status(400).json({ error: 'Name and steps array are required' });
    }
    const test = saveTest(name, steps, url);
    res.status(201).json({ test });
  } catch (error) {
    console.error('Error saving test:', error);
    res.status(500).json({ error: 'Failed to save test' });
  }
});

// Update an existing test (protected)
router.put('/:testId', (req, res) => {
  try {
    const test = req.body as SavedTest;
    const updatedTest = updateTest(test);
    if (!updatedTest) {
      return res.status(404).json({ error: 'Test not found' });
    }
    res.json({ test: updatedTest });
  } catch (error) {
    console.error('Error updating test:', error);
    res.status(500).json({ error: 'Failed to update test' });
  }
});

// Delete a test (protected)
router.delete('/:testId', (req, res) => {
  try {
    const { testId } = req.params;
    deleteTest(testId);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting test:', error);
    res.status(500).json({ error: 'Failed to delete test' });
  }
});

export default router; 