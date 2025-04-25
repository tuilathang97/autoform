/**
 * Custom hook for drag and drop file functionality
 */
import { useState, useCallback } from 'react';
import logger from '../utils/logger';
import { validateFiles, processFiles } from '../utils/fileUtils';

/**
 * Hook for handling drag and drop file operations
 * @returns {Object} - Drag and drop state and handlers
 */
const useDragDrop = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState(null);
  const [uploadState, setUploadState] = useState({
    loading: false,
    progress: 0,
    success: false,
    error: null
  });

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    logger.debug('Drag enter event');
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    setIsDragging(false);
    logger.debug('Drop event triggered');
    setError(null);
    setUploadState({
      loading: false,
      progress: 0,
      success: false,
      error: null
    });

    const droppedFiles = Array.from(e.dataTransfer.files);
    
    // Validate files
    const validation = validateFiles(droppedFiles);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setFiles(droppedFiles);
    setUploadState({
      loading: true,
      progress: 0,
      success: false,
      error: null
    });

    return droppedFiles;
  }, []);

  const resetUploadState = () => {
    setUploadState({
      loading: false,
      progress: 0,
      success: false,
      error: null
    });
  };

  const setUploadSuccess = () => {
    setUploadState({
      loading: false,
      progress: 100,
      success: true,
      error: null
    });
  };

  const setUploadError = (errorMessage) => {
    setUploadState({
      loading: false,
      progress: 0,
      success: false,
      error: errorMessage
    });
  };

  return {
    isDragging,
    files,
    error,
    uploadState,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    setUploadSuccess,
    setUploadError,
    resetUploadState
  };
};

export default useDragDrop;
