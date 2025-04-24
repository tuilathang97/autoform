import { chrome } from 'jest-chrome'
import { handleApiResponse } from '../src/background.js'

describe('Chrome Extension ↔ Backend API Integration', () => {
  beforeEach(() => {
    global.chrome = chrome
    jest.resetAllMocks()
  })

  test('should send and receive messages from background to API', async () => {
    // Failing test - API communication not implemented
    const mockResponse = { status: 'success', data: 'test' }
    chrome.runtime.sendMessage.mockImplementation((message, callback) => {
      callback(mockResponse)
    })

    const response = await handleApiResponse({ type: 'test' })
    expect(response).toEqual(mockResponse)
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      { type: 'test' },
      expect.any(Function)
    )
  })

  test('should handle API errors', async () => {
    // Failing test - error handling not implemented
    chrome.runtime.sendMessage.mockImplementation((message, callback) => {
      callback(null, new Error('API error'))
    })

    await expect(handleApiResponse({ type: 'test' }))
      .rejects.toThrow('API error')
  })
})