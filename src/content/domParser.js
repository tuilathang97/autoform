/**
 * DOM Parser and Form Handler
 * Provides utilities for DOM querying and form manipulation
 */
export function parseDOM(element = document) {
  // Helper functions for DOM manipulation
  const domUtils = {
    find: (selector) => element.querySelector(selector),
    findAll: (selector) => Array.from(element.querySelectorAll(selector)),
    getText: (selector) => element.querySelector(selector)?.textContent?.trim(),
    getAttribute: (selector, attr) => element.querySelector(selector)?.getAttribute(attr)
  };

  // Form handling functions
  const formUtils = {
    /**
     * Identify and map form fields
     * @param {HTMLElement} formElement - The form element
     * @returns {Object} Field mapping {fieldName: {element, type, required}}
     */
    mapFormFields(formElement) {
      const fields = {};
      const inputs = domUtils.findAll(formElement, 'input, select, textarea');
      
      inputs.forEach(input => {
        const name = input.name || input.id;
        if (name) {
          fields[name] = {
            element: input,
            type: input.type,
            required: input.required || input.hasAttribute('required')
          };
        }
      });
      
      return fields;
    },

    /**
     * Fill form with values after validation
     * @param {HTMLElement} formElement - The form element
     * @param {Object} values - Field values {fieldName: value}
     * @returns {Object} {success: boolean, errors: Array}
     */
    fillForm(formElement, values) {
      const startTime = performance.now();
      const fieldMap = this.mapFormFields(formElement);
      const errors = [];
      
      Object.entries(values).forEach(([name, value]) => {
        const field = fieldMap[name];
        if (!field) {
          errors.push(`Field not found: ${name}`);
          return;
        }

        try {
          // Validate and set value
          if (field.required && !value) {
            throw new Error(`Required field missing value: ${name}`);
          }

          switch (field.type) {
            case 'checkbox':
              field.element.checked = Boolean(value);
              break;
            case 'radio':
              const radio = domUtils.find(`input[name="${name}"][value="${value}"]`);
              if (radio) radio.checked = true;
              else errors.push(`Invalid value for radio group: ${name}`);
              break;
            default:
              field.element.value = value;
          }
        } catch (error) {
          errors.push(error.message);
        }
      });

      const duration = performance.now() - startTime;
      return {
        success: errors.length === 0,
        errors,
        duration
      };
    }
  };

  return {
    ...domUtils,
    ...formUtils,
    /**
     * Performance measurement hook
     * @param {Function} callback - Function to measure
     * @returns {Object} {result, duration}
     */
    measurePerformance(callback) {
      const start = performance.now();
      const result = callback();
      const duration = performance.now() - start;
      return { result, duration };
    }
  };
}