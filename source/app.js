'use strict';

import { $ } from './shared/utils.js';
import { initFirebaseSync } from './shared/data-service.js';
import { initSearch, openSearch, closeSearch } from './shared/search.js';
import { initNavigation, closeNav, render } from './shared/navigation.js';
import { initAIAssistant } from './modules/ai-assistant/ai-chat.js';

initFirebaseSync();
initSearch();
initNavigation();

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    openSearch();
  }
  if (e.key === 'Escape') {
    closeSearch();
    closeNav();
    $('#campaign-modal')?.classList.remove('open');
  }
});

render();
initAIAssistant();
