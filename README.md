# Visual Web Test Automator

A web application for visual test automation of web applications, with a focus on Angular/SPA applications hosted on localhost with dynamic ports.

## Project Structure

The project is split into two main parts:

### Frontend (React/TypeScript)
- User interface for test creation and management
- Visual element selection and test step configuration
- Test execution monitoring
- Test management (save, load, edit, delete)

### Backend (Node.js/Express/Playwright)
- Browser automation with Playwright
- Element detection and interaction
- Screenshot capture
- Test execution
- SQLite database for test storage

## Setup

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The backend server will start on http://localhost:3001

### Frontend Setup
1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

The frontend application will start on http://localhost:5173

## Features

- **Page Loading**: Load any web page for testing, including localhost SPAs
- **Element Detection**: Automatically detect and highlight interactive elements
- **Test Creation**: Create tests by selecting elements and configuring actions
- **Test Management**: Save, load, edit, and delete tests
- **Visual Feedback**: Screenshots and visual highlighting of elements and actions
- **Test Execution**: Run saved tests with visual feedback

## API Endpoints

### Session Management
- `POST /api/session/load`: Load a web page
- `DELETE /api/session/:sessionId`: Close a session

### Element Detection
- `GET /api/session/:sessionId/elements`: Get all interactive elements
- `GET /api/session/:sessionId/element-screenshot`: Get screenshot of specific element

### Test Management
- `GET /api/tests`: Get all saved tests
- `POST /api/tests`: Save a new test
- `PUT /api/tests/:testId`: Update an existing test
- `DELETE /api/tests/:testId`: Delete a test

### Test Execution
- `POST /api/session/:sessionId/execute`: Execute a test sequence

## Development

### Backend Development
The backend is built with:
- Node.js and Express for the API server
- Playwright for browser automation
- SQLite for test storage
- TypeScript for type safety

### Frontend Development
The frontend is built with:
- React for UI components
- TypeScript for type safety
- Fetch API for backend communication
- Material-UI for styling

## Notes

- The backend handles all browser interaction to avoid CORS issues
- Tests are stored in a SQLite database for persistence
- Screenshots and element information are transferred as base64 strings
- The backend maintains session state for each test run
