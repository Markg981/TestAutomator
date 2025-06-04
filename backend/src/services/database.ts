import Database from 'better-sqlite3';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';

export interface TestStep {
  actionType: string;
  selector?: string;
  value?: string;
  description?: string;
}

export interface SavedTest {
  id: string;
  name: string;
  url?: string;
  steps: TestStep[];
  createdAt: string;
  updatedAt: string;
}

interface DBTest {
  id: string;
  name: string;
  url: string | null;
  created_at: string;
  updated_at: string;
}

interface DBTestStep {
  id: number;
  test_id: string;
  step_order: number;
  action_type: string;
  selector: string | null;
  value: string | null;
  description: string | null;
}

// Database initialization
const dbPath = join(__dirname, '../../data/tests.sqlite');
const dbDir = join(__dirname, '../../data');

let db: Database.Database;

try {
  // Create data directory if it doesn't exist
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(dbPath);

  // Initialize database with required tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS tests (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS test_steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_id TEXT NOT NULL,
      step_order INTEGER NOT NULL,
      action_type TEXT NOT NULL,
      selector TEXT,
      value TEXT,
      description TEXT,
      FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE
    );
  `);

  // Enable foreign key support
  db.pragma('foreign_keys = ON');
} catch (error) {
  console.error('Error initializing database:', error);
  throw new Error('Database initialization failed');
}

export const saveTest = (name: string, steps: TestStep[], url?: string): SavedTest => {
  try {
    const id = Date.now().toString();
    const now = new Date().toISOString();

    const insertTest = db.prepare<[string, string, string | null, string, string]>(`
      INSERT INTO tests (id, name, url, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertStep = db.prepare<[string, number, string, string | null, string | null, string | null]>(`
      INSERT INTO test_steps (test_id, step_order, action_type, selector, value, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    db.transaction(() => {
      insertTest.run(id, name, url || null, now, now);
      steps.forEach((step, index) => {
        insertStep.run(id, index, step.actionType, step.selector || null, step.value || null, step.description || null);
      });
    })();

    return {
      id,
      name,
      url,
      steps,
      createdAt: now,
      updatedAt: now
    };
  } catch (error) {
    console.error('Error in saveTest:', error);
    throw new Error('Failed to save test');
  }
};

export const getAllTests = (): SavedTest[] => {
  try {
    const tests = db.prepare<[], DBTest>('SELECT * FROM tests ORDER BY created_at DESC').all() as DBTest[];
    const stepsStmt = db.prepare<[string], DBTestStep>('SELECT * FROM test_steps WHERE test_id = ? ORDER BY step_order');

    return tests.map(test => {
      const steps = stepsStmt.all(test.id) as DBTestStep[];
      return {
        id: test.id,
        name: test.name,
        url: test.url || undefined,
        createdAt: test.created_at,
        updatedAt: test.updated_at,
        steps: steps.map(step => ({
          actionType: step.action_type,
          selector: step.selector || undefined,
          value: step.value || undefined,
          description: step.description || undefined
        }))
      };
    });
  } catch (error) {
    console.error('Error in getAllTests:', error);
    throw new Error('Failed to get tests');
  }
};

export const deleteTest = (testId: string): void => {
  try {
    const deleteSteps = db.prepare<[string]>('DELETE FROM test_steps WHERE test_id = ?');
    const deleteTest = db.prepare<[string]>('DELETE FROM tests WHERE id = ?');

    db.transaction(() => {
      deleteSteps.run(testId);
      deleteTest.run(testId);
    })();
  } catch (error) {
    console.error('Error in deleteTest:', error);
    throw new Error('Failed to delete test');
  }
};

export const updateTest = (test: SavedTest): SavedTest | null => {
  try {
    const updateTestStmt = db.prepare<[string, string | null, string, string]>(`
      UPDATE tests 
      SET name = ?, url = ?, updated_at = ?
      WHERE id = ?
    `);

    const deleteSteps = db.prepare<[string]>('DELETE FROM test_steps WHERE test_id = ?');
    const insertStep = db.prepare<[string, number, string, string | null, string | null, string | null]>(`
      INSERT INTO test_steps (test_id, step_order, action_type, selector, value, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();

    db.transaction(() => {
      const result = updateTestStmt.run(test.name, test.url || null, now, test.id);
      if (result.changes === 0) return null;

      deleteSteps.run(test.id);
      test.steps.forEach((step, index) => {
        insertStep.run(test.id, index, step.actionType, step.selector || null, step.value || null, step.description || null);
      });
    })();

    return {
      ...test,
      updatedAt: now
    };
  } catch (error) {
    console.error('Error in updateTest:', error);
    throw new Error('Failed to update test');
  }
}; 