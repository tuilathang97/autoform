// Mock Chrome Extension API for local development
const chrome = {
  runtime: {
    id: 'test-extension-id',
    sendMessage: (message, callback) => {
      console.log('[MOCK] chrome.runtime.sendMessage:', message);
      if (callback) {
        setTimeout(() => {
          if (Math.random() > 0.1) { // 90% success rate
            callback({status: 'success'});
          } else {
            throw new Error('Mock port closed error');
          }
        }, 100);
      }
      return Promise.resolve({status: 'success'});
    },
    onMessage: {
      addListener: (callback) => {
        console.log('[MOCK] chrome.runtime.onMessage listener added');
        // Simulate occasional incoming messages
        setInterval(() => {
          if (Math.random() > 0.8) { // 20% chance
            callback({type: 'mock_message', data: 'test'});
          }
        }, 5000);
      },
      removeListener: () => {}
    },
    getURL: (path) => `chrome-extension://test-extension-id/${path}`
  },
  storage: {
    local: {
      get: (keys, callback) => {
        console.log('[MOCK] chrome.storage.local.get:', keys);
        if (callback) setTimeout(() => callback({}), 100);
      },
      set: (items, callback) => {
        console.log('[MOCK] chrome.storage.local.set:', items);
        if (callback) setTimeout(callback, 100);
      }
    },
    sync: {
      get: (keys, callback) => {
        console.log('[MOCK] chrome.storage.sync.get:', keys);
        if (callback) setTimeout(() => callback({}), 100);
      },
      set: (items, callback) => {
        console.log('[MOCK] chrome.storage.sync.set:', items);
        if (callback) setTimeout(callback, 100);
      }
    }
  },
  tabs: {
    query: (queryInfo, callback) => {
      console.log('[MOCK] chrome.tabs.query:', queryInfo);
      if (callback) setTimeout(() => callback([{id: 1, url: 'http://localhost:5173'}]), 100);
    },
    sendMessage: (tabId, message, callback) => {
      console.log('[MOCK] chrome.tabs.sendMessage:', {tabId, message});
      if (callback) setTimeout(callback, 100);
    }
  }
};

export default chrome;