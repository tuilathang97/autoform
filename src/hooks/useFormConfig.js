/**
 * Custom hook for form configuration
 */
import { useState, useCallback } from 'react';
import logger from '../utils/logger';

/**
 * Hook for managing form configuration
 * @param {Object} initialConfig - Initial configuration
 * @returns {Object} - Form configuration state and handlers
 */
const useFormConfig = (initialConfig = {}) => {
  const [formConfig, setFormConfig] = useState({
    autoSubmit: false,
    fieldMapping: {},
    validationRules: {},
    ...initialConfig
  });

  const updateConfig = useCallback((key, value) => {
    logger.debug('Form config changed', { [key]: value });
    setFormConfig(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const toggleAutoSubmit = useCallback(() => {
    updateConfig('autoSubmit', !formConfig.autoSubmit);
  }, [formConfig.autoSubmit, updateConfig]);

  return {
    formConfig,
    updateConfig,
    toggleAutoSubmit
  };
};

export default useFormConfig;
