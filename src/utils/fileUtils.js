/**
 * File handling utilities
 */
import logger from './logger';
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from './constants';

/**
 * Validate files against allowed types and size limits
 * @param {File[]} files - Array of files to validate
 * @returns {Object} - Validation result with status and error message if any
 */
export const validateFiles = (files) => {
  const invalidFiles = files.filter(file =>
    !ALLOWED_FILE_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE
  );

  if (invalidFiles.length > 0) {
    const errorMsg = `Invalid files detected. Only Excel files (.xlsx, .xls) under 10MB are allowed.`;
    logger.error('Invalid files detected', { invalidFiles });
    return { valid: false, error: errorMsg };
  }

  logger.info('Files validated successfully', { files: files.map(f => f.name) });
  return { valid: true };
};

/**
 * Read file content as data URL
 * @param {File} file - File to read
 * @returns {Promise<Object>} - Promise resolving to file data object
 */
export const readFileAsDataURL = (file) => {
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
};

/**
 * Process multiple files and read their content
 * @param {File[]} files - Array of files to process
 * @returns {Promise<Array>} - Promise resolving to array of file data objects
 */
export const processFiles = async (files) => {
  try {
    const fileReaders = files.map(file => readFileAsDataURL(file));
    return await Promise.all(fileReaders);
  } catch (error) {
    logger.error('File processing failed', { error });
    throw new Error('Failed to process files: ' + error.message);
  }
};
