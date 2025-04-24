// Content script with programmatic injection handler
class ContentScript {
  constructor() {
    this.observer = null;
    this.setupMutationObserver();
    this.setupMessageHandlers();
  }

  setupMutationObserver() {
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
          this.injectScripts();
        }
      });
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  setupMessageHandlers() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === 'INJECT_SCRIPTS') {
        this.injectScripts().then(sendResponse);
        return true;
      }
    });
  }

  async injectScripts() {
    try {
      await chrome.scripting.executeScript({
        target: {tabId: (await chrome.runtime.sendMessage({type: 'GET_TAB_ID'})).tabId},
        files: ['domParser.js']
      });
      console.log('Scripts injected successfully');
    } catch (error) {
      console.error('Script injection failed:', error);
    }
  }
}

// Initialize content script
new ContentScript();