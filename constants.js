export const API_KEY = "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";
export const API_URL = "https://openrouter.ai/api/v1/chat/completions";
export const MODEL = "xiaomi/mimo-v2-flash:free";
// How many messages to keep in a conversation history (per chat).
// Keep this reasonably large by default; it's unrelated to number of saved chats.
export const MAX_HISTORY = 1000; // context memory limit (number of messages kept in conversation history)

// Sessions (saved chats) maximum: set to Infinity to allow unlimited saved chats.
// This explicitly documents that there is no cap on the number of chats a user can create.
export const SESSIONS_MAX = Infinity;

// Maximum tokens allowed for AI responses (adjusted per user request)
// This limit is automatically reset and applied to every new request.
export const RESPONSE_MAX_TOKENS = 180000; 
// Adjusted response token limit per user request.
// If you need even larger transfers, consider streaming/file upload separately.
export const MAX_FILE_CHARS = 1000000;