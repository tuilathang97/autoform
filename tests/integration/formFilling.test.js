import { JSDOM } from 'jsdom'
import { parseDOM } from '../src/content/domParser.js'

describe('Content Script Form Filling', () => {
  let dom, document, formUtils

  beforeEach(() => {
    // Setup JSDOM with test form
    dom = new JSDOM(`
      <html>
        <body>
          <form id="testForm">
            <input type="text" name="username" required>
            <input type="email" name="email">
            <input type="checkbox" name="subscribe">
            <select name="country">
              <option value="us">US</option>
              <option value="uk">UK</option>
            </select>
          </form>
        </body>
      </html>
    `)
    document = dom.window.document
    formUtils = parseDOM(document).formUtils
  })

  test('should correctly map form fields', () => {
    const form = document.getElementById('testForm')
    const fields = formUtils.mapFormFields(form)
    
    expect(fields).toMatchObject({
      username: {
        type: 'text',
        required: true
      },
      email: {
        type: 'email',
        required: false
      },
      subscribe: {
        type: 'checkbox',
        required: false
      },
      country: {
        type: 'select-one',
        required: false
      }
    })
  })

  test('should fill form with valid values', () => {
    const form = document.getElementById('testForm')
    const result = formUtils.fillForm(form, {
      username: 'testuser',
      email: 'test@example.com',
      subscribe: true,
      country: 'uk'
    })

    expect(result.success).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(form.elements.username.value).toBe('testuser')
    expect(form.elements.email.value).toBe('test@example.com')
    expect(form.elements.subscribe.checked).toBe(true)
    expect(form.elements.country.value).toBe('uk')
  })

  test('should return errors for invalid form filling', () => {
    const form = document.getElementById('testForm')
    const result = formUtils.fillForm(form, {
      username: '', // required field
      invalidField: 'value' // non-existent field
    })

    expect(result.success).toBe(false)
    expect(result.errors).toEqual([
      'Required field missing value: username',
      'Field not found: invalidField'
    ])
  })

  test('should measure form filling performance', () => {
    const form = document.getElementById('testForm')
    const result = formUtils.fillForm(form, {
      username: 'testuser',
      email: 'test@example.com'
    })

    expect(typeof result.duration).toBe('number')
    expect(result.duration).toBeGreaterThan(0)
  })
})