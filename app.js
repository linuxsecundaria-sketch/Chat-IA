import { API_KEY, MAX_HISTORY, MAX_FILE_CHARS } from './constants.js';
import { resolveUserName, getGreetingText, setupMarked, t } from './utils.js';
import { renderFileChips, createMessageWrapper, createCopyButton, createEditButton, injectCodeCopyButtons, applyShowMoreToBubble } from './chat-ui.js';
import { notify } from './notifications.js';
import { streamChat } from './api-service.js';
import { generateTitle, setTitleApiKey } from './title-ai.js';
import { renderChatList } from './chats.js';

const chatWindow = document.getElementById('chat-window');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const fileInput = document.getElementById('file-input');
const dropZone = document.getElementById('drop-zone');
const sendBtn = document.getElementById('send-btn');
const editIndicator = document.getElementById('edit-indicator');
const cancelEditBtn = document.getElementById('cancel-edit-btn');

let attachedFiles = [];
let isSending = false;
let currentAbortController = null;
let editingSession = null;
let currentChatId = null;

function getSystemPrompt() {
    const nickname = localStorage.getItem('apex_user_nickname') || '';
    const occupation = localStorage.getItem('apex_user_occupation') || '';
    const instructions = localStorage.getItem('apex_user_instructions') || '';

    let aiTraits = [];
    try {
        aiTraits = JSON.parse(localStorage.getItem('apex_ai_characteristics')) || [];
    } catch (e) {
        aiTraits = [];
    }

    // Base persona and instructions
    const baseLines = [
        "You are a helpful, general-purpose assistant capable of assisting with any task.",
        "Be clear, concise, and helpful; prefer safe, ethical guidance; adapt to the user's language and tone;",
        "Provide practical, actionable answers and examples when appropriate."
    ];

    // If user supplied AI characteristics, append as a single sentence.
    if (aiTraits.length > 0) {
        baseLines.push(`Your specific personality traits and behaviors are: ${aiTraits.join(', ')}. Please embody these characteristics consistently in your responses.`);
    }

    // Personalization (optional): nickname, occupation, additional instructions
    const personalLines = [];
    if (nickname) {
        personalLines.push(`The user's name/nickname is ${nickname}. Please address them by this name when appropriate.`);
    }
    if (occupation) {
        personalLines.push(`The user's occupation/role is: ${occupation}. Tailor your professional context accordingly.`);
    }
    if (instructions) {
        personalLines.push(`Follow these custom user instructions: ${instructions}`);
    }

    // Compose final prompt text
    const finalPrompt = [...baseLines, ...personalLines].join(' ');
    return finalPrompt;
}

let conversationHistory = [
    { role: "system", content: getSystemPrompt() }
];

setupMarked();
setTitleApiKey(API_KEY);

const sessionsContainer = document.getElementById('sessions-container');
const chatListView = document.getElementById('chat-list-view');
const emptySessions = document.getElementById('empty-sessions');

// Persistence Layer
const STORAGE_KEY = 'apex_ai_grok_sessions';

function getSessions() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) {
        return [];
    }
}

import { SESSIONS_MAX } from './constants.js';

function saveSession(id, title, history) {
    const sessions = getSessions();
    const existingIndex = sessions.findIndex(s => s.id === id);
    const sessionData = {
        id,
        title: title || 'New Chat',
        history,
        updatedAt: Date.now()
    };

    if (existingIndex > -1) {
        // Replace the existing entry and move it to the front (most-recent)
        sessions.splice(existingIndex, 1);
        sessions.unshift(sessionData);
    } else {
        sessions.unshift(sessionData);
    }

    // Ensure we do NOT enforce an artificial cap on number of saved chats.
    // If SESSIONS_MAX is finite, trim older sessions beyond the limit; otherwise keep all.
    if (Number.isFinite(SESSIONS_MAX)) {
        if (sessions.length > SESSIONS_MAX) {
            sessions.length = SESSIONS_MAX; // keep newest SESSIONS_MAX entries
        }
    }

    // Persist sorted list (most-recent first)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}





function loadChat(id) {
    const sessions = getSessions();
    const session = sessions.find(s => s.id === id);
    if (!session) return;

    // Reset current UI
    try { if (currentAbortController) currentAbortController.abort(); } catch (e) {}
    chatWindow.innerHTML = '';
    currentChatId = id;
    conversationHistory = session.history;
    
    // Re-render chat UI from history
    const historyToRender = conversationHistory.filter(m => m.role !== 'system');
    historyToRender.forEach(msg => {
        if (msg.role === 'user') {
            const userWrapper = createMessageWrapper('user');
            // If it had attachments, we'd need to re-render chips too, but for history we usually just show bubble
            const userBubble = document.createElement('div');
            userBubble.className = 'user-message py-2 px-4 rounded-2xl shadow-sm border border-slate-700/50 message-bubble';
            userBubble.textContent = msg.content.split('```')[0].trim() || "Files sent"; // Simple strip for display
            userWrapper.appendChild(userBubble);
            chatWindow.appendChild(userWrapper);
            applyShowMoreToBubble(userBubble);
        } else if (msg.role === 'assistant') {
            const aiWrapper = createMessageWrapper('ai');
            const aiBubble = document.createElement('div');
            aiBubble.className = 'ai-message py-4 message-bubble';
            aiBubble.innerHTML = marked.parse(msg.content);
            aiWrapper.appendChild(aiBubble);
            injectCodeCopyButtons(aiBubble);
            aiBubble.querySelectorAll('pre code').forEach(el => hljs.highlightElement(el));
            chatWindow.appendChild(aiWrapper);
            applyShowMoreToBubble(aiBubble);
        }
    });

    const titleTextEl = document.getElementById('top-title-text');
    if (titleTextEl) titleTextEl.textContent = session.title;
    document.getElementById('top-title').style.display = 'flex';
    
    chatListView.style.display = 'none';
    chatWindow.scrollTop = chatWindow.scrollHeight;
    hideGreeting();
}

function newChat() {
    try { if (currentAbortController) currentAbortController.abort(); } catch (e) {}
    currentChatId = 'chat_' + Date.now();
    conversationHistory = [
        { role: "system", content: getSystemPrompt() }
    ];
    chatWindow.innerHTML = '';
    const titleTextEl = document.getElementById('top-title-text');
    if (titleTextEl) titleTextEl.textContent = '';
    // Show top bar immediately so navigation buttons (Back to list) are always available
    document.getElementById('top-title').style.display = 'flex';
    attachedFiles = [];
    renderFileChips([]);
    isSending = false;
    currentAbortController = null;
    editingSession = null;
    chatListView.style.display = 'none';
    const greet = document.getElementById('welcome-greeting');
    if (greet) greet.style.display = 'flex';
    userInput.focus();
}

// Setup Top Bar Navigation
(function setupNavButtons() {
    const leftActions = document.getElementById('nav-actions-left');
    const rightActions = document.getElementById('nav-actions-right');
    const topTitle = document.getElementById('top-title');

    // List/Back Arrow
    const backBtn = document.createElement('button');
    backBtn.title = 'View All Chats';
    backBtn.style.color = '#e6eef6';
    backBtn.style.background = 'transparent';
    backBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left-icon lucide-arrow-left"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>`;
    backBtn.onclick = () => {
        renderChatList();
        chatListView.style.display = 'block';
    };
    leftActions.appendChild(backBtn);

    // New Chat Button
    const createBtn = document.createElement('button');
    createBtn.title = 'New Chat';
    createBtn.style.color = '#e6eef6';
    createBtn.style.background = 'transparent';
    createBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-square-pen-icon lucide-square-pen"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/></svg>`;
    createBtn.onclick = newChat;
    rightActions.appendChild(createBtn);

    // Initial state: ensure top title is ready to show
    topTitle.style.display = 'flex'; 
})();

document.getElementById('close-list-btn').onclick = () => chatListView.style.display = 'none';
document.getElementById('start-first-chat').onclick = newChat;

// Listen for requests from the chat list to load a session
// chats.js dispatches a CustomEvent 'chat-load-request' with detail: { id }
window.addEventListener('chat-new-request', () => {
    chatListView.style.display = 'none';
    newChat();
});

window.addEventListener('chat-load-request', (e) => {
    try {
        const id = e?.detail?.id;
        if (!id) return;
        // hide list and load the requested chat
        chatListView.style.display = 'none';
        loadChat(id);
    } catch (err) {
        console.warn('chat-load-request handling failed', err);
    }
});

// Listen for rename events from chats.js so the open chat title updates immediately
window.addEventListener('chat-renamed', (e) => {
    try {
        const { id, title } = e?.detail || {};
        if (!id || !title) return;
        if (id === currentChatId) {
            const titleTextEl = document.getElementById('top-title-text');
            if (titleTextEl) titleTextEl.textContent = title;
        }
        // re-render chat list may be useful if app triggered rename outside chats.js
        try { renderChatList(); } catch (_) {}
    } catch (err) {
        console.warn('chat-renamed handling failed', err);
    }
});

// Handle cancel edit button
if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', () => {
        editingSession = null;
        if (editIndicator) editIndicator.classList.add('hidden');
        userInput.value = '';
        // keep fixed height; do not change style.height
        sendBtn.classList.remove('typing');
        // clear any restored files when cancelling an edit
        attachedFiles = [];
        renderFileChips([]);
    });
}

/**
 * transformLuaComments(markdown)
 * - Finds fenced code blocks labeled lua/luau and converts various comment styles
 *   (//, --, block --[[ ... ]]) into the preferred "--//" single-line style.
 */
function transformLuaComments(markdown) {
    if (!markdown) return markdown;
    return markdown.replace(/```(luau|lua)([\s\S]*?)```/gi, (match, lang, code) => {
        // Convert block comments --[[ ... ]] into lines prefixed with --//
        code = code.replace(/--\[\[([\s\S]*?)\]\]/g, (_, inner) => {
            // split inner into lines and prefix each with --//
            return inner.split(/\r\n|\r|\n/).map(line => '--//' + (line ? ' ' + line : '')).join('\n');
        });
        // Convert lines that start with // into --//
        code = code.replace(/(^|\n)\s*\/\/+/g, (m) => m.replace(/\/\//g, '--//'));
        // Convert lines that start with -- but are not already --// into --//
        code = code.replace(/(^|\n)(\s*)--(?!\/\/)(\s?)/g, (m, pre, ws) => `${pre}${ws || ''}--//`);
        return '```' + lang + code + '```';
    });
}

async function initGreeting() {
    const name = await resolveUserName();

    // wrapper for avatar + text so avatar sits above the centered text
    const wrapper = document.createElement('div');
    wrapper.id = 'welcome-greeting';
    Object.assign(wrapper.style, {
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: '90',
        color: '#e6eef6',
        fontSize: '1.5rem', /* slightly larger text */
        fontWeight: '700',
        pointerEvents: 'none',
        textAlign: 'center',
        maxWidth: '90%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px'
    });

    // avatar image above the text; attempt to load websim user avatar, fallback to hiding if not available
    const avatarImg = document.createElement('img');
    avatarImg.alt = 'You';
    avatarImg.width = 48;
    avatarImg.height = 48;
    Object.assign(avatarImg.style, {
        borderRadius: '9999px',
        objectFit: 'cover',
        display: 'none', /* show only if loads */
        background: 'transparent',
        boxShadow: 'none',
        border: 'none'
    });

    // show the AI logo above the centered greeting (replace user avatar)
    // use the local project asset used for AI messages so the greeting shows the same logo
    avatarImg.src = '/1000096501-removebg-preview (1).png';
    avatarImg.style.display = 'block';
    avatarImg.onload = () => { avatarImg.style.display = 'block'; };
    avatarImg.onerror = () => { avatarImg.style.display = 'none'; };

    const textEl = document.createElement('div');
    textEl.style.pointerEvents = 'none';
    // Allow the greeting to wrap naturally instead of truncating with an ellipsis
    textEl.style.whiteSpace = 'normal';
    textEl.style.overflow = 'visible';
    textEl.style.textOverflow = 'clip';
    textEl.style.maxWidth = '90%';
    textEl.style.textAlign = 'center';
    textEl.textContent = `${getGreetingText()}, ${name}`;

    wrapper.appendChild(avatarImg);
    wrapper.appendChild(textEl);
    document.body.appendChild(wrapper);
}
/*
  Wrap initial async startup so we can hide the full-screen loader
  only after both greeting and avatar initialization finish.
*/
async function startupInit() {
    // Localize static titles
    const sessionsListTitle = document.getElementById('sessions-list-title');
    if (sessionsListTitle) sessionsListTitle.textContent = t('your_conversations');
    
    const loaderText = document.getElementById('loader-text');
    if (loaderText) loaderText.textContent = t('loading');

    const dropZoneText = document.querySelector('#drop-zone p');
    if (dropZoneText) dropZoneText.textContent = t('drop_file');

    await initGreeting();

    // initialize top-right avatar using websim user info (local images hosted at /avatar/{username})
    async function initUserAvatar() {
        try {
            const container = document.getElementById('user-avatar');
            if (!container) return;
            let username = null;
            if (window.websim && typeof window.websim.getCurrentUser === 'function') {
                const current = await window.websim.getCurrentUser();
                if (current && current.username) username = String(current.username);
            }
            // fallback to URL param 'name' if websim not available
            if (!username) {
                const urlName = new URLSearchParams(location.search).get('name');
                if (urlName) username = urlName;
            }
            if (!username) return;
            const img = document.createElement('img');
            // local avatar path provided by platform
            img.src = `https://images.websim.com/avatar/${encodeURIComponent(username)}`;
            img.alt = username;
            img.onload = () => { container.style.display = 'flex'; };
            img.onerror = () => { container.style.display = 'none'; };
            container.innerHTML = '';
            container.appendChild(img);
        } catch (e) {
            // surface avatar init issues via notification for easier debugging
            try { notify('Avatar init failed: ' + (e && e.message ? e.message : String(e)), 'error'); } catch (er) {}
            console.warn('initUserAvatar failed', e);
        }
    }
    await initUserAvatar();

    // hide loader with a small fade
    const loader = document.getElementById('initial-loader');
    if (loader) {
        loader.classList.add('hidden');
        // remove from DOM after transition to avoid covering interactive elements
        setTimeout(() => {
            if (loader.parentNode) loader.parentNode.removeChild(loader);
        }, 300);
    }
}
// start async init (no top-level await)
startupInit();

function hideGreeting() {
    const el = document.getElementById('welcome-greeting');
    if (el) el.style.display = 'none';
}

function handleFiles(files) {
    if (!files) return;
    const newFiles = Array.from(files);
    // Notify if any incoming file exceeds MAX_FILE_CHARS (approximate using file.size in bytes)
    for (const f of newFiles) {
        try {
            if (typeof MAX_FILE_CHARS === 'number' && f.size > MAX_FILE_CHARS) {
                // Inform the user that the file will be truncated when included in the prompt
                try { notify(t('file_too_large', { name: f.name }), 'info'); } catch (e) {}
            }
        } catch (e) { /* ignore detection errors */ }
    }
    attachedFiles = [...attachedFiles, ...newFiles];
    renderFileChips(attachedFiles, (index) => {
        attachedFiles.splice(index, 1);
        renderFileChips(attachedFiles, handleFiles);
    });
    userInput.focus();
}

fileInput.onchange = (e) => handleFiles(e.target.files);
window.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.display = 'flex'; });
dropZone.ondragleave = () => dropZone.style.display = 'none';
window.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.display = 'none';
    handleFiles(e.dataTransfer.files);
});

// Set initial placeholder based on language
userInput.placeholder = t('type_placeholder');

userInput.oninput = () => {
    // keep fixed height; only toggle send button active state
    userInput.value.trim() ? sendBtn.classList.add('typing') : sendBtn.classList.remove('typing');
};

chatForm.onsubmit = async (e) => {
    e.preventDefault();
    hideGreeting();

    // Reset AI token state and clear any previous error flags for the new message
    // without affecting the conversation history (context memory).
    if (isSending) {
        if (currentAbortController) {
            currentAbortController.abort();
            console.log("[System] Interrupted previous session. Resetting token budget...");
        }
    }

    const text = userInput.value.trim();
    if (!text && attachedFiles.length === 0) return;

    // If we are editing, clear future history and UI elements before sending new one
    if (editingSession) {
        // Truncate history to before this message
        conversationHistory.splice(editingSession.historyIndex);
        
        // Remove all UI message wrappers starting from the one being edited
        let current = editingSession.wrapper;
        while (current) {
            const next = current.nextElementSibling;
            current.remove();
            current = next;
        }
        
        if (editIndicator) editIndicator.classList.add('hidden');
        editingSession = null;
    }

    isSending = true;
    const arrowSvg = sendBtn.innerHTML;
    sendBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><rect width="16" height="16" x="2" y="2" rx="2"/></svg>';

    // Build Prompt
    let finalPrompt = "";
    // Helper to read image as data URL
    async function fileToDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(file);
        });
    }

    for (const file of attachedFiles) {
        let wasTruncated = false;
        // If image, embed a data URL so the AI receives the image content
        if (file.type && file.type.startsWith('image/')) {
            // read as data URL (may be large); truncate base64 if necessary to MAX_FILE_CHARS
            let dataUrl = await fileToDataUrl(file);
            if (typeof MAX_FILE_CHARS === 'number' && dataUrl.length > MAX_FILE_CHARS) {
                dataUrl = dataUrl.slice(0, MAX_FILE_CHARS) + '...[truncated base64]';
                wasTruncated = true;
            }
            // Note: many models accept image inputs differently, but embedding the data URL makes the image available in the prompt.
            finalPrompt += `[IMAGE: ${file.name}] (type: ${file.type}${wasTruncated ? ', truncated' : ''})\n${dataUrl}\n\n`;
        } else {
            // Read file content but truncate if it exceeds MAX_FILE_CHARS to prevent oversized prompts
            let content = await file.text();
            if (typeof MAX_FILE_CHARS === 'number' && content.length > MAX_FILE_CHARS) {
                content = content.slice(0, MAX_FILE_CHARS) + '\n\n[...file truncated to fit prompt limits]';
                wasTruncated = true;
            }
            // compute line count (based on the original or truncated content as appropriate)
            const lineCount = (content.match(/\r\n|\r|\n/g) || []).length + 1;
            // include a brief, non-obtrusive line count annotation so the model is aware of file size
            finalPrompt += `[FILE: ${file.name}] (lines: ${lineCount}${wasTruncated ? ', truncated' : ''})\n\`\`\`\n${content}\n\`\`\`\n\n`;
        }
    }
    finalPrompt += text || (getLanguage() === 'pt' ? "Analise os arquivos enviados." : "Analyze the sent files.");

    // detect if this request includes files so we can show "Reading file..." while the AI starts processing them
    // Look for explicit file markers in the built finalPrompt (e.g., "[FILE: filename]") so "Reading file..." appears
    // whenever the AI is actually given file content in the prompt — even after attachedFiles has been cleared.
    const hadFiles = finalPrompt.includes('[FILE:');

    // UI User Message
    const userWrapper = createMessageWrapper('user');
    // Store current history index to allow editing this specific message later
    const currentHistoryIndex = conversationHistory.length;
    // snapshot attached files for this outgoing user message so they can be restored when editing
    const attachedFilesSnapshot = attachedFiles.slice();

    // If this is the very first visible chat message, nudge it down a bit so it doesn't overlap the top-right avatar
    // (small offset so it stays visually aligned but avoids the avatar area).
    if (chatWindow.children.length === 0) {
        // Compute a safe top offset so the very first message doesn't sit beneath the fixed top bar or avatar.
        // Use the actual #top-title height when available, otherwise fall back to a sensible default.
        const topBar = document.getElementById('top-title');
        const userAvatar = document.getElementById('user-avatar');

        // Base top bar height (use measured height when visible, otherwise default to 40)
        const topBarHeight = (topBar && topBar.offsetHeight && window.getComputedStyle(topBar).display !== 'none') ? topBar.offsetHeight : 40;

        // If a small user avatar is visible in the top-right, include its height plus a little padding
        const avatarExtra = (userAvatar && window.getComputedStyle(userAvatar).display !== 'none') ? (userAvatar.offsetHeight + 8) : 0;

        // Minimum safe offset to avoid overlap (top bar + small padding + avatar if present)
        const safeOffset = Math.max(56, topBarHeight + 12 + avatarExtra);

        // Reduce the vertical margin for the very first message so it appears a bit higher.
        // Keep a lower bound to avoid overlap with the top UI.
        const REDUCTION = 8; // smaller reduction so first message stays lower
        const minOffset = 36; // strengthened absolute minimum marginTop to avoid overlap with top UI
        userWrapper.style.marginTop = Math.max(minOffset, safeOffset - REDUCTION) + 'px';

        // Kick off title generation for the chat (separate AI): pass a concise prompt (user's initial text or a short summary of attached files/text)
        // Note: generateTitle returns a short string suitable for centering above the chat.
        (async () => {
            const titleContainer = document.getElementById('top-title');
            // Ensure the top bar is visible immediately when starting a first message
            titleContainer.style.display = 'flex';
            
            try {
                // Use the user's visible text (or file summary fallback) as context
                const titleContext = text || (attachedFiles[0] ? `[FILE] ${attachedFiles[0].name}` : 'Conversation');
                const generated = await generateTitle(titleContext);
                const finalTitle = (generated && generated.trim()) ? generated.trim().replace(/^"+|"+$/g, '') : 'New Chat';
                // Ensure title isn't too long for the UI — trim and add ellipsis if needed
                const MAX_TITLE_CHARS = 40;
                const displayTitle = finalTitle.length > MAX_TITLE_CHARS
                    ? finalTitle.slice(0, MAX_TITLE_CHARS - 3).trim() + '...'
                    : finalTitle;
                // Typing animation: render quickly char-by-char into #top-title-text with caret
                try {
                    const textEl = document.getElementById('top-title-text');
                    if (textEl) {
                        textEl.textContent = '';
                        textEl.classList.add('typing-title');
                        let i = 0;
                        const speedMs = 6; // faster typing
                        const maxLen = displayTitle.length;
                        function typeChar() {
                            if (i < maxLen) {
                                textEl.textContent += displayTitle.charAt(i);
                                i++;
                                setTimeout(typeChar, speedMs);
                            } else {
                                // finished: keep text, remove caret after short pause
                                setTimeout(() => textEl.classList.remove('typing-title'), 300);
                            }
                        }
                        typeChar();
                    } else {
                        titleContainer.textContent = displayTitle;
                    }
                    titleContainer.style.display = 'flex';
                    // Update storage with the new title
                    if (currentChatId) {
                        saveSession(currentChatId, displayTitle, conversationHistory);
                    }
                } catch (e) {
                    titleContainer.textContent = displayTitle;
                    titleContainer.style.display = 'flex';
                }
            } catch (err) {
                // silent fail; title is optional — also show a small notification
                try { notify(t('error_processing') + ' (title): ' + (err && err.message ? String(err.message).slice(0,200) : '')); } catch (e) {}
                console.warn('title generation failed', err);
            }
        })();
    }

    attachedFiles.forEach(f => {
        const chip = document.createElement('div');
        chip.className = 'attachment-chip';
        chip.style.margin = '0 0 6px 0';
        chip.style.alignSelf = 'flex-end';
        chip.innerHTML = `<i class="fas fa-file-code"></i><span>${f.name}</span>`;
        userWrapper.appendChild(chip);
    });
    const userBubble = document.createElement('div');
    userBubble.className = 'user-message py-2 px-4 rounded-2xl shadow-sm border border-slate-700/50 message-bubble';
    userBubble.textContent = text || "Files sent";

    // Create copy and edit buttons for the user message.
    const userCopyBtn = createCopyButton(userBubble);
    userCopyBtn.style.marginTop = '0';
    userCopyBtn.style.marginLeft = '0';
    
    const userEditBtn = createEditButton();
    
    // Group controls
    const userControls = document.createElement('div');
    userControls.style.display = 'flex';
    userControls.style.alignItems = 'center';
    userControls.style.gap = '8px';
    userControls.style.alignSelf = 'flex-end';
    userControls.style.marginTop = '6px';
    userControls.style.paddingRight = '4px';
    // ensure controls float above the message bubble to avoid being visually occluded
    userControls.style.position = 'relative';
    userControls.style.zIndex = '70';
    userControls.appendChild(userEditBtn);
    userControls.appendChild(userCopyBtn);

    const toggleControls = (show) => {
        const display = show ? 'inline-flex' : 'none';
        userCopyBtn.style.display = display;
        userEditBtn.style.display = display;
        
        if (show) {
            if (userControls._hideTimeout) clearTimeout(userControls._hideTimeout);
            userControls._hideTimeout = setTimeout(() => toggleControls(false), 5000);
        }
    };

    userBubble.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const currentlyHidden = userCopyBtn.style.display === 'none' || userCopyBtn.style.display === '';
        toggleControls(currentlyHidden);
    });

    userEditBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        // retrieve attachments saved in history for this message (if present)
        const histEntry = conversationHistory[currentHistoryIndex] || {};
        const savedAttachments = Array.isArray(histEntry.attachments) ? histEntry.attachments.slice() : [];

        // Set up editing session (include attachments snapshot)
        editingSession = {
            wrapper: userWrapper,
            historyIndex: currentHistoryIndex,
            originalText: text,
            attachments: savedAttachments
        };

        // restore attached files into the input area so user can remove or keep them
        attachedFiles = savedAttachments.slice();
        renderFileChips(attachedFiles, (index) => {
            attachedFiles.splice(index, 1);
            renderFileChips(attachedFiles, handleFiles);
        });

        // Show edit indicator
        if (editIndicator) editIndicator.classList.remove('hidden');
        // Populate input and focus
        userInput.value = text;
        userInput.focus();
        userInput.style.height = 'auto';
        userInput.style.height = Math.min(userInput.scrollHeight, 180) + 'px';
        sendBtn.classList.add('typing');
        // Hide controls after selection
        toggleControls(false);
    });

    userCopyBtn.addEventListener('click', (ev) => ev.stopPropagation());

    userWrapper.appendChild(userBubble);
    userWrapper.appendChild(userControls);
    chatWindow.appendChild(userWrapper);
    // apply show-more truncation for long user messages
    try { applyShowMoreToBubble(userBubble); } catch (e) { /* ignore */ }

    userInput.value = '';
    // keep fixed height; do not change style.height
    attachedFiles = [];
    renderFileChips([]);

    // include attached files snapshot with the history entry so editing restores them
    conversationHistory.push({ role: "user", content: finalPrompt, attachments: attachedFilesSnapshot });
    if (conversationHistory.length > MAX_HISTORY) conversationHistory.splice(1, conversationHistory.length - MAX_HISTORY);

    // Ensure the chat is persisted immediately when the user sends the first message
    // so a session exists even if the assistant fails or title generation completes first.
    if (!currentChatId) currentChatId = 'chat_' + Date.now();
    try {
        const titleTextEl = document.getElementById('top-title-text');
        const title = (titleTextEl && titleTextEl.textContent) ? titleTextEl.textContent : 'New Chat';
        saveSession(currentChatId, title, conversationHistory);
    } catch (e) {
        // non-fatal; preserve normal flow even if saving fails
        console.warn('Immediate session save failed', e);
    }

    // Update system prompt with latest personalization settings before sending
    if (conversationHistory.length > 0 && conversationHistory[0].role === 'system') {
        conversationHistory[0].content = getSystemPrompt();
    }

    // Create a snapshot of messages for this request so ongoing responses keep consistent context
    const messagesForStream = conversationHistory.slice();

    // AI Stream
    const aiWrapper = createMessageWrapper('ai');



    const aiBubble = document.createElement('div');
    aiBubble.className = 'ai-message py-4 message-bubble animate-fade-in';
    const copyBtn = createCopyButton(aiBubble);
    aiWrapper.appendChild(aiBubble);
    aiWrapper.appendChild(copyBtn);
    chatWindow.appendChild(aiWrapper);

    currentAbortController = new AbortController();
    let fullResponse = "";

    // Create processing indicator (shimmering text) and append it to the AI bubble
    const processingSpan = document.createElement('span');
    processingSpan.className = 'shimmer';
    // Explicitly note the token reset in the UI if needed, but keeping it subtle
    processingSpan.textContent = t('processing');
    // Place the processing indicator at the top of the bubble, no extra wrapper/background
    aiBubble.appendChild(processingSpan);

    try {
        const stream = streamChat(messagesForStream, currentAbortController.signal);

        if (typeof hadFiles !== 'undefined' && hadFiles) {
            processingSpan.textContent = t('reading_file');
        }

        let firstChunkReceived = false;
        let renderScheduled = false;
        let pendingRender = "";

        // throttle settings to balance smoothness and responsiveness; lowered interval for snappier updates
        const MIN_RENDER_INTERVAL = 40; // ms between forced renders (reduced for faster streaming updates)
        let lastRenderTime = 0;
        let lastRenderedLength = 0; // track last rendered text length to avoid no-op renders

        const contentContainer = document.createElement('div');
        aiBubble.appendChild(contentContainer);

        function scheduleRender() {
            if (pendingRender.length === lastRenderedLength) return;
            const now = performance.now();
            const timeSinceLast = now - lastRenderTime;
            if (renderScheduled) return;

            const doRender = () => {
                renderScheduled = true;
                
                // Fallback to setTimeout when tab is hidden, as requestAnimationFrame is paused by browsers.
                // This ensures the AI continues "writing" (parsing and updating DOM) in the background.
                const runner = (document.visibilityState === 'hidden') ? (fn) => setTimeout(fn, 0) : requestAnimationFrame;

                runner(() => {
                    try {
                        contentContainer.innerHTML = marked.parse(pendingRender || "");
                        injectCodeCopyButtons(contentContainer);
                        contentContainer.querySelectorAll('pre code:not([data-highlighted])').forEach(codeEl => {
                            try {
                                hljs.highlightElement(codeEl);
                                codeEl.setAttribute('data-highlighted', '1');
                            } catch (e) { /* ignore highlight errors */ }
                        });
                        try { applyShowMoreToBubble(aiBubble); } catch (e) {}

                        // Functional auto-scroll: always scroll to the bottom when enabled (user requested global auto-scroll)
                        const autoScrollEnabled = localStorage.getItem('apex_auto_scroll') !== 'false';
                        if (autoScrollEnabled) {
                            chatWindow.scrollTop = chatWindow.scrollHeight;
                        }
                    } finally {
                        lastRenderTime = performance.now();
                        lastRenderedLength = pendingRender.length;
                        renderScheduled = false;
                    }
                });
            };

            if (timeSinceLast >= MIN_RENDER_INTERVAL) {
                doRender();
            } else {
                renderScheduled = true;
                setTimeout(() => {
                    renderScheduled = false;
                    if (pendingRender.length !== lastRenderedLength) doRender();
                }, Math.max(8, MIN_RENDER_INTERVAL - timeSinceLast));
            }
        }

        for await (const chunk of stream) {
            if (!firstChunkReceived) {
                firstChunkReceived = true;
                if (processingSpan && processingSpan.parentNode) processingSpan.parentNode.removeChild(processingSpan);
            }
            
            // only accept regular content chunks; ignore any reasoning chunks
            if (chunk.type === 'content') {
                fullResponse += chunk.content;
                pendingRender = transformLuaComments(fullResponse);
            } else {
                // ignore non-content chunks
            }
            scheduleRender();
        }
        // ensure processing indicator is removed if stream finishes without chunks
        if (!firstChunkReceived && processingSpan && processingSpan.parentNode) {
            processingSpan.parentNode.removeChild(processingSpan);
        }
        // final render to ensure last accumulated content is applied (in case loop ended before rAF)
        if (pendingRender) {
            pendingRender = fullResponse;
            scheduleRender();
        }

        copyBtn.style.display = 'inline-flex';
        // store assistant message into the request's snapshot history so the finished response is preserved with its original context
        messagesForStream.push({ role: "assistant", content: transformLuaComments(fullResponse) });

        // Optionally, also merge the assistant reply into the current active conversationHistory
        // only if the user hasn't started a different session in the meantime (i.e., top of history still matches our user message)
        try {
            const lastUser = conversationHistory.slice(-1)[0];
            const snapLastUser = messagesForStream.slice(-2)[0]; // the user message in the snapshot
            if (lastUser && snapLastUser && lastUser.content === snapLastUser.content) {
                conversationHistory.push({ role: "assistant", content: transformLuaComments(fullResponse) });
                if (conversationHistory.length > MAX_HISTORY) conversationHistory.splice(1, conversationHistory.length - MAX_HISTORY);
                
                // Auto-save the conversation after AI finishes
                if (!currentChatId) currentChatId = 'chat_' + Date.now();
                const titleTextEl = document.getElementById('top-title-text');
                const title = (titleTextEl && titleTextEl.textContent) ? titleTextEl.textContent : 'Conversation';
                saveSession(currentChatId, title, conversationHistory);
            }
        } catch (e) {
            // if matching check fails, just skip merging to avoid polluting a different active session
        }
    } catch (err) {
        // ensure processing indicator is removed on error/abort
        if (processingSpan && processingSpan.parentNode) processingSpan.parentNode.removeChild(processingSpan);

        if (err && err.name !== 'AbortError') {
            // Surface the real error message via toast only; avoid modifying AI bubble content
            const msg = String(err.message || 'Unknown error').slice(0, 1200);
            try { notify(`${t('error_processing')}: ${msg}`, 'error'); } catch (e) {}
            console.error('Chat error:', err);
        } else {
            // For aborts, only log; do not alter the AI message bubble
            console.log('Chat aborted by user or system');
        }
    } finally {
        isSending = false;
        sendBtn.innerHTML = arrowSvg;
        currentAbortController = null;
    }
};

// Instant detection of app visibility change
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        if (isSending) console.log('User minimized the app. AI session continuing in background...');
    } else {
        // When user returns, ensure the window is scrolled to the latest content if AI was writing
        if (isSending) {
            console.log('User returned. Synchronizing AI output...');
            chatWindow.scrollTop = chatWindow.scrollHeight;
        }
    }
});