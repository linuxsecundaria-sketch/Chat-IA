/*
  title-ai.js
  - Provides generateTitle(context) that calls a separate model to produce a short, focused chat title.
  - Title API key is stored only in memory via setTitleApiKey(key).
  - The request sends only the minimal context (single user message) and uses small max_tokens to keep response short.
  - This improved prompt explicitly instructs the model to:
      - output a concise, specific title (2-5 words),
      - prefer nouns/short noun phrases, not full sentences,
      - preserve the user's language,
      - avoid punctuation, emojis, or extra commentary,
      - fall back to "New Chat" when insufficient context.
*/

let TITLE_API_KEY = ''; // kept only in-memory; set via setTitleApiKey at runtime if needed

export function setTitleApiKey(key) {
    TITLE_API_KEY = String(key || '');
}

/**
 * generateTitle(contextText)
 * - contextText: string (the first user message or brief file hint)
 * - returns a short title string or 'New Chat' on failure
 */
export async function generateTitle(contextText) {
    try {
        // Trim and normalize context to a single line for the title prompt
        const ctx = (String(contextText || '').replace(/\s+/g, ' ')).slice(0, 800);

        const payload = {
            model: "xiaomi/mimo-v2-flash:free",
            messages: [
                {
                    role: "system",
                    content: [
                        "You are a focused title generator. Given a short user context, produce a highly specific chat title.",
                        "Usage note for the model: You are invoked programmatically by the app to produce a short title only — you will NOT be spoken to directly by end users. The app will send a concise context (sometimes a short message or a file hint); do not ask follow-up questions, do not prompt the user, and do not expect interactive replies. Generate the final title based solely on the provided context.",
                        "Requirements:",
                        "- Output a concise title: prefer 2-5 words (no more than 5).",
                        "- Use a short noun or noun-phrase (e.g., 'Lua Parser', 'Optimize SQL Query', 'Bug: NullPointer').",
                        "- Preserve the language of the user's context.",
                        "- Do NOT output sentences, punctuation at the ends, explanations, quotes, or emojis.",
                        "- Do NOT include the words 'chat', 'conversation', or 'new'.",
                        "- If the context is ambiguous or empty, return exactly: New Chat",
                        "- Examples of desired outputs based on context:",
                        "  * For a Roblox services discussion -> Serviços do Roblox",
                        "  * For asking how to greet in Portuguese -> Saudação em português",
                        "  * For a request to write a love story -> História de amor",
                        "  * For explaining the meaning of a word -> Significado de Cool",
                        "  * For summarizing months range -> Meses de Novembro a Dezembro",
                        "Return ONLY the title text, nothing else."
                    ].join(' ')
                },
                { role: "user", content: ctx }
            ],
            max_tokens: 28,
            temperature: 0.2
        };

        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${TITLE_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "",
                "X-Title": ""
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            console.warn('title-ai non-ok', res.status);
            return 'New Chat';
        }

        const data = await res.json();
        const content = (data?.choices?.[0]?.message?.content) || data?.choices?.[0]?.text || '';
        let title = String(content || '').split(/\r?\n/)[0].trim();

        if (!title) return 'New Chat';

        // Strip surrounding quotes, trim, and remove trailing punctuation
        title = title.replace(/^"+|"+$/g, '').trim();
        title = title.replace(/[.!?;:,]+$/g, '').trim();

        // Enforce length constraints client-side: keep first up to 5 words
        const words = title.split(/\s+/).slice(0, 5);
        const finalTitle = words.join(' ').trim();

        return finalTitle || 'New Chat';
    } catch (e) {
        console.warn('generateTitle error', e);
        return 'New Chat';
    }
}