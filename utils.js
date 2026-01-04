export async function resolveUserName() {
    let name = null;
    try {
        if (window.websim && typeof window.websim.getCurrentUser === 'function') {
            const current = await window.websim.getCurrentUser();
            if (current && current.username) name = String(current.username);
        }
    } catch (e) {
        console.warn('websim.getCurrentUser failed', e);
    }
    if (!name) {
        const urlName = new URLSearchParams(location.search).get('name');
        if (urlName) name = urlName;
    }
    return name || 'User';
}

import { translations } from './languages.js';

/**
 * detectLanguage()
 * - Attempts several methods to determine the user's preferred language:
 *   1) explicit URL param 'lang' or 'locale'
 *   2) localStorage previously chosen value
 *   3) window.websim.getCurrentUser().locale (if available)
 *   4) navigator.languages (first entry)
 *   5) navigator.language
 *   6) fallback to 'pt'
 * - Normalizes to supported codes: 'pt', 'en', 'es'
 * - Persists the detected value to localStorage and returns it.
 */
export async function detectLanguage() {
    try {
        // 1) URL params
        const params = new URLSearchParams(location.search);
        const paramLang = (params.get('lang') || params.get('locale') || '').toLowerCase();
        const mapCandidate = (s) => {
            if (!s) return null;
            if (s.startsWith('pt')) return 'pt';
            if (s.startsWith('es')) return 'es';
            if (s.startsWith('en')) return 'en';
            return null;
        };
        const fromParam = mapCandidate(paramLang);
        if (fromParam) {
            localStorage.setItem('apex_language', fromParam);
            return fromParam;
        }

        // 2) previously stored preference
        const stored = localStorage.getItem('apex_language');
        if (stored && ['pt', 'en', 'es'].includes(stored)) return stored;

        // 3) websim platform locale (if available)
        try {
            if (window.websim && typeof window.websim.getCurrentUser === 'function') {
                const current = await window.websim.getCurrentUser();
                const userLocale = (current && (current.locale || current.language)) || '';
                const mapped = mapCandidate(String(userLocale).toLowerCase());
                if (mapped) {
                    localStorage.setItem('apex_language', mapped);
                    return mapped;
                }
            }
        } catch (e) {
            // ignore platform failures
        }

        // 4) navigator.languages
        if (Array.isArray(navigator.languages) && navigator.languages.length > 0) {
            for (const lang of navigator.languages) {
                const mapped = mapCandidate(String(lang).toLowerCase());
                if (mapped) {
                    localStorage.setItem('apex_language', mapped);
                    return mapped;
                }
            }
        }

        // 5) navigator.language
        if (navigator.language) {
            const mapped = mapCandidate(String(navigator.language).toLowerCase());
            if (mapped) {
                localStorage.setItem('apex_language', mapped);
                return mapped;
            }
        }
    } catch (e) {
        console.warn('detectLanguage failed', e);
    }

    // final fallback to Portuguese
    localStorage.setItem('apex_language', 'pt');
    return 'pt';
}

/**
 * getLanguage()
 * - Synchronous accessor that returns stored language if present.
 * - If not present, triggers detection (best-effort, async) and returns a fallback until reload.
 * - Consumers that need immediate accurate language (e.g., startup) should call detectLanguage() directly.
 */
export function getLanguage() {
    const stored = localStorage.getItem('apex_language');
    if (stored && ['pt', 'en', 'es'].includes(stored)) return stored;
    // Trigger async detection but return a sensible default immediately
    // (startup code calls detectLanguage() explicitly when needed).
    detectLanguage().catch(() => {});
    return 'pt';
}

export function t(key, params = {}) {
    const lang = getLanguage();
    let text = translations[lang]?.[key] || translations['pt'][key] || key;
    
    for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{${k}}`, v);
    }
    return text;
}

export function getGreetingText() {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return t('greeting_morning');
    if (h >= 12 && h < 18) return t('greeting_afternoon');
    return t('greeting_evening');
}

export function setupMarked() {
    marked.setOptions({
        highlight: function(code, lang) {
            const language = hljs.getLanguage(lang) ? lang : 'lua';
            return hljs.highlight(code, { language }).value;
        },
        langPrefix: 'hljs language-'
    });
}