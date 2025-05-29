
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { GeminiGeneratedStep, ActionType } from '../types'; // Added ActionType

// API key must be obtained from process.env.API_KEY as per @google/genai guidelines.
// Assume this variable is pre-configured, valid, and accessible in the execution context.
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // This console warning is for developers, not end-users, so no translation needed here.
  console.warn("Gemini API key not found (expected in process.env.API_KEY). Natural language processing will not work.");
}

const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

const GEMINI_MODEL = 'gemini-2.5-flash-preview-04-17';

export const generateStepsFromNaturalLanguage = async (
  naturalLanguageInput: string,
  // availableActionsNames is now expected to be ActionType strings
  availableActionTypes: string[] 
): Promise<GeminiGeneratedStep[]> => {
  if (!ai) {
    // Error message will be translated by the caller
    throw new Error("Gemini API client not initialized. API key might be missing or invalid (expected in process.env.API_KEY).");
  }

  const actionListString = availableActionTypes.join(', ');

  // The prompt is for Gemini, so it remains in English.
  // It now instructs Gemini to use ActionType strings for actionName.
  const prompt = `
    You are an expert assistant that converts natural language instructions for web testing into a sequence of structured test steps.
    User instruction: "${naturalLanguageInput}"

    Available actions are: ${actionListString}. These are the exact strings you MUST use for the "actionName" field.

    Generate a JSON array of test step objects based on the user instruction. Each object in the array should conform to the following structure:
    {
      "actionName": "ACTION_TYPE_STRING", 
      "targetElementNameOrSelector": "COMMON_NAME_OF_ELEMENT or CSS_SELECTOR", 
      "inputValue": "VALUE_FOR_THE_ACTION" 
    }

    - "actionName" must be one of the available actions (e.g., "GOTO_URL", "CLICK").
    - "targetElementNameOrSelector" should be a common, human-readable name for an element (e.g., "Search button", "Username field") or a plausible CSS selector if a name is not obvious. This field is only required if the action needs a target element.
    - "inputValue" should be the value required by the action (e.g., a URL for "GOTO_URL", text for "INPUT_TEXT"). This field is only required if the action needs an input value.

    IMPORTANT: Respond ONLY with the JSON array. Do not include any other text, explanations, or markdown code fences around the JSON.
    The JSON should be a direct array of objects. For example:
    [
      { "actionName": "GOTO_URL", "inputValue": "https://www.google.com" },
      { "actionName": "INPUT_TEXT", "targetElementNameOrSelector": "Search input", "inputValue": "Playwright testing" },
      { "actionName": "CLICK", "targetElementNameOrSelector": "Search button" }
    ]
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
        }
    });
    
    let jsonStr = response.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }

    const parsedSteps = JSON.parse(jsonStr);
    if (Array.isArray(parsedSteps)) {
        // Validate that actionName is one of the ActionType strings
        return parsedSteps.filter(step => {
            if (step && typeof step.actionName === 'string' && availableActionTypes.includes(step.actionName)) {
                return true;
            }
            console.warn("Gemini returned an invalid or unknown actionName:", step.actionName);
            return false;
        }) as GeminiGeneratedStep[];
    }
    // This console error is for developers.
    console.error("Gemini response was not a JSON array:", parsedSteps);
    return [];

  } catch (error) {
    // This console error is for developers.
    console.error("Error calling Gemini API or parsing response:", error);
    // Generic error message, to be translated by the caller.
    let errorMessage = "Failed to generate steps from natural language.";
    if (error instanceof Error) {
        errorMessage += ` Details: ${error.message}`; // Keep details in English for dev debugging
    }
    throw new Error(errorMessage);
  }
};
