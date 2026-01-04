/*
  chats.js
  - Responsible for rendering the "Your Chats" list and deleting sessions.
  - Reads/writes localStorage using the same key the app uses.
*/

import { t } from './utils.js';
const STORAGE_KEY_LOCAL = 'apex_ai_grok_sessions';
const sessionsContainer = document.getElementById('sessions-container');
const emptySessions = document.getElementById('empty-sessions');

/**
 * getSessions()
 * - returns parsed sessions array (or [])
 */
export function getSessionsLocal() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY_LOCAL)) || [];
    } catch (e) {
        return [];
    }
}

/**
 * deleteSession(id)
 * - removes a session and re-renders the list
 */
export function deleteSessionLocal(id) {
    const sessions = getSessionsLocal().filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEY_LOCAL, JSON.stringify(sessions));
    renderChatList();
}

/**
 * renameSessionLocal(id, newTitle)
 * - rename a saved session and re-render the list
 * - dispatches a custom event 'chat-renamed' { id, title } so the main app can update UI if needed
 */
export function renameSessionLocal(id, newTitle) {
    const sessions = getSessionsLocal();
    const idx = sessions.findIndex(s => s.id === id);
    if (idx === -1) return;
    sessions[idx].title = newTitle || sessions[idx].title;
    sessions[idx].updatedAt = Date.now();
    localStorage.setItem(STORAGE_KEY_LOCAL, JSON.stringify(sessions));
    renderChatList();
    // Notify app about rename so active chat UI can update immediately
    window.dispatchEvent(new CustomEvent('chat-renamed', { detail: { id, title: sessions[idx].title } }));
}

/**
 * renderChatList()
 * - Renders saved chat sessions into the existing #chat-list-view markup
 */
export function renderChatList() {
    let sessions = getSessionsLocal();
    if (!sessionsContainer) return;
    // Ensure sessions are ordered from most recent to oldest by updatedAt
    sessions = sessions.slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    sessionsContainer.innerHTML = '';
    
    if (sessions.length === 0) {
        if (emptySessions) {
            emptySessions.innerHTML = `
                <p>${t('no_sessions')}</p>
                <button id="start-first-chat" class="mt-4 px-6 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors">${t('start_first_chat')}</button>
            `;
            emptySessions.classList.remove('hidden');
            const btn = document.getElementById('start-first-chat');
            if (btn) btn.onclick = () => {
                // newChat is handled in app.js, dispatch event
                window.dispatchEvent(new CustomEvent('chat-new-request'));
            };
        }
        return;
    }
    if (emptySessions) emptySessions.classList.add('hidden');

    sessions.forEach(session => {
        const item = document.createElement('div');
        // Ensure each session item occupies full available width and doesn't show an outline on long-press/focus.
        item.className = 'group flex items-center justify-between p-4 bg-zinc-900 rounded-xl cursor-pointer border border-transparent hover:border-zinc-700 transition-all';
        // force full-width sizing inside the list column
        item.style.width = '100%';
        item.style.boxSizing = 'border-box';
        // Prevent the browser from applying a focus outline when pressing and holding on touch/mouse
        item.onmousedown = (ev) => { ev.preventDefault(); /* prevents focus ring on long-press */ };
        item.ontouchstart = (ev) => { /* no-op to avoid focus outlines on some mobile browsers */ };
        item.onclick = () => {
            // loadChat lives in app.js; dispatch a custom event so app.js can handle loading
            window.dispatchEvent(new CustomEvent('chat-load-request', { detail: { id: session.id } }));
        };
        
        // Format session.updatedAt as relative Portuguese ("há X ...") up to 7 days, else show English date MM/DD/YYYY
        function formatSessionDate(ts) {
            const then = new Date(ts);
            const now = new Date();
            const diffMs = now - then;
            const diffSec = Math.floor(diffMs / 1000);
            const diffMin = Math.floor(diffSec / 60);
            const diffHrs = Math.floor(diffMin / 60);
            const diffDays = Math.floor(diffHrs / 24);

            if (diffSec < 60) {
                return t('seconds_ago', { n: Math.max(1, diffSec) });
            }
            if (diffMin < 60) {
                return t('minutes_ago', { n: Math.max(1, diffMin) });
            }
            if (diffHrs < 24) {
                return t('hours_ago', { n: Math.max(1, diffHrs) });
            }
            if (diffDays <= 7) {
                return t('days_ago', { n: Math.max(1, diffDays) });
            }
            // After 7 days show English formatted date MM/DD/YYYY
            const mm = String(then.getMonth() + 1).padStart(2, '0');
            const dd = String(then.getDate()).padStart(2, '0');
            const yyyy = then.getFullYear();
            return `${mm}/${dd}/${yyyy}`;
        }

        const date = formatSessionDate(session.updatedAt);
        
        item.innerHTML = `
            <div class="flex-grow min-w-0 mr-4">
                <div class="text-white font-semibold truncate">${session.title}</div>
                <div class="text-slate-400 text-xs mt-0.5">${date}</div>
            </div>
            <div style="display:flex; gap:8px; align-items:center;">
                <button onfocus="this.blur()" class="rename-session opacity-0 group-hover:opacity-100 transition-opacity" data-id="${session.id}" title="Rename" aria-label="Rename"
                    style="padding:6px 10px; background:transparent; border-radius:8px; color:#e6eef6; font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Arial; display:inline-flex; align-items:center; justify-content:center; outline: none !important; box-shadow: none !important;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                </button>
                <button onfocus="this.blur()" class="delete-session opacity-0 group-hover:opacity-100 transition-opacity" data-id="${session.id}" title="Delete" aria-label="Delete"
                    style="padding:6px 10px; background:transparent; border-radius:8px; color:#e6eef6; font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Arial; display:inline-flex; align-items:center; justify-content:center; outline: none !important; box-shadow: none !important;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                </button>
            </div>
        `;
        
        const renameBtn = item.querySelector('.rename-session');
        renameBtn.onclick = (e) => {
            e.stopPropagation();

            // If a modal already exists, reuse it; otherwise create a compact polished modal
            let modal = document.getElementById('rename-modal-temp');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'rename-modal-temp';
                Object.assign(modal.style, {
                    position: 'fixed', left: '0', top: '0', right: '0', bottom: '0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.45)', zIndex: '9999', padding: '16px'
                });

                modal.innerHTML = `
                    <div id="rename-modal-card-temp" style="
                        width:100%; max-width:420px;
                        /* slightly lighter card background and removed glow/blur */
                        background:#111214; border-radius:12px;
                        padding:14px; box-shadow:none;
                        border:1px solid rgba(255,255,255,0.02);
                        transform: translateY(-6px); transition: transform 180ms ease, opacity 180ms ease;
                        opacity:0;
                    ">
                        <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
                            <div style="display:flex; gap:10px; align-items:center;">
                                <div style="display:flex; flex-direction:column;">
                                    <div style="font-weight:700; color:#e6eef6; font-size:0.95rem;">${t('rename_chat')}</div>
                                    <div style="color:#9aa5ad; font-size:0.78rem; margin-top:2px;">${t('rename_sub')}</div>
                                </div>
                            </div>
                        </div>
                        <div style="margin-bottom:10px;">
                            <input id="rename-temp-input" type="text" maxlength="80" placeholder="Novo título" style="
                                width:100%; padding:10px 12px; border-radius:8px;
                                /* input background aligned with new slightly lighter card */
                                background:#111214; color:#e6eef6; border:1px solid rgba(255,255,255,0.02); font-size:0.95rem; outline:none; font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Arial;
                            "/>
                        </div>
                        <div style="display:flex; gap:8px; justify-content:flex-end;">
                            <button id="rename-temp-cancel" style="width:92px; height:34px; padding:6px 10px; border-radius:8px; background:#7f1f1f; border:1px solid rgba(255,255,255,0.02); color:#e6eef6; cursor:pointer; font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Arial; font-size:0.9rem;">${t('cancel')}</button>
                            <button id="rename-temp-save" style="width:92px; height:34px; padding:6px 10px; border-radius:8px; background:#4b5563; color:#e6eef6; border:none; cursor:pointer; font-weight:700; font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Arial; font-size:0.9rem;">${t('save')}</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);

                // animate in
                const card = modal.querySelector('#rename-modal-card-temp');
                requestAnimationFrame(() => {
                    card.style.transform = 'translateY(0)';
                    card.style.opacity = '1';
                });

                // wire controls
                modal.querySelector('#rename-temp-cancel').onclick = () => {
                    card.style.transform = 'translateY(-6px)';
                    card.style.opacity = '0';
                    setTimeout(() => { if (modal && modal.parentNode) modal.parentNode.removeChild(modal); }, 180);
                };

                modal.querySelector('#rename-temp-save').onclick = () => {
                    const input = modal.querySelector('#rename-temp-input');
                    const v = (input && input.value || '').trim();
                    if (v) {
                        renameSessionLocal(session.id, v);
                    }
                    // close
                    modal.querySelector('#rename-temp-cancel').click();
                };

                // allow Enter to save and Escape to cancel
                modal.addEventListener('keydown', (ev) => {
                    if (ev.key === 'Escape') modal.querySelector('#rename-temp-cancel').click();
                    if (ev.key === 'Enter') modal.querySelector('#rename-temp-save').click();
                });
            } else {
                // ensure modal visible and animated
                const card = modal.querySelector('#rename-modal-card-temp');
                requestAnimationFrame(() => { card.style.transform = 'translateY(0)'; card.style.opacity = '1'; });
            }

            // set current session title into input and show/focus
            const inputEl = document.querySelector('#rename-temp-input');
            if (inputEl) {
                inputEl.value = session.title || '';
                inputEl.focus();
                inputEl.select();
            }
        };

        const deleteBtn = item.querySelector('.delete-session');
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deleteSessionLocal(session.id);
        };
        
        sessionsContainer.appendChild(item);
    });
}

// Allow the main app to trigger (re)rendering by calling this default export as well
export default {
    renderChatList,
    deleteSessionLocal,
    getSessionsLocal
};