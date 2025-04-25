import React from 'react';
import './Popup.css';
import logger from '../utils/logger';
import useDragDrop from '../hooks/useDragDrop';
import useChromeMessaging from '../hooks/useChromeMessaging';
import useFormConfig from '../hooks/useFormConfig';

const Popup = () => {
  // Initialize hooks
  const { formConfig, updateConfig } = useFormConfig();

  const {
    isDragging,
    files,
    error,
    uploadState,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    setUploadSuccess,
    setUploadError
  } = useDragDrop();

  const {
    llmResponse,
    processingTime,
    backgroundError,
    formFields,
    isProcessing,
    formFillStatus,
    processAndSendFiles,
    fillForm
  } = useChromeMessaging({
    onProcessingStart: () => logger.info('Processing started'),
    onProcessingEnd: () => logger.info('Processing ended')
  });

  // Handle file drop and processing
  const handleFileDropAndProcess = async (e) => {
    const droppedFiles = await handleDrop(e);
    if (droppedFiles && droppedFiles.length > 0) {
      try {
        await processAndSendFiles(droppedFiles, formConfig.autoSubmit);
        setUploadSuccess();
      } catch (error) {
        setUploadError(error.message);
      }
    }
  };

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
        onDrop={handleFileDropAndProcess}
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
                  onChange={(e) => updateConfig('autoSubmit', e.target.checked)}
                />
                Auto-submit after filling
              </label>
            </div>

            {formFields.length > 0 && !isProcessing && (
              <button
                className="fill-form-button"
                onClick={() => fillForm(formConfig.autoSubmit)}
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