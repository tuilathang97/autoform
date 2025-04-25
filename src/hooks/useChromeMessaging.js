/**
 * Custom hook for Chrome extension messaging
 */
import { useState, useEffect, useCallback } from 'react';
import logger from '../utils/logger';
import { sendMessage, sendMessageToActiveTab } from '../utils/chromeUtils';
import { MESSAGE_TYPES } from '../utils/constants';
import { processFiles } from '../utils/fileUtils';

/**
 * Hook for handling Chrome extension messaging
 * @param {Object} options - Configuration options
 * @returns {Object} - Messaging state and handlers
 */
const useChromeMessaging = ({ onProcessingStart, onProcessingEnd }) => {
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

  // Send message to background script
  const handleSendMessage = useCallback(async (type, data = {}) => {
    try {
      if (type === MESSAGE_TYPES.PROCESS_FILES) {
        setIsProcessing(true);
        if (onProcessingStart) onProcessingStart();
      }

      const response = await sendMessage(type, data);
      
      if (response && response.success) {
        if (type === MESSAGE_TYPES.PROCESS_FILES && response.results && response.results.length > 0) {
          const fileData = response.results[0].data;
          
          if (fileData && fileData.fields) {
            setFormFields(fileData.fields);
            
            try {
              await sendMessageToActiveTab(MESSAGE_TYPES.FILL_FORM, {
                fields: fileData.fields,
                autoSubmit: data.autoSubmit || false
              });
            } catch (error) {
              setBackgroundError('Failed to send form data to content script: ' + error.message);
              setIsProcessing(false);
              if (onProcessingEnd) onProcessingEnd();
            }
          }
        }
        return response;
      } else if (response && response.error) {
        setBackgroundError(response.error);
        setIsProcessing(false);
        if (onProcessingEnd) onProcessingEnd();
        throw new Error(response.error);
      }
    } catch (error) {
      logger.error('Message sending failed', { type, error });
      setBackgroundError(error.message);
      setIsProcessing(false);
      if (onProcessingEnd) onProcessingEnd();
      throw error;
    }
  }, [onProcessingStart, onProcessingEnd]);

  // Process files and send to background
  const processAndSendFiles = useCallback(async (files, autoSubmit = false) => {
    try {
      const filesWithContent = await processFiles(files);
      return await handleSendMessage(MESSAGE_TYPES.PROCESS_FILES, {
        files: filesWithContent,
        autoSubmit
      });
    } catch (error) {
      logger.error('File processing and sending failed', { error });
      throw error;
    }
  }, [handleSendMessage]);

  // Fill form with existing form fields
  const fillForm = useCallback(async (autoSubmit = false) => {
    if (formFields.length === 0) {
      logger.warn('No form fields to fill');
      return;
    }

    setIsProcessing(true);
    if (onProcessingStart) onProcessingStart();
    
    setFormFillStatus({
      success: false,
      fieldsProcessed: 0,
      errors: []
    });

    try {
      await sendMessageToActiveTab(MESSAGE_TYPES.FILL_FORM, {
        fields: formFields,
        autoSubmit
      });
    } catch (error) {
      setBackgroundError('Failed to send form data to content script: ' + error.message);
      setIsProcessing(false);
      if (onProcessingEnd) onProcessingEnd();
    }
  }, [formFields, onProcessingStart, onProcessingEnd]);

  // Listen for messages from background
  useEffect(() => {
    const messageListener = (message) => {
      if (message.type === MESSAGE_TYPES.LLM_RESPONSE) {
        logger.info('Received LLM response', { data: message.data });
        setLlmResponse(message.data);
        setProcessingTime(message.processingTime || 0);
      } else if (message.type === MESSAGE_TYPES.BACKGROUND_ERROR) {
        logger.error('Background error', { error: message.error });
        setBackgroundError(message.error);
        setIsProcessing(false);
        if (onProcessingEnd) onProcessingEnd();
        setFormFillStatus(prev => ({
          ...prev,
          success: false,
          errors: [...prev.errors, message.error]
        }));
      } else if (message.type === MESSAGE_TYPES.FORM_FILLING_COMPLETE) {
        logger.info('Form filling completed', {
          processingTime: message.processingTime,
          success: message.success,
          fieldsProcessed: message.fieldsProcessed,
          errors: message.errors
        });

        setProcessingTime(message.processingTime || 0);
        setIsProcessing(false);
        if (onProcessingEnd) onProcessingEnd();
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

    logger.warn('Chrome runtime API not available - running in standalone mode');
    return () => {};
  }, [onProcessingEnd]);

  return {
    llmResponse,
    processingTime,
    backgroundError,
    formFields,
    isProcessing,
    formFillStatus,
    sendMessage: handleSendMessage,
    processAndSendFiles,
    fillForm,
    setBackgroundError
  };
};

export default useChromeMessaging;
