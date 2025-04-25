/**
 * Chrome extension API utilities
 */
import logger from './logger';
import { MESSAGE_TYPES } from './constants';

/**
 * Send a message to the background script
 * @param {string} type - Message type
 * @param {Object} data - Message data
 * @returns {Promise<Object>} - Promise resolving to response from background script
 */
export const sendMessage = (type, data = {}) => {
  return new Promise((resolve, reject) => {
    logger.debug('Sending message', { type, data });
    
    if (!window.chrome?.runtime?.sendMessage) {
      logger.warn('Chrome runtime API not available - running in standalone mode');
      reject(new Error('Chrome runtime unavailable'));
      return;
    }

    window.chrome.runtime.sendMessage(
      { type, ...data },
      function(response) {
        logger.info('Received response from background', { response });
        
        try {
          // Parse the response if it's a string
          const parsedResponse = typeof response === 'string' ? JSON.parse(response) : response;
          resolve(parsedResponse);
        } catch (error) {
          logger.error('Error processing response', { error, response });
          reject(error);
        }
      }
    );
  });
};

/**
 * Send a message to the active tab's content script
 * @param {string} type - Message type
 * @param {Object} data - Message data
 * @returns {Promise<Object>} - Promise resolving to response from content script
 */
export const sendMessageToActiveTab = (type, data = {}) => {
  return new Promise((resolve, reject) => {
    if (!window.chrome?.tabs?.query) {
      logger.warn('Chrome tabs API not available - running in standalone mode');
      reject(new Error('Chrome tabs API unavailable'));
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs && tabs.length > 0) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { type, data },
          function(response) {
            logger.info(`Response from content script for ${type}`, { response });
            resolve(response);
          }
        );
      } else {
        const error = 'No active tab found';
        logger.error(error);
        reject(new Error(error));
      }
    });
  });
};
