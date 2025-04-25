import React, { useState, useCallback, useEffect } from 'react';
import './Popup.css';

const LOG_LEVEL = process.env.LOG_LEVEL || 'debug';

function log(level, message, data = {}) {
  if (LOG_LEVEL === 'silent') return;

  const timestamp = new Date().toISOString();
  const logEntry = {timestamp, level, message, ...data};

  if (level === 'debug') {
    console.debug(JSON.stringify(logEntry));
  } else if (level === 'error') {
    console.error(JSON.stringify(logEntry));
  } else if (level === 'warn') {
    console.warn(JSON.stringify(logEntry));
  } else {
    console.log(JSON.stringify(logEntry));
  }
}

// Security constants
const ALLOWED_FILE_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel' // .xls
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const Popup = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState([]);
  const [formConfig, setFormConfig] = useState({
    autoSubmit: false,
    fieldMapping: {},
    validationRules: {}
  });
  const [llmResponse, setLlmResponse] = useState(null);
  const [processingTime, setProcessingTime] = useState(0);
  const [backgroundError, setBackgroundError] = useState(null);
  const [formFields, setFormFields] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [formFillStatus, setFormFillStatus] = useState({
    success: false,
    fieldsProcessed: 0,
    errors: []
  });

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    log('debug', 'Drag enter event');
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  const [error, setError] = useState(null);
  const [uploadState, setUploadState] = useState({
    loading: false,
    progress: 0,
    success: false,
    error: null
  });

  const sendMessage = (type, data = {}) => {
    log('debug', 'Sending message', {type, data});
    if (!window.chrome?.runtime?.sendMessage) {
      log('warn', 'Chrome runtime API not available - running in standalone mode');
      return {success: false, error: 'Chrome runtime unavailable'};
    }

    // Set processing state to true when sending a message
    if (type === 'PROCESS_FILES') {
      setIsProcessing(true);
    }

    window.chrome.runtime.sendMessage(
      {type, ...data},
      function(response) {
        log('info', 'Received response from background', {response});

        try {
          // Parse the response if it's a string
          const parsedResponse = typeof response === 'string' ? JSON.parse(response) : response;

          if (parsedResponse && parsedResponse.success) {
            // Update state with the processed data
            setUploadState({
              loading: false,
              progress: 100,
              success: true,
              error: null
            });

            // Extract form field data from the response
            if (parsedResponse.results && parsedResponse.results.length > 0) {
              const fileData = parsedResponse.results[0].data;

              if (fileData && fileData.fields) {
                // Update form fields state
                setFormFields(fileData.fields);

                // Send message to content script to fill the form
                log('info', 'Sending form data to content script', {fields: fileData.fields});
                chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                  if (tabs && tabs.length > 0) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                      type: 'FILL_FORM',
                      data: {
                        fields: fileData.fields,
                        autoSubmit: formConfig.autoSubmit
                      }
                    }, function(fillResponse) {
                      log('info', 'Form filling response', {fillResponse});
                      setIsProcessing(false);
                    });
                  } else {
                    log('error', 'No active tab found');
                    setBackgroundError('No active tab found to fill form');
                    setIsProcessing(false);
                  }
                });
              }
            }
          } else if (parsedResponse && parsedResponse.error) {
            // Handle error in response
            log('error', 'Error in response', {error: parsedResponse.error});
            setUploadState({
              loading: false,
              progress: 0,
              success: false,
              error: parsedResponse.error
            });
            setIsProcessing(false);
          }
        } catch (error) {
          log('error', 'Error processing response', {error, response});
          setUploadState({
            loading: false,
            progress: 0,
            success: false,
            error: 'Failed to process response'
          });
          setIsProcessing(false);
        }
      }
    );
  };

  // Listen for messages from background
  useEffect(() => {
    const messageListener = (message) => {
      if (message.type === 'LLM_RESPONSE') {
        log('info', 'Received LLM response', {data: message.data});
        setLlmResponse(message.data);
        setProcessingTime(message.processingTime || 0);
      } else if (message.type === 'BACKGROUND_ERROR') {
        log('error', 'Background error', {error: message.error});
        setBackgroundError(message.error);
        setIsProcessing(false);
        setFormFillStatus(prev => ({
          ...prev,
          success: false,
          errors: [...prev.errors, message.error]
        }));
      } else if (message.type === 'FORM_FILLING_COMPLETE') {
        log('info', 'Form filling completed', {
          processingTime: message.processingTime,
          success: message.success,
          fieldsProcessed: message.fieldsProcessed,
          errors: message.errors
        });

        setProcessingTime(message.processingTime || 0);
        setIsProcessing(false);
        setFormFillStatus({
          success: message.success,
          fieldsProcessed: message.fieldsProcessed || 0,
          errors: message.errors || []
        });
      }
      return true;
    };

    if (window.chrome?.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener(messageListener);
      return () => chrome.runtime.onMessage.removeListener(messageListener);
    }

    log('warn', 'Chrome runtime API not available - running in standalone mode');
    return () => {};
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    log('debug', 'Drag leave event');
    setIsDragging(false);
    log('debug', 'Drop event triggered');
    setError(null);
    setUploadState({
      loading: false,
      progress: 0,
      success: false,
      error: null
    });

    const droppedFiles = Array.from(e.dataTransfer.files);

    // Validate files
    const invalidFiles = droppedFiles.filter(file =>
      !ALLOWED_FILE_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE
    );

    if (invalidFiles.length > 0) {
      const errorMsg = `Invalid files detected. Only Excel files (.xlsx, .xls) under 10MB are allowed.`;
      log('error', 'Invalid files detected', {invalidFiles});
      setError(errorMsg);
      return;
    }

    log('info', 'Files accepted for processing', {files: droppedFiles.map(f => f.name)});
    setFiles(droppedFiles);

    try {
      setUploadState({
        loading: true,
        progress: 0,
        success: false,
        error: null
      });

      // Read file content and send to background
      const fileReaders = droppedFiles.map(file => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve({
            name: file.name,
            type: file.type,
            size: file.size,
            content: e.target.result
          });
          reader.readAsDataURL(file);
        });
      });

      const filesWithContent = await Promise.all(fileReaders);
      sendMessage('PROCESS_FILES', {
        files: filesWithContent
      });
    } catch (error) {
      log('error', 'File upload failed', {error});
      setUploadState({
        loading: false,
        progress: 0,
        success: false,
        error: error.message
      });
    }
  }, [sendMessage]);

  return (
    <div className="popup-container">
      <h1>Extension Popup</h1>

      {isProcessing && (
        <div className="processing-indicator">
          <p>Processing form data...</p>
          <div className="spinner"></div>
        </div>
      )}

      <div
        className={`drop-zone ${isDragging ? 'dragging' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {isDragging ? (
          <p>Drop files here</p>
        ) : (
          <p>Drag and drop files here</p>
        )}
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {files.length > 0 && (
        <div className="file-list">
          <h3>Dropped Files:</h3>
          <ul>
            {files.map((file, index) => (
              <li key={index}>
                {file.name}
                {uploadState.loading && (
                  <span className="upload-status"> (Uploading...)</span>
                )}
                {uploadState.success && (
                  <span className="upload-success"> ✓</span>
                )}
                {uploadState.error && (
                  <span className="upload-error"> ✗</span>
                )}
              </li>
            ))}
          </ul>

          {uploadState.loading && (
            <div className="upload-progress">
              <progress value={uploadState.progress} max="100" />
              <span>{uploadState.progress}%</span>
            </div>
          )}

          <div className="form-config-section">
            <h3>Form Configuration</h3>
            <div className="config-option">
              <label>
                <input
                  type="checkbox"
                  checked={formConfig.autoSubmit}
                  onChange={(e) => {
                    log('debug', 'Form config changed', {autoSubmit: e.target.checked});
                    setFormConfig({...formConfig, autoSubmit: e.target.checked});
                  }}
                />
                Auto-submit after filling
              </label>
            </div>

            {formFields.length > 0 && !isProcessing && (
              <button
                className="fill-form-button"
                onClick={() => {
                  setIsProcessing(true);
                  setFormFillStatus({
                    success: false,
                    fieldsProcessed: 0,
                    errors: []
                  });

                  log('info', 'Manually triggering form fill');
                  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                    if (tabs && tabs.length > 0) {
                      chrome.tabs.sendMessage(tabs[0].id, {
                        type: 'FILL_FORM',
                        data: {
                          fields: formFields,
                          autoSubmit: formConfig.autoSubmit
                        }
                      });
                    } else {
                      log('error', 'No active tab found');
                      setBackgroundError('No active tab found to fill form');
                      setIsProcessing(false);
                    }
                  });
                }}
              >
                Fill Form Now
              </button>
            )}
          </div>

          {formFields.length > 0 && (
            <div className="form-fields">
              <h3>Form Fields to Fill</h3>
              <ul>
                {formFields.map((field, index) => (
                  <li key={index}>
                    <strong>{field.name}</strong>: {field.value}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {formFillStatus.fieldsProcessed > 0 && (
            <div className={`form-fill-status ${formFillStatus.success ? 'success' : 'error'}`}>
              <h3>Form Fill Status</h3>
              <p>
                <strong>Status:</strong> {formFillStatus.success ? 'Success' : 'Error'}
              </p>
              <p>
                <strong>Fields Processed:</strong> {formFillStatus.fieldsProcessed}
              </p>
              {formFillStatus.errors && formFillStatus.errors.length > 0 && (
                <div className="fill-errors">
                  <strong>Errors:</strong>
                  <ul>
                    {formFillStatus.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {llmResponse && (
            <div className="llm-response">
              <h3>LLM Analysis</h3>
              <pre>{JSON.stringify(llmResponse, null, 2)}</pre>
            </div>
          )}

          {processingTime > 0 && (
            <div className="performance-metrics">
              <h3>Performance</h3>
              <p>Processing time: {processingTime}ms</p>
            </div>
          )}

          {backgroundError && (
            <div className="error-message">
              <h3>Background Error</h3>
              <p>{backgroundError}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Popup;