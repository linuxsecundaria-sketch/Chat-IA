import { t } from './utils.js';

export function renderFileChips(files, onRemove) {
    const container = document.getElementById('file-preview');
    container.innerHTML = '';
    if (!files || files.length === 0) {
        container.style.display = 'none';
        return;
    }
    // horizontal single-row layout with hidden scrollbar
    container.style.display = 'flex';
    container.style.flexWrap = 'nowrap';
    container.style.overflowX = 'auto';
    container.style.overflowY = 'hidden';
    container.style.gap = '10px';
    container.style.padding = '8px 12px';

    files.forEach((file, index) => {
        const chip = document.createElement('div');
        chip.className = 'attachment-chip';


        // If the file is an image, show a small thumbnail; otherwise show file icon
        if (file.type && file.type.startsWith('image/')) {
            const url = URL.createObjectURL(file);
            chip.innerHTML = `
                <img src="${url}" alt="${file.name}" style="width:44px; height:36px; object-fit:cover; border-radius:6px; margin-right:8px; flex:0 0 auto;">
                <span title="${file.name}" style="display:inline-block; max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${file.name}</span>
                <button data-index="${index}" aria-label="Remove file"><i class="fas fa-times"></i></button>
            `;
            // revoke object URL when chip removed to free memory
            chip._objectUrl = url;
        } else {
            chip.innerHTML = `
                <i class="fas fa-file-code" style="flex:0 0 20px; margin-right:8px;"></i>
                <span title="${file.name}" style="display:inline-block; max-width:220px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${file.name}</span>
                <button data-index="${index}" aria-label="Remove file"><i class="fas fa-times"></i></button>
            `;
        }

        // Long-press / click-and-hold to reveal the remove button
        let pressTimer = null;
        const holdDuration = 500; // ms required to show the X

        function showRemove() {
            chip.classList.add('show-remove');
        }
        function hideRemove() {
            chip.classList.remove('show-remove');
        }

        // pointer events to support mouse & touch
        chip.addEventListener('mousedown', (ev) => {
            if (ev.button !== 0) return;
            pressTimer = setTimeout(showRemove, holdDuration);
        });
        chip.addEventListener('touchstart', (ev) => {
            pressTimer = setTimeout(showRemove, holdDuration);
        }, { passive: true });

        function clearPressTimer() {
            if (pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = null;
            }
        }

        chip.addEventListener('mouseup', clearPressTimer);
        chip.addEventListener('mouseleave', () => { clearPressTimer(); /* do not hide if already shown */ });
        chip.addEventListener('touchend', clearPressTimer);
        chip.addEventListener('touchcancel', clearPressTimer);

        // If user taps/clicks once (no long press) we treat as focus: briefly flash the remove then hide
        chip.addEventListener('click', (ev) => {
            // ignore clicks on the remove button itself
            if (ev.target.closest('button')) return;
            // short reveal on simple click to indicate affordance
            showRemove();
            setTimeout(hideRemove, 1800);
        });

        // ensure each button removes its exact index and re-renders via the provided callback
        const btn = chip.querySelector('button');
        btn.onclick = (ev) => {
            ev.stopPropagation();
            onRemove(index);
        };

        container.appendChild(chip);
        // cleanup object URL when remove button triggered or on manual remove via callback
        const btnLocal = chip.querySelector('button');
        btnLocal.addEventListener('click', () => {
            if (chip._objectUrl) {
                try { URL.revokeObjectURL(chip._objectUrl); } catch (e) {}
            }
        });
    });
}

export function createMessageWrapper(role) {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.alignItems = role === 'user' ? 'flex-end' : 'flex-start';
    wrapper.style.width = '100%';
    return wrapper;
}

export function createEditButton() {
    const btn = document.createElement('button');
    btn.title = t('edit_msg');
    btn.className = 'user-edit-btn';
    Object.assign(btn.style, {
        background: 'transparent',
        border: 'none',
        color: '#cbd5e1',           // slightly less-white pencil tone
        display: 'none',            // hidden until the message background is clicked
        alignItems: 'center',
        justifyContent: 'center',
        width: '24px',              // match copy button size
        height: '24px',
        marginTop: '0',
        cursor: 'pointer',
        position: 'relative',
        zIndex: '140',
        pointerEvents: 'auto',
        opacity: ''                 // leave opacity unset so it matches copy button's default
    });

    // Use same currentColor styling and slightly reduce SVG sizes by 1px for the pencil icon
    btn.style.position = 'relative';
    btn.style.overflow = 'visible';
    btn.style.color = '#cbd5e1'; // ensure color matches copy button (slightly muted)

    btn.innerHTML = ''
        + `<span class="edit-bg" aria-hidden="true" style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none;">\
<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg></span>`
        + `<span class="shimmer-slow" style="display:inline-flex; align-items:center; justify-content:center; width:100%; height:100%; position:relative; z-index:2;">\
<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg></span>`;
    return btn;
}

export function createCopyButton(targetDiv) {
    const btn = document.createElement('button');
    btn.title = t('copy_msg');
    btn.className = 'ai-copy-btn';
    Object.assign(btn.style, {
        background: 'transparent',
        border: 'none',
        color: '#e6eef6',
        display: 'none',
        alignItems: 'center',
        justifyContent: 'center',
        width: '24px',
        height: '24px',
        marginTop: '-14px',
        marginLeft: '4px',
        alignSelf: 'flex-start',
        cursor: 'pointer'
    });

    // default icon (kept as the "restorable" source)
    const defaultIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy-icon lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
    const successIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="green" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';

    btn.innerHTML = defaultIcon;

    // helper to safely restore the icon after a delay, preventing overlapping restores
    let restoreTimeout = null;
    btn.onclick = (ev) => {
        ev.stopPropagation();
        const textToCopy = targetDiv.innerText.trim();
        if (!textToCopy) return;

        // write to clipboard
        navigator.clipboard.writeText(textToCopy).then(() => {
            // if a previous timeout exists, clear it to avoid incorrect restores
            if (restoreTimeout) {
                clearTimeout(restoreTimeout);
                restoreTimeout = null;
            }
            // set success icon and temporarily disable pointer events to prevent rapid re-clicks
            btn.style.pointerEvents = 'none';
            btn.innerHTML = successIcon;

            // restore original icon after a fixed interval
            restoreTimeout = setTimeout(() => {
                btn.innerHTML = defaultIcon;
                btn.style.pointerEvents = '';
                restoreTimeout = null;
            }, 1200);
        }).catch(() => {
            // ignore clipboard failures silently
        });
    };
    return btn;
}

export function injectCodeCopyButtons(messageDiv) {
    messageDiv.querySelectorAll('pre').forEach(pre => {
        if (!pre.closest('.code-wrapper')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'code-wrapper';

            const bar = document.createElement('div');
            bar.className = 'code-bar';
            // ensure left label and right controls layout: use flex-start and let label push controls to right
            bar.style.display = 'flex';
            bar.style.alignItems = 'center';
            bar.style.justifyContent = 'flex-start';
            bar.style.gap = '8px';

            // Language label on the far left
            const langLabel = document.createElement('span');
            langLabel.style.marginRight = 'auto'; // push the rest to the right
            // make language label smaller, professional and white for better contrast
            langLabel.style.color = '#e6eef6';
            langLabel.style.fontSize = '0.78rem';
            langLabel.style.fontWeight = '600';
            langLabel.style.fontFamily = 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial';
            langLabel.style.textTransform = 'uppercase';
            langLabel.style.letterSpacing = '0.4px';
            // detect language from inner <code> class or data-lang attribute
            let detected = 'text';
            const codeEl = pre.querySelector('code');
            if (codeEl) {
                const cls = codeEl.className || '';
                const m = cls.match(/language-([a-z0-9]+)/i);
                if (m && m[1]) detected = m[1];
                else if (codeEl.getAttribute('data-lang')) detected = codeEl.getAttribute('data-lang');
            }
            // fallback to using a simple heuristic from first line (e.g., "-- lua")
            const firstLine = (pre.innerText || '').split(/\r\n|\r|\n/)[0] || '';
            if (detected === 'text' && /^#\!|^\/\/|^\/\*/.test(firstLine)) {
                detected = 'code';
            }
            langLabel.textContent = detected.charAt(0).toUpperCase() + detected.slice(1);

            // Toggle (collapse/expand) button
            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'copy-btn toggle-btn';
            toggleBtn.title = t('collapse_code');
            toggleBtn.style.display = 'inline-flex';
            toggleBtn.style.alignItems = 'center';
            toggleBtn.style.justifyContent = 'center';
            // make the toggle icon use a soft off-white color instead of bluish
            toggleBtn.style.color = '#e6eef6';
            toggleBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevrons-up-down-icon lucide-chevrons-up-down"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>';

            // Copy button (keeps previous behavior)
            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-btn';
            // ensure copy icon uses the same off-white tone
            copyBtn.style.color = '#e6eef6';
            copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';

            // Line count display (hidden when expanded) - placed near controls
            const lineCountSpan = document.createElement('span');
            lineCountSpan.style.marginRight = '8px';
            // make line count clearly white for visibility
            lineCountSpan.style.color = '#e6eef6';
            lineCountSpan.style.fontSize = '0.85rem';
            lineCountSpan.style.fontFamily = 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", "Segoe UI Mono", monospace';
            lineCountSpan.style.display = 'none';

            // Compute line count for the pre content
            const rawText = pre.innerText || '';
            const lines = rawText.split(/\r\n|\r|\n/).length;
            lineCountSpan.textContent = `${lines} ${lines === 1 ? t('line') : t('lines')}`;

            // Hook up toggle behavior
            let collapsed = localStorage.getItem('apex_collapse_code') === 'true';
            
            // Initial state based on settings
            if (collapsed) {
                pre.style.display = 'none';
                lineCountSpan.style.display = 'inline';
            }

            toggleBtn.onclick = (ev) => {
                ev.stopPropagation();
                collapsed = !collapsed;
                if (collapsed) {
                    // collapse: hide the <pre> and show the line count
                    pre.style.display = 'none';
                    lineCountSpan.style.display = 'inline';
                    // visually reduce wrapper height to bar only
                    wrapper.style.maxHeight = 'none';
                } else {
                    // expand: show the <pre> and hide the line count
                    pre.style.display = '';
                    lineCountSpan.style.display = 'none';
                }
            };

            // Copy behavior
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(pre.innerText.replace(/[\n\s]*$/, ''));
                copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="green" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
                setTimeout(() => copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>', 1400);
            };

            // Append controls in order: language label (left), then spacer pushes controls to the right
            bar.appendChild(langLabel);
            // group right-side items
            const rightGroup = document.createElement('div');
            rightGroup.style.display = 'flex';
            rightGroup.style.alignItems = 'center';
            rightGroup.style.gap = '8px';
            rightGroup.appendChild(lineCountSpan);
            rightGroup.appendChild(toggleBtn);
            rightGroup.appendChild(copyBtn);
            bar.appendChild(rightGroup);

            // Replace pre with wrapper containing bar + pre
            pre.parentNode.replaceChild(wrapper, pre);
            wrapper.appendChild(bar);
            wrapper.appendChild(pre);
        }
    });
}

/*
  applyShowMoreToBubble(messageEl)
  - messageEl: element that contains message content (innerHTML may include markup)
  Adds a collapse overlay if content height exceeds the collapsed threshold.
*/
export function applyShowMoreToBubble(messageEl, collapsedHeight = 220) {
    if (!messageEl || !(messageEl instanceof HTMLElement)) return;

    // Do not show "Show more" controls for AI messages
    if (messageEl.classList && messageEl.classList.contains('ai-message')) return;

    // make messageEl a positioning context so overlays can escape inner truncation
    const prevPosition = messageEl.style.position;
    if (!prevPosition || prevPosition === 'static') {
        messageEl.style.position = 'relative';
    }

    // Helper to find existing parts if previously attached
    let trunc = messageEl.querySelector('.bubble-truncate');
    let contentWrapper = messageEl.querySelector('.bubble-content');
    let overlay = messageEl.querySelector('.show-more-overlay');

    // If not present, create wrapper structure and move children into it
    if (!contentWrapper) {
        contentWrapper = document.createElement('div');
        contentWrapper.className = 'bubble-content';
        while (messageEl.firstChild) contentWrapper.appendChild(messageEl.firstChild);

        trunc = document.createElement('div');
        trunc.className = 'bubble-truncate';
        trunc.appendChild(contentWrapper);

        // clear and append trunc
        messageEl.innerHTML = '';
        messageEl.appendChild(trunc);
    }

    // If overlay doesn't exist, create it
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'show-more-overlay';
        const shadow = document.createElement('div');
        shadow.className = 'show-more-shadow';
        const btn = document.createElement('button');
        btn.className = 'show-more-btn';
        btn.type = 'button';
        btn.textContent = t('show_more');
        overlay.appendChild(shadow);
        overlay.appendChild(btn);
        messageEl.appendChild(overlay);

        // attach expand handler (once) to the button
        btn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            // permanently expand
            trunc.classList.add('expanded');
            trunc.style.maxHeight = '';
            trunc.style.overflow = '';
            // mark as permanently expanded so future calls skip truncation
            messageEl.dataset.showmoreExpanded = '1';
            // remove overlay (button + shadow)
            if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
            // restore previous positioning if we changed it and nothing else needs it
            if (!prevPosition || prevPosition === 'static') messageEl.style.position = prevPosition || '';
            // ensure the expanded content is visible
            trunc.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, { once: true });
    }

    // If already permanently expanded, ensure overlay is removed and truncation disabled
    if (messageEl.dataset.showmoreExpanded === '1') {
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if (trunc) {
            trunc.classList.remove('bubble-truncate');
            trunc.style.maxHeight = '';
            trunc.style.overflow = '';
        }
        if (!prevPosition || prevPosition === 'static') messageEl.style.position = prevPosition || '';
        return;
    }

    // Re-evaluate content size each time so streaming updates adjust truncation/overlay appropriately
    requestAnimationFrame(() => {
        const contentHeight = contentWrapper ? contentWrapper.scrollHeight : 0;

        // If content is short enough, remove overlay and don't truncate
        if (contentHeight <= collapsedHeight + 20) {
            if (trunc) {
                trunc.classList.remove('bubble-truncate');
                trunc.style.maxHeight = '';
                trunc.style.overflow = '';
            }
            if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
            if (!prevPosition || prevPosition === 'static') messageEl.style.position = prevPosition || '';
            return;
        }

        // apply collapsed state
        if (trunc) {
            trunc.classList.add('bubble-truncate');
            trunc.style.maxHeight = collapsedHeight + 'px';
            trunc.style.overflow = 'hidden';
        }
        // ensure overlay exists and button remains visible (created above if missing)
        if (overlay && overlay.parentNode) {
            // keep overlay as-is
        } else if (overlay && !overlay.parentNode) {
            messageEl.appendChild(overlay);
        }
    });
}