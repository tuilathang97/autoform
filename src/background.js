// Background service worker for secure message passing
const LOG_LEVEL = process.env.LOG_LEVEL || 'debug';

if (!process.env.IS_EXTENSION) {
  console.log('Running in standalone mode - using mock chrome API');
  window.chrome = require('../mocks/chrome').default;
}

function log(level, message, data = {}) {
  if (LOG_LEVEL === 'silent') return;
  if (level === 'debug' && LOG_LEVEL !== 'debug') return;
  
  const timestamp = new Date().toISOString();
  const logEntry = {timestamp, level, message, ...data};
  
  if (level === 'error') {
    console.error(JSON.stringify(logEntry));
  } else if (level === 'warn') {
    console.warn(JSON.stringify(logEntry));
  } else {
    console.log(JSON.stringify(logEntry));
  }
}

// Rate limiting configuration
const RATE_LIMIT = {
  WINDOW_MS: 60000, // 1 minute
  MAX_REQUESTS: 30  // 30 requests per minute
};

const requestCounts = new Map();

// Reset request counts periodically
setInterval(() => {
  requestCounts.clear();
}, RATE_LIMIT.WINDOW_MS);

// Security verification functions
function isValidExtensionSender(sender) {
  if (!process.env.IS_EXTENSION) {
    // In standalone mode, allow messages from any origin
    return true;
  }
  const isValid = sender.url && sender.url.startsWith('chrome-extension://');
  log('debug', 'Extension sender validation', {sender, isValid});
  return isValid;
}

function isValidContentScriptSender(sender) {
  const isValid = sender.tab && sender.tab.id;
  log('debug', 'Content script sender validation', {sender, isValid});
  return isValid;
}

const messageHandlers = {
  GET_TAB_ID: async (request, sender) => {
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    log('info', 'Getting active tab ID', {tabId: tab.id});
    return {tabId: tab.id};
  },
  
  PROCESS_API_RESPONSE: (request, sender) => {
    // Validate and sanitize API response before forwarding
    if (isValidResponse(request.data)) {
      const sanitized = sanitizeResponse(request.data);
      log('debug', 'Processed API response', {original: request.data, sanitized});
      return {data: sanitized};
    }
    throw new Error('Invalid API response');
  },

  PROCESS_FILES: async (request, sender) => {
    try {
      log('info', 'Processing files', {files: request.files});
      if (!request.files?.length) {
        throw new Error('No files provided');
      }

      // Process each file based on type
      const results = [];
      for (const file of request.files) {
        if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          results.push(await extractFormData(file));
        } else {
          log('warn', 'Unsupported file type', {file});
        }
      }

      return {
        success: true,
        results,
        timestamp: Date.now()
      };
    } catch (error) {
      log('error', 'File processing failed', {error});
      return {
        success: false,
        error: error.message
      };
    }
  },

  PROCESS_DOCX: async (request, sender) => {
    try {
      log('info', 'Processing DOCX file', {file: request.file});
      // Validate file exists
      if (!request.file) {
        log('error', 'No file provided for processing');
        throw new Error('No file provided');
      }

      // Process docx file and extract form data
      const formData = await extractFormData(request.file);
      
      return {
        success: true,
        formData,
        timestamp: Date.now()
      };
    } catch (error) {
      log('error', 'DOCX processing failed', {error: error.message, stack: error.stack});
      return {
        success: false,
        error: error.message
      };
    }
  }
};

// Validate API response structure
function isValidResponse(data) {
  return data && typeof data === 'object' && 
         'data' in data && 'meta' in data;
}

// Extract form data from docx file
async function extractFormData(file) {
  // TODO: Implement actual docx parsing
  // For now return mock data matching expected form structure
  return {
    fields: [
      {
        name: 'firstName',
        type: 'text',
        value: ''
      },
      {
        name: 'lastName',
        type: 'text',
        value: ''
      },
      {
        name: 'email',
        type: 'email',
        value: ''
      }
    ]
  };
}

// Sanitize response data
function sanitizeResponse(data) {
  // Implement sanitization logic based on API contract
  return {
    data: data.data,
    meta: {
      requestId: data.meta.requestId,
      timestamp: data.meta.timestamp
    }
  };
}

// Main message handler with verification and rate limiting
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  try {
    log('debug', 'Received message', {request, sender});

    // Verify sender is either extension page or content script
    if (!isValidExtensionSender(sender) && !isValidContentScriptSender(sender)) {
      log('warn', 'Message from untrusted source', {sender});
      sendResponse({error: 'Untrusted message source'});
      return false;
    }

    // Rate limiting
    const senderKey = sender.tab?.id || sender.url;
    const currentCount = requestCounts.get(senderKey) || 0;
    
    if (currentCount >= RATE_LIMIT.MAX_REQUESTS) {
      log('warn', 'Rate limit exceeded', {senderKey, currentCount});
      sendResponse({error: 'Rate limit exceeded. Please try again later.'});
      return false;
    }
    
    requestCounts.set(senderKey, currentCount + 1);

    // Verify message type exists and is allowed
    if (!messageHandlers[request.type]) {
      log('warn', 'Unknown message type', {type: request.type});
      sendResponse({error: 'Invalid message type'});
      return false;
    }

    // Additional verification for sensitive operations
    if (request.type === 'PROCESS_FILES' && !isValidExtensionSender(sender)) {
      log('warn', 'File processing attempted from untrusted source', {sender});
      sendResponse({error: 'Unauthorized file processing request'});
      return false;
    }

    try {
      // Handle message with async/await
      if (messageHandlers[request.type]) {
        messageHandlers[request.type](request, sender)
          .then(response => sendResponse(response))
          .catch(error => sendResponse({error: error.message}));
        
        // Keep the message port open for async operations
        return true;
      }
      
      log('warn', 'No handler found for message type', {type: request.type});
      sendResponse({error: 'No handler found for message type'});
      return false;
    } catch (error) {
      log('error', 'Unexpected error in message listener', {error});
      sendResponse({error: 'Internal server error'});
      return false;
    }
  } catch(e) {
    log("error", e)
  }
});

// Initialize background service worker
log('info', 'Background service worker initialized');