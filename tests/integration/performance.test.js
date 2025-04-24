import { JSDOM } from 'jsdom'
import { chrome } from 'jest-chrome'
import { parseDOM } from '../src/content/domParser.js'
import { handleApiResponse } from '../src/background.js'

describe('Performance Benchmarks', () => {
  let dom, document, formUtils

  beforeEach(() => {
    global.chrome = chrome
    jest.resetAllMocks()

    // Setup JSDOM with test form
    dom = new JSDOM(`
      <form id="testForm">
        ${Array(50).fill().map((_, i) => 
          `<input name="field${i}" type="text">`
        ).join('')}
      </form>
    `)
    document = dom.window.document
    formUtils = parseDOM(document).formUtils
  })

  test('should measure API response time', async () => {
    const mockResponse = { status: 'success', data: 'test' }
    chrome.runtime.sendMessage.mockImplementation((message, callback) => {
      setTimeout(() => callback(mockResponse), 50) // Simulate network delay
    })

    const start = performance.now()
    await handleApiResponse({ type: 'test' })
    const duration = performance.now() - start

    expect(duration).toBeGreaterThanOrEqual(50)
    expect(duration).toBeLessThan(100)
  })

  test('should benchmark form field mapping', () => {
    const form = document.getElementById('testForm')
    const { duration } = formUtils.measurePerformance(() => {
      formUtils.mapFormFields(form)
    })

    expect(duration).toBeGreaterThan(0)
    console.log(`Form mapping benchmark: ${duration.toFixed(2)}ms`)
  })

  test('should benchmark form filling', () => {
    const form = document.getElementById('testForm')
    const values = Array(50).fill().reduce((acc, _, i) => {
      acc[`field${i}`] = `value${i}`
      return acc
    }, {})

    const result = formUtils.fillForm(form, values)
    expect(result.duration).toBeGreaterThan(0)
    console.log(`Form filling benchmark: ${result.duration.toFixed(2)}ms`)
  })

  test('should measure DOM parsing initialization', () => {
    const { duration } = formUtils.measurePerformance(() => {
      parseDOM(document)
    })

    expect(duration).toBeGreaterThan(0)
    console.log(`DOM parsing benchmark: ${duration.toFixed(2)}ms`)
  })
})