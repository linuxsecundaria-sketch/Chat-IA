/*
  notifications.js
  - Provides a simple toast-style notification used across the app.
  - Gray rectangular background, white text, auto-dismiss after 5 seconds.
  - Icons removed: toasts now display only text per UX requirement.
*/

export function notify(message, type = 'info', durationMs = 5000) {
    try {
        // ensure container exists
        let container = document.getElementById('apex-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'apex-toast-container';
            Object.assign(container.style, {
                position: 'fixed',
                right: '16px',
                top: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                zIndex: 99999,
                pointerEvents: 'none',
                maxWidth: 'calc(100% - 32px)'
            });
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = 'apex-toast';
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        Object.assign(toast.style, {
            pointerEvents: 'auto',
            background: '#2b2b2d', /* medium gray */
            color: '#ffffff',
            padding: '10px 14px',
            borderRadius: '8px',
            boxShadow: '0 6px 18px rgba(0,0,0,0.45)',
            fontSize: '0.95rem',
            fontWeight: '600',
            border: '1px solid rgba(255,255,255,0.03)',
            minWidth: '220px',
            maxWidth: '420px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            transform: 'translateY(-6px)',
            opacity: '0',
            transition: 'transform 190ms ease, opacity 190ms ease'
        });

        // Only show text (no icons) per requirement
        const text = document.createElement('div');
        text.style.flex = '1 1 auto';
        text.style.wordBreak = 'break-word';
        text.style.whiteSpace = 'pre-wrap';
        text.textContent = String(message || '');

        toast.appendChild(text);

        container.appendChild(toast);

        // entrance animation
        requestAnimationFrame(() => {
            toast.style.transform = 'translateY(0)';
            toast.style.opacity = '1';
        });

        // auto dismiss
        const timeout = setTimeout(() => {
            try {
                toast.style.transform = 'translateY(-6px)';
                toast.style.opacity = '0';
                setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 200);
            } catch (e) {}
        }, durationMs);

        // clicking toast dismisses immediately
        toast.addEventListener('click', () => {
            clearTimeout(timeout);
            try {
                toast.style.transform = 'translateY(-6px)';
                toast.style.opacity = '0';
                setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 140);
            } catch (e) {}
        });

        return {
            dismiss: () => {
                try {
                    clearTimeout(timeout);
                    if (toast.parentNode) toast.parentNode.removeChild(toast);
                } catch (e) {}
            }
        };
    } catch (e) {
        // fallback: log if DOM operations fail
        try { console.warn('notify failed', e); } catch (_) {}
    }
}