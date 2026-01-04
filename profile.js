import { resolveUserName, getGreetingText, setupMarked, t, getLanguage } from './utils.js';

/*
  profile.js
  - Provides a simple profile panel that opens when #user-avatar is clicked.
  - Panel is a framed floating UI with tabs. The first tab "Configurações" opens a full-screen placeholder settings page.
  - This file only implements the base structure & navigation (no actual settings yet).
*/

const AVATAR_ID = 'user-avatar';
const PANEL_ID = 'profile-panel';
const SETTINGS_FULL_ID = 'settings-fullscreen';

function createProfilePanel() {
    if (document.getElementById(PANEL_ID)) return;

    // Overlay backdrop
    const backdrop = document.createElement('div');
    backdrop.id = PANEL_ID;
    Object.assign(backdrop.style, {
        position: 'fixed',
        right: '8px',
        top: '48px',
        width: '320px',
        maxWidth: '92vw',
        background: '#17171a', /* slightly lighter fixed background color (subtly brighter) */
        color: '#e6eef6',
        borderRadius: '12px',
        boxShadow: 'none', /* removed neon/glow shadow */
        border: '1px solid rgba(255,255,255,0.02)', /* subtle border to lift panel */
        outline: 'none', /* disable focus outline */
        zIndex: 1000,
        padding: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'auto'
    });

    // Header
    const header = document.createElement('div');
    Object.assign(header.style, {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px'
    });
    const title = document.createElement('div');
    title.textContent = t('profile');
    title.style.fontWeight = '700';
    title.style.fontSize = '0.95rem';
    header.appendChild(title);



    backdrop.appendChild(header);

    // Direct sections (no tabs): we show the settings/personalization entry points immediately
    // to present the settings and personalization as full screen options without a tabbed UI.
    // This keeps the profile panel compact while exposing the navigation buttons below.
    // (Tabs removed per design: sections will open full-screen via the buttons provided.)

    // Content area
    const content = document.createElement('div');
    content.style.minHeight = '64px';
    content.style.maxHeight = '48vh';
    content.style.overflow = 'auto';
    content.style.padding = '8px';
    content.style.borderRadius = '8px';
    content.style.background = '#17171a'; /* slightly lighter panel interior color (subtly brighter) */
    content.style.border = 'none'; /* remove any inner border */
    content.style.outline = 'none'; /* prevent focus outline on inner content */
    content.id = 'profile-content';
    backdrop.appendChild(content);

    // Populate default content for tabs
    function showSettingsPlaceholder() {
        content.innerHTML = '';
        const info = document.createElement('div');
        info.style.display = 'flex';
        info.style.flexDirection = 'column';
        info.style.gap = '8px';

        const createOption = (label, onClick) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.innerHTML = `<span style="flex:0 0 auto;">${label}</span><span style="flex:1"></span><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right-icon lucide-chevron-right" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>`;
            Object.assign(btn.style, {
                padding: '10px 12px',
                background: 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: '#e6eef6',
                cursor: 'pointer',
                alignSelf: 'stretch',
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                textAlign: 'left',
                gap: '8px'
            });
            btn.onclick = onClick;
            return btn;
        };

        info.appendChild(createOption(t('app_settings'), openFullSettings));
        info.appendChild(createOption(t('personalization'), openPersonalization));
        info.appendChild(createOption(t('languages'), openLanguages));

        content.appendChild(info);
    }



    // No tab switching: show settings placeholder content by default inside the small profile panel
    setActiveProfileContent();

    function setActiveProfileContent() {
        // Display the simplified settings entry list inside the compact profile panel by default
        showSettingsPlaceholder();
    }

    // click outside to close
    function onDocClick(e) {
        if (!backdrop.contains(e.target) && e.target.id !== AVATAR_ID) {
            removePanel();
        }
    }
    setTimeout(() => document.addEventListener('pointerdown', onDocClick), 0);

    // attach
    document.body.appendChild(backdrop);
    // Legacy tab switching helper removed earlier; provide a harmless no-op to avoid runtime errors
    function setActive(id) {
        // Intentionally left blank: profile panel no longer uses tabbed UI,
        // but some code still calls setActive('tab-settings') — keep this to maintain compatibility.
        return;
    }
    setActive('tab-settings');

    // ensure focus for accessibility
    backdrop.tabIndex = -1;
    backdrop.focus();

    // store cleanup
    backdrop._onDocClick = onDocClick;
}

function removePanel() {
    const el = document.getElementById(PANEL_ID);
    if (!el) return;
    if (el._onDocClick) document.removeEventListener('pointerdown', el._onDocClick);
    el.remove();
}

 // Full-screen settings placeholder
 function openFullSettings() {
     // If full-screen already present, do nothing
     if (document.getElementById(SETTINGS_FULL_ID)) return;

     // Create full screen container
     const full = document.createElement('div');
     full.id = SETTINGS_FULL_ID;
     Object.assign(full.style, {
         position: 'fixed',
         inset: '0',
         zIndex: 2000,
         background: '#18181b', /* match chat app background */
         color: '#e6eef6',
         display: 'flex',
         flexDirection: 'column',
         pointerEvents: 'auto'
     });

     // Header bar with label and the arrow icon positioned to the left
     const bar = document.createElement('div');
     Object.assign(bar.style, {
         height: '56px',
         display: 'flex',
         alignItems: 'center',
         justifyContent: 'flex-start',
         gap: '12px',
         padding: '0 16px',
         borderBottom: 'none'
     });

     // Arrow icon button moved to the left, matching size/color/padding of other arrows
     const iconBtn = document.createElement('button');
     iconBtn.type = 'button';
     iconBtn.title = t('back');
     iconBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left-icon lucide-arrow-left"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>';
     Object.assign(iconBtn.style, {
         display: 'inline-flex',
         alignItems: 'center',
         justifyContent: 'center',
         background: 'transparent',
         border: 'none',
         color: '#e6eef6',
         cursor: 'pointer',
         padding: '6px',
         marginRight: '8px' // separation between icon and title
     });
     iconBtn.onclick = () => {
         if (full && full.parentNode) full.parentNode.removeChild(full);
     };

     bar.appendChild(iconBtn);

     // Text label (keeps its current position next to the icon)
     const titleLabel = document.createElement('div');
     titleLabel.style.fontWeight = '700';
     titleLabel.style.fontSize = '1rem';
     titleLabel.style.color = '#e6eef6';
     titleLabel.textContent = t('settings');
     bar.appendChild(titleLabel);

     // Spacer pushes any future controls to the far right
     const spacer = document.createElement('div');
     spacer.style.flex = '1';
     bar.appendChild(spacer);

     full.appendChild(bar);

     // Placeholder content area
     const area = document.createElement('div');
     Object.assign(area.style, {
         flex: '1',
         display: 'flex',
         flexDirection: 'column',
         padding: '24px 16px',
         gap: '20px'
     });

     // Auto Scroll Setting Row
     const row = document.createElement('div');
     Object.assign(row.style, {
         display: 'flex',
         alignItems: 'center',
         justifyContent: 'space-between',
         padding: '16px',
         background: 'transparent', /* removed frame background per request */
         borderRadius: '12px',
         border: 'none' /* removed subtle border */
     });

     const labelContainer = document.createElement('div');
     const labelTitle = document.createElement('div');
     labelTitle.textContent = t('auto_scroll');
     labelTitle.style.fontWeight = '600';
     labelTitle.style.fontSize = '1rem';
     labelTitle.style.color = '#e6eef6';
     const labelSub = document.createElement('div');
     labelSub.textContent = t('auto_scroll_sub');
     labelSub.style.fontSize = '0.8rem';
     labelSub.style.color = '#9aa5ad';
     labelSub.style.marginTop = '2px';
     labelContainer.appendChild(labelTitle);
     labelContainer.appendChild(labelSub);
     row.appendChild(labelContainer);

     // Professional Toggle
     const toggleLabel = document.createElement('label');
     Object.assign(toggleLabel.style, {
         position: 'relative',
         display: 'inline-block',
         width: '46px',
         height: '24px',
         cursor: 'pointer',
         flexShrink: '0'
     });

     const checkbox = document.createElement('input');
     checkbox.type = 'checkbox';
     checkbox.style.display = 'none';
     checkbox.checked = localStorage.getItem('apex_auto_scroll') !== 'false';

     const slider = document.createElement('span');
     Object.assign(slider.style, {
         position: 'absolute',
         inset: '0',
         backgroundColor: checkbox.checked ? '#3b82f6' : '#3f3f46',
         transition: 'background-color 0.2s ease',
         borderRadius: '24px'
     });

     const knob = document.createElement('span');
     Object.assign(knob.style, {
         position: 'absolute',
         height: '18px',
         width: '18px',
         left: checkbox.checked ? '25px' : '3px',
         bottom: '3px',
         backgroundColor: 'white',
         transition: 'left 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
         borderRadius: '50%',
         boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
     });

     checkbox.onchange = () => {
         const enabled = checkbox.checked;
         localStorage.setItem('apex_auto_scroll', enabled);
         slider.style.backgroundColor = enabled ? '#3b82f6' : '#3f3f46';
         knob.style.left = enabled ? '25px' : '3px';
     };

     toggleLabel.appendChild(checkbox);
     toggleLabel.appendChild(slider);
     toggleLabel.appendChild(knob);
     row.appendChild(toggleLabel);

     area.appendChild(row);

     // Collapse Code Blocks Setting Row
     const rowCollapse = document.createElement('div');
     Object.assign(rowCollapse.style, {
         display: 'flex',
         alignItems: 'center',
         justifyContent: 'space-between',
         padding: '16px',
         background: 'transparent',
         borderRadius: '12px',
         border: 'none'
     });

     const labelContainerCollapse = document.createElement('div');
     const labelTitleCollapse = document.createElement('div');
     labelTitleCollapse.textContent = t('collapse_code');
     labelTitleCollapse.style.fontWeight = '600';
     labelTitleCollapse.style.fontSize = '1rem';
     labelTitleCollapse.style.color = '#e6eef6';
     const labelSubCollapse = document.createElement('div');
     labelSubCollapse.textContent = t('collapse_code_sub');
     labelSubCollapse.style.fontSize = '0.8rem';
     labelSubCollapse.style.color = '#9aa5ad';
     labelSubCollapse.style.marginTop = '2px';
     labelContainerCollapse.appendChild(labelTitleCollapse);
     labelContainerCollapse.appendChild(labelSubCollapse);
     rowCollapse.appendChild(labelContainerCollapse);

     const toggleLabelCollapse = document.createElement('label');
     Object.assign(toggleLabelCollapse.style, {
         position: 'relative',
         display: 'inline-block',
         width: '46px',
         height: '24px',
         cursor: 'pointer',
         flexShrink: '0'
     });

     const checkboxCollapse = document.createElement('input');
     checkboxCollapse.type = 'checkbox';
     checkboxCollapse.style.display = 'none';
     checkboxCollapse.checked = localStorage.getItem('apex_collapse_code') === 'true';

     const sliderCollapse = document.createElement('span');
     Object.assign(sliderCollapse.style, {
         position: 'absolute',
         inset: '0',
         backgroundColor: checkboxCollapse.checked ? '#3b82f6' : '#3f3f46',
         transition: 'background-color 0.2s ease',
         borderRadius: '24px'
     });

     const knobCollapse = document.createElement('span');
     Object.assign(knobCollapse.style, {
         position: 'absolute',
         height: '18px',
         width: '18px',
         left: checkboxCollapse.checked ? '25px' : '3px',
         bottom: '3px',
         backgroundColor: 'white',
         transition: 'left 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
         borderRadius: '50%',
         boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
     });

     checkboxCollapse.onchange = () => {
         const enabled = checkboxCollapse.checked;
         localStorage.setItem('apex_collapse_code', enabled);
         sliderCollapse.style.backgroundColor = enabled ? '#3b82f6' : '#3f3f46';
         knobCollapse.style.left = enabled ? '25px' : '3px';
     };

     toggleLabelCollapse.appendChild(checkboxCollapse);
     toggleLabelCollapse.appendChild(sliderCollapse);
     toggleLabelCollapse.appendChild(knobCollapse);
     rowCollapse.appendChild(toggleLabelCollapse);

     area.appendChild(rowCollapse);

     full.appendChild(area);

     document.body.appendChild(full);
 }

 // Full-screen personalization placeholder (same logic as settings)
 const PERSONAL_FULL_ID = 'personalization-fullscreen';
 function openPersonalization() {
     if (document.getElementById(PERSONAL_FULL_ID)) return;

     const full = document.createElement('div');
     full.id = PERSONAL_FULL_ID;
     Object.assign(full.style, {
         position: 'fixed',
         inset: '0',
         zIndex: 2000,
         background: '#18181b',
         color: '#e6eef6',
         display: 'flex',
         flexDirection: 'column',
         pointerEvents: 'auto'
     });

     const bar = document.createElement('div');
     Object.assign(bar.style, {
         height: '56px',
         display: 'flex',
         alignItems: 'center',
         justifyContent: 'flex-start',
         gap: '12px',
         padding: '0 16px',
         borderBottom: 'none'
     });

     const iconBtn = document.createElement('button');
     iconBtn.type = 'button';
     iconBtn.title = t('back');
     iconBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left-icon lucide-arrow-left"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>';
     Object.assign(iconBtn.style, {
         display: 'inline-flex',
         alignItems: 'center',
         justifyContent: 'center',
         background: 'transparent',
         border: 'none',
         color: '#e6eef6',
         cursor: 'pointer',
         padding: '6px',
         marginRight: '8px'
     });
     iconBtn.onclick = () => { if (full && full.parentNode) full.parentNode.removeChild(full); };

     bar.appendChild(iconBtn);

     const titleLabel = document.createElement('div');
     titleLabel.style.fontWeight = '700';
     titleLabel.style.fontSize = '1rem';
     titleLabel.style.color = '#e6eef6';
     titleLabel.textContent = t('personalization');
     bar.appendChild(titleLabel);

     const spacer2 = document.createElement('div');
     spacer2.style.flex = '1';
     bar.appendChild(spacer2);

     full.appendChild(bar);

     const area = document.createElement('div');
     Object.assign(area.style, {
         flex: '1',
         display: 'flex',
         flexDirection: 'column',
         padding: '24px 16px',
         gap: '24px',
         overflowY: 'auto'
     });

     // Helper to create input sections
     function createInputSection(title, subtitle, key, isTextArea = false) {
         const section = document.createElement('div');
         section.style.display = 'flex';
         section.style.flexDirection = 'column';
         section.style.gap = '8px';

         const label = document.createElement('div');
         label.textContent = title;
         label.style.fontWeight = '600';
         label.style.fontSize = '1rem';
         label.style.color = '#e6eef6';

         const sub = document.createElement('div');
         sub.textContent = subtitle;
         sub.style.fontSize = '0.8rem';
         sub.style.color = '#9aa5ad';

         const input = document.createElement(isTextArea ? 'textarea' : 'input');
         if (!isTextArea) input.type = 'text';
         else {
             input.rows = 4;
             input.style.resize = 'none';
         }

         Object.assign(input.style, {
             width: '100%',
             padding: '12px',
             background: '#1f1f23',
             border: '1px solid rgba(255,255,255,0.08)',
             borderRadius: '8px',
             color: '#e6eef6',
             fontSize: '0.9rem',
             outline: 'none',
             marginTop: '4px'
         });

         input.value = localStorage.getItem(key) || '';
         input.oninput = () => localStorage.setItem(key, input.value);

         section.appendChild(label);
         section.appendChild(sub);
         section.appendChild(input);
         return section;
     }

     area.appendChild(createInputSection(
         t('my_nickname'),
         t('my_nickname_sub'),
         'apex_user_nickname'
     ));

     area.appendChild(createInputSection(
         t('occupation'),
         t('occupation_sub'),
         'apex_user_occupation'
     ));

     area.appendChild(createInputSection(
         t('additional_instructions'),
         t('additional_instructions_sub'),
         'apex_user_instructions',
         true
     ));

     // Characteristics Tags Section
     function createCharacteristicsSection() {
         const section = document.createElement('div');
         section.style.display = 'flex';
         section.style.flexDirection = 'column';
         section.style.gap = '8px';

         const label = document.createElement('div');
         label.textContent = t('ai_characteristics');
         label.style.fontWeight = '600';
         label.style.fontSize = '1rem';
         label.style.color = '#e6eef6';

         const sub = document.createElement('div');
         sub.textContent = t('ai_characteristics_sub');
         sub.style.fontSize = '0.8rem';
         sub.style.color = '#9aa5ad';

         const inputWrapper = document.createElement('div');
         inputWrapper.style.display = 'flex';
         inputWrapper.style.gap = '8px';

         const input = document.createElement('input');
         input.type = 'text';
         input.placeholder = t('traits_placeholder');
         Object.assign(input.style, {
             flex: '1',
             padding: '12px',
             background: '#1f1f23',
             border: '1px solid rgba(255,255,255,0.08)',
             borderRadius: '8px',
             color: '#e6eef6',
             fontSize: '0.9rem',
             outline: 'none'
         });

         const addBtn = document.createElement('button');
         addBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>';
         Object.assign(addBtn.style, {
             width: '44px',
             height: '44px',
             display: 'flex',
             alignItems: 'center',
             justifyContent: 'center',
             background: '#4b5563',
             color: 'white',
             border: 'none',
             borderRadius: '8px',
             cursor: 'pointer',
             transition: 'opacity 0.2s'
         });

         const tagsContainer = document.createElement('div');
         tagsContainer.style.display = 'flex';
         tagsContainer.style.flexWrap = 'wrap';
         tagsContainer.style.gap = '8px';
         tagsContainer.style.marginTop = '4px';

         let characteristics = [];
         try {
             characteristics = JSON.parse(localStorage.getItem('apex_ai_characteristics')) || [];
         } catch(e) { characteristics = []; }

         const renderTags = () => {
             tagsContainer.innerHTML = '';
             characteristics.forEach((trait, index) => {
                 const tag = document.createElement('div');
                 Object.assign(tag.style, {
                     padding: '6px 12px',
                     background: '#27272a',
                     borderRadius: '99px',
                     color: '#f1f5f9',
                     fontSize: '0.85rem',
                     display: 'flex',
                     alignItems: 'center',
                     gap: '6px',
                     border: '1px solid rgba(255,255,255,0.05)',
                     animation: 'fade-in 0.2s ease-out'
                 });
                 
                 const text = document.createElement('span');
                 text.textContent = trait;
                 
                 const removeBtn = document.createElement('button');
                 removeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
                 Object.assign(removeBtn.style, {
                     background: 'transparent',
                     border: 'none',
                     color: '#9aa5ad',
                     cursor: 'pointer',
                     padding: '2px',
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center'
                 });
                 removeBtn.onclick = () => {
                     characteristics.splice(index, 1);
                     localStorage.setItem('apex_ai_characteristics', JSON.stringify(characteristics));
                     renderTags();
                 };

                 tag.appendChild(text);
                 tag.appendChild(removeBtn);
                 tagsContainer.appendChild(tag);
             });
         };

         addBtn.onclick = () => {
             const val = input.value.trim();
             if (val && !characteristics.includes(val)) {
                 characteristics.push(val);
                 localStorage.setItem('apex_ai_characteristics', JSON.stringify(characteristics));
                 input.value = '';
                 renderTags();
             }
         };

         input.onkeydown = (e) => {
             if (e.key === 'Enter') {
                 e.preventDefault();
                 addBtn.click();
             }
         };

         renderTags();

         inputWrapper.appendChild(input);
         inputWrapper.appendChild(addBtn);
         section.appendChild(label);
         section.appendChild(sub);
         section.appendChild(inputWrapper);
         section.appendChild(tagsContainer);
         return section;
     }

     area.appendChild(createCharacteristicsSection());

     full.appendChild(area);

     document.body.appendChild(full);
 }

 const LANGUAGES_FULL_ID = 'languages-fullscreen';
 function openLanguages() {
     if (document.getElementById(LANGUAGES_FULL_ID)) return;

     const full = document.createElement('div');
     full.id = LANGUAGES_FULL_ID;
     Object.assign(full.style, {
         position: 'fixed', inset: '0', zIndex: 2000,
         background: '#18181b', color: '#e6eef6',
         display: 'flex', flexDirection: 'column', pointerEvents: 'auto'
     });

     const bar = document.createElement('div');
     Object.assign(bar.style, {
         height: '56px', display: 'flex', alignItems: 'center',
         justifyContent: 'flex-start', gap: '12px', padding: '0 16px'
     });

     const iconBtn = document.createElement('button');
     iconBtn.type = 'button';
     iconBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>';
     Object.assign(iconBtn.style, {
         background: 'transparent', border: 'none', color: '#e6eef6', cursor: 'pointer', padding: '6px', marginRight: '8px'
     });
     iconBtn.onclick = () => full.remove();
     bar.appendChild(iconBtn);

     const titleLabel = document.createElement('div');
     Object.assign(titleLabel.style, { fontWeight: '700', fontSize: '1rem' });
     titleLabel.textContent = t('languages');
     bar.appendChild(titleLabel);
     full.appendChild(bar);

     const area = document.createElement('div');
     Object.assign(area.style, { flex: '1', display: 'flex', flexDirection: 'column', padding: '24px 16px', gap: '12px' });

     const currentLang = getLanguage();

     const createLangOption = (label, code) => {
         const btn = document.createElement('button');
         const isSelected = currentLang === code;
         btn.innerHTML = `<span>${label}</span>${isSelected ? '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>' : ''}`;
         Object.assign(btn.style, {
             padding: '16px', background: isSelected ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
             border: isSelected ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid rgba(255,255,255,0.05)',
             borderRadius: '12px', color: '#e6eef6', cursor: 'pointer',
             display: 'flex', alignItems: 'center', justifyContent: 'between', width: '100%',
             textAlign: 'left', fontWeight: isSelected ? '600' : '400', transition: 'all 0.2s'
         });
         btn.style.justifyContent = 'space-between';
         btn.onclick = () => {
             localStorage.setItem('apex_language', code);
             location.reload(); // Reload to apply all translations cleanly
         };
         return btn;
     };

     area.appendChild(createLangOption(t('portuguese'), 'pt'));
     area.appendChild(createLangOption(t('english'), 'en'));
     // Spanish Beta option
     area.appendChild(createLangOption(t('spanish'), 'es'));

     full.appendChild(area);
     document.body.appendChild(full);
 }

// ensure avatar click opens panel
function initAvatarHandler() {
    const avatar = document.getElementById(AVATAR_ID);
    if (!avatar) return;
    avatar.style.cursor = 'pointer';
    avatar.addEventListener('click', (e) => {
        e.stopPropagation();
        // toggle
        if (document.getElementById(PANEL_ID)) removePanel();
        else createProfilePanel();
    });
}

// Auto init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAvatarHandler);
} else {
    initAvatarHandler();
}