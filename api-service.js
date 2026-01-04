import { API_KEY, API_URL, MODEL, RESPONSE_MAX_TOKENS } from './constants.js';

async function readResponseBodySafe(resp) {
    try {
        const text = await resp.text();
        return text || null;
    } catch (e) {
        return null;
    }
}

export async function* streamChat(messages, signal) {
    const response = await fetch(API_URL, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${API_KEY}`,
            // Optional headers used by openrouter for ranking / attribution
            "HTTP-Referer": "",
            "X-Title": "",
            "Content-Type": "application/json"
        },
        signal,
        body: JSON.stringify({
            model: MODEL,
            messages,
            stream: true,
            max_tokens: RESPONSE_MAX_TOKENS
        })
    });

    if (!response.ok) {
        const bodyText = await readResponseBodySafe(response);
        // include status and any body text for better diagnostics
        throw new Error(`API error: ${response.status}${bodyText ? ' - ' + bodyText.slice(0, 1000) : ''}`);
    }

    // If the response is not streamed (no body), handle gracefully
    if (!response.body) {
        const bodyText = await readResponseBodySafe(response);
        throw new Error(`API returned no body${bodyText ? ' - ' + bodyText.slice(0, 1000) : ''}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let partial = '';

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        partial += decoder.decode(value, { stream: true });
        
        const lines = partial.split(/\r?\n/);
        partial = lines.pop();

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === 'data: [DONE]') continue;
            if (trimmed.startsWith('data: ')) {
                try {
                    const parsed = JSON.parse(trimmed.slice(6));
                    const delta = parsed.choices?.[0]?.delta || {};
                    const content = delta.content || parsed.choices?.[0]?.text || '';
                    if (content) yield { type: 'content', content: content };
                } catch (e) {
                    // ignore individual parse errors but continue streaming
                }
            }
        }
    }
}