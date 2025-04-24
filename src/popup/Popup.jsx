import React, { useState, useCallback, useEffect } from 'react';
import './Popup.css';

const LOG_LEVEL = process.env.LOG_LEVEL || 'debug';

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

// Security constants
const ALLOWED_FILE_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
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

  // Utility function for sending messages to background
  const sendMessage = async (type, data = {}) => {
    console.log("hello world")
    if (!window.chrome?.runtime?.sendMessage) {
      log('warn', 'Chrome runtime API not available - running in standalone mode');
      return {success: false, error: 'Chrome runtime unavailable'};
    }

    console.log("hello world 1")

    try {

      const response = await new Promise(resolve => {
        chrome.runtime.sendMessage({type, ...data}, resolve)
      });

      console.log("hello world 2", response)

      
      if (response?.error) {
        log('debug', 'Message response failed', {type, response});
        throw new Error(response.error);
      }
      
      log('debug', 'Message response received', {type, response});
      return response;
    } catch (error) {
      log('error', 'Message failed', {type, error});
      throw error;
    }
  };

  // Listen for messages from background
  useEffect(() => {
    const messageListener = (message, sender, sendResponse) => {
      if (message.type === 'LLM_RESPONSE') {
        log('info', 'Received LLM response', {data: message.data});
        setLlmResponse(message.data);
        setProcessingTime(message.processingTime || 0);
      } else if (message.type === 'BACKGROUND_ERROR') {
        log('error', 'Background error', {error: message.error});
        setBackgroundError(message.error);
      } else if (message.type === 'FORM_FILLING_COMPLETE') {
        log('info', 'Form filling completed', {processingTime: message.processingTime});
        setProcessingTime(message.processingTime || 0);
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
      const errorMsg = `Invalid files detected. Only PDF/DOCX files under 10MB are allowed.`;
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

      // Send files to background for processing
      const response = await sendMessage('PROCESS_FILES', {
        files: droppedFiles.map(file => ({
          name: file.name,
          type: file.type,
          size: file.size
        }))
      });

      log("info", {response});

      if (response?.success) {
        setUploadState({
          loading: false,
          progress: 100,
          success: true,
          error: null
        });
      } else {
        throw new Error(response?.error || 'File processing failed');
      }
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
          </div>

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