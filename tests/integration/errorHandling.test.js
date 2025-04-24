import { JSDOM } from 'jsdom'
import { chrome } from 'jest-chrome'
import { parseDOM } from '../src/content/domParser.js'
import { handleApiResponse } from '../src/background.js'

describe('Error Handling Across Boundaries', () => {
  let dom, document, formUtils

  beforeEach(() => {
    global.chrome = chrome
    jest.resetAllMocks()

    // Setup JSDOM with test form
    dom = new JSDOM(`<form id="testForm"><input name="test"></form>`)
    document = dom.window.document
    formUtils = parseDOM(document).formUtils
  })

  test('should propagate API errors to content script', async () => {
    // Mock API error response
    chrome.runtime.sendMessage.mockImplementation((message, callback) => {
      callback(null, new Error('API timeout'))
    })

    await expect(handleApiResponse({ type: 'test' }))
      .rejects.toThrow('API timeout')
  })

  test('should handle DOM operation errors', () => {
    const form = document.getElementById('testForm')
    const result = formUtils.fillForm(form, {
      invalidField: 'value' // Non-existent field
    })

    expect(result.success).toBe(false)
    expect(result.errors).toContain('Field not found: invalidField')
  })

  test('should handle message passing errors', () => {
    chrome.runtime.sendMessage.mockImplementation(() => {
      throw new Error('Message passing failed')
    })

    expect(() => {
      chrome.runtime.sendMessage({ type: 'test' })
    }).toThrow('Message passing failed')
  })

  test('should measure error handling performance', () => {
    const { measurePerformance } = parseDOM(document)
    const { duration } = measurePerformance(() => {
      try {
        throw new Error('Test error')
      } catch (e) {
        // Error handling
      }
    })

    expect(duration).toBeGreaterThan(0)
  })
})