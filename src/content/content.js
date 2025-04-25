// Content script with programmatic injection handler
class ContentScript {
  constructor() {
    this.observer = null;
    this.domParser = null;
    this.setupMutationObserver();
    this.setupMessageHandlers();
    this.initializeDomParser();
  }

  setupMutationObserver() {
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
          this.injectScripts();
        }
      });
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  setupMessageHandlers() {
    chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
      console.log('Content script received message:', request);

      if (request.type === 'INJECT_SCRIPTS') {
        this.injectScripts().then(sendResponse);
        return true;
      }

      if (request.type === 'FILL_FORM') {
        this.fillForm(request.data)
          .then(result => {
            console.log('Form filling result:', result);
            sendResponse(result);
          })
          .catch(error => {
            console.error('Form filling error:', error);
            sendResponse({ success: false, error: error.message });
          });
        return true;
      }
    });
  }

  async initializeDomParser() {
    try {
      // Import the domParser module
      if (typeof window.parseDOM === 'function') {
        this.domParser = window.parseDOM(document);
        console.log('DOM parser initialized from global function');
        return;
      }

      // If not available globally, try to inject it
      console.log('parseDOM not found, injecting script...');
      await this.injectScripts();

      // Wait for the script to load with multiple attempts
      let attempts = 0;
      const maxAttempts = 5;

      while (attempts < maxAttempts) {
        // Wait a bit for the script to load
        await new Promise(resolve => setTimeout(resolve, 200));
        attempts++;

        if (typeof window.parseDOM === 'function') {
          this.domParser = window.parseDOM(document);
          console.log(`DOM parser initialized after ${attempts} attempts`);
          return;
        }

        console.log(`Attempt ${attempts}/${maxAttempts}: parseDOM not available yet`);
      }

      // If we get here, we couldn't initialize the DOM parser
      throw new Error(`Failed to initialize DOM parser after ${maxAttempts} attempts`);
    } catch (error) {
      console.error('Failed to initialize DOM parser:', error);

      // As a fallback, implement a basic DOM parser directly
      console.log('Creating fallback DOM parser');
      this.domParser = this.createFallbackDomParser();
    }
  }

  /**
   * Create a fallback DOM parser if the script injection fails
   * @returns {Object} A simple DOM parser with basic functionality
   */
  createFallbackDomParser() {
    return {
      find: (selector) => document.querySelector(selector),
      findAll: (selector) => Array.from(document.querySelectorAll(selector)),

      fillForm: (formElement, values) => {
        const startTime = performance.now();
        const errors = [];

        // Map form fields
        const fields = {};
        const inputs = formElement.querySelectorAll('input, select, textarea');

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

        // Fill form fields
        Object.entries(values).forEach(([name, value]) => {
          const field = fields[name];
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
                const radio = document.querySelector(`input[name="${name}"][value="${value}"]`);
                if (radio) radio.checked = true;
                else errors.push(`Invalid value for radio group: ${name}`);
                break;
              default:
                field.element.value = value;

                // Trigger events
                field.element.dispatchEvent(new Event('input', { bubbles: true }));
                field.element.dispatchEvent(new Event('change', { bubbles: true }));
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
      },

      measurePerformance(callback) {
        const start = performance.now();
        const result = callback();
        const duration = performance.now() - start;
        return { result, duration };
      }
    };
  }

  async injectScripts() {
    try {
      // Content scripts can't use chrome.scripting API directly
      // Instead, we'll dynamically inject the script into the page
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('domParser.js');
      script.onload = () => {
        console.log('domParser script loaded successfully');
        script.remove(); // Optional: remove the script tag after loading
      };
      (document.head || document.documentElement).appendChild(script);

      console.log('Scripts injected successfully');
      return { success: true };
    } catch (error) {
      console.error('Script injection failed:', error);
      return { success: false, error: error.message };
    }
  }

  async fillForm(data) {
    console.log('Filling form with data:', data);

    if (!data || !data.fields || !data.fields.length) {
      return { success: false, error: 'No form data provided' };
    }

    try {
      // Make sure DOM parser is initialized
      if (!this.domParser) {
        try {
          await this.initializeDomParser();
        } catch (error) {
          console.warn('Failed to initialize DOM parser, using direct DOM manipulation', error);
        }

        // If still no DOM parser, create a fallback
        if (!this.domParser) {
          console.log('Creating fallback DOM parser');
          this.domParser = this.createFallbackDomParser();
        }
      }

      // Find the form element
      const forms = document.querySelectorAll('form');
      if (forms.length === 0) {
        // If no form is found, try to find individual input fields
        const inputs = document.querySelectorAll('input, select, textarea');
        if (inputs.length === 0) {
          throw new Error('No form or input fields found on the page');
        }

        console.log(`No form found, but found ${inputs.length} input fields. Will attempt to fill them directly.`);

        // Create a virtual form-like object to pass to fillForm
        const virtualForm = document.createElement('div');
        inputs.forEach(input => virtualForm.appendChild(input.cloneNode(true)));

        // Convert fields array to object format expected by fillForm
        const fieldValues = {};
        data.fields.forEach(field => {
          fieldValues[field.name] = field.value;
        });

        // Fill the inputs directly
        data.fields.forEach(field => {
          const input = document.querySelector(`input[name="${field.name}"], input[id="${field.name}"], select[name="${field.name}"], select[id="${field.name}"], textarea[name="${field.name}"], textarea[id="${field.name}"]`);
          if (input) {
            console.log(`Filling field: ${field.name} with value: ${field.value}`);

            // Apply visual highlight to show the field is being filled
            const originalBg = input.style.backgroundColor;
            input.style.backgroundColor = '#f5fff0';
            input.style.transition = 'background-color 1s';

            // Set the value based on input type
            if (input.type === 'checkbox') {
              input.checked = Boolean(field.value);
            } else if (input.type === 'radio') {
              const radio = document.querySelector(`input[name="${field.name}"][value="${field.value}"]`);
              if (radio) radio.checked = true;
            } else {
              input.value = field.value;

              // Trigger input event to notify the page of the change
              const event = new Event('input', { bubbles: true });
              input.dispatchEvent(event);

              // Also trigger change event
              const changeEvent = new Event('change', { bubbles: true });
              input.dispatchEvent(changeEvent);
            }

            // Reset background color after a delay
            setTimeout(() => {
              input.style.backgroundColor = originalBg;
            }, 2000);
          } else {
            console.warn(`Field not found: ${field.name}`);
          }
        });

        // Send performance metrics back to the popup
        chrome.runtime.sendMessage({
          type: 'FORM_FILLING_COMPLETE',
          processingTime: 0,
          success: true,
          fieldsProcessed: data.fields.length
        });

        return { success: true, message: 'Filled fields directly' };
      }

      // Use the first form for now (could be enhanced to select the right form)
      const form = forms[0];
      console.log(`Found form with ${form.elements.length} elements`);

      // Convert fields array to object format expected by fillForm
      const fieldValues = {};
      data.fields.forEach(field => {
        fieldValues[field.name] = field.value;
      });

      // Add visual feedback for form filling
      this.addVisualFeedback(form, data.fields);

      // Fill the form using the DOM parser utility
      const result = this.domParser.fillForm(form, fieldValues);

      console.log('Form filling result:', result);

      // Auto-submit if configured and form filling was successful
      if (data.autoSubmit && result.success) {
        console.log('Auto-submitting form');

        // Add a small delay before submitting to allow for visual feedback
        setTimeout(() => {
          try {
            form.submit();
          } catch (submitError) {
            console.error('Error submitting form:', submitError);
          }
        }, 1000);
      }

      // Send performance metrics back to the popup
      chrome.runtime.sendMessage({
        type: 'FORM_FILLING_COMPLETE',
        processingTime: result.duration,
        success: result.success,
        errors: result.errors,
        fieldsProcessed: Object.keys(fieldValues).length
      });

      return result;
    } catch (error) {
      console.error('Error filling form:', error);

      // Send error back to the popup
      chrome.runtime.sendMessage({
        type: 'BACKGROUND_ERROR',
        error: error.message
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * Add visual feedback when filling form fields
   * @param {HTMLElement} form - The form element
   * @param {Array} fields - Array of field objects with name and value
   */
  addVisualFeedback(form, fields) {
    fields.forEach(field => {
      const input = form.querySelector(`[name="${field.name}"], #${field.name}`);
      if (input) {
        // Save original styles
        const originalBg = input.style.backgroundColor;
        const originalBorder = input.style.border;

        // Apply highlight
        input.style.backgroundColor = '#f5fff0';
        input.style.border = '1px solid #4caf50';
        input.style.transition = 'all 0.3s ease';

        // Create and append a small indicator
        const indicator = document.createElement('span');
        indicator.textContent = '✓';
        indicator.style.color = '#4caf50';
        indicator.style.position = 'absolute';
        indicator.style.right = '5px';
        indicator.style.top = '50%';
        indicator.style.transform = 'translateY(-50%)';
        indicator.style.fontSize = '12px';
        indicator.style.opacity = '0';
        indicator.style.transition = 'opacity 0.5s ease';

        // Make sure the input's parent has position relative
        if (window.getComputedStyle(input.parentElement).position === 'static') {
          input.parentElement.style.position = 'relative';
        }

        input.parentElement.appendChild(indicator);

        // Show the indicator
        setTimeout(() => {
          indicator.style.opacity = '1';
        }, 100);

        // Reset styles after a delay
        setTimeout(() => {
          input.style.backgroundColor = originalBg;
          input.style.border = originalBorder;

          // Fade out and remove the indicator
          indicator.style.opacity = '0';
          setTimeout(() => {
            if (indicator.parentElement) {
              indicator.parentElement.removeChild(indicator);
            }
          }, 500);
        }, 2000);
      }
    });
  }
}

// Initialize content script when the DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('Content script initializing on DOMContentLoaded');
    new ContentScript();
  });
} else {
  console.log('Content script initializing immediately');
  new ContentScript();
}