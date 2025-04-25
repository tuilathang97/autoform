/**
 * Application constants
 */

// Security constants
export const ALLOWED_FILE_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel' // .xls
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Message types
export const MESSAGE_TYPES = {
  PROCESS_FILES: 'PROCESS_FILES',
  FILL_FORM: 'FILL_FORM',
  LLM_RESPONSE: 'LLM_RESPONSE',
  BACKGROUND_ERROR: 'BACKGROUND_ERROR',
  FORM_FILLING_COMPLETE: 'FORM_FILLING_COMPLETE'
};
