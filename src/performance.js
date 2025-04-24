/**
 * Performance monitoring module for Chrome extension
 * Tracks:
 * - API response times
 * - Form filling durations
 * - Message passing latency
 * - Stores metrics in chrome.storage.local
 */

const METRICS_KEY = 'performanceMetrics';
const MAX_METRICS = 1000; // Max metrics to store per type

class PerformanceMonitor {
  constructor() {
    this.init();
  }

  async init() {
    // Initialize storage if empty
    const data = await chrome.storage.local.get(METRICS_KEY);
    if (!data[METRICS_KEY]) {
      await chrome.storage.local.set({
        [METRICS_KEY]: {
          apiTimes: [],
          formTimes: [],
          messageLatency: []
        }
      });
    }
  }

  async recordApiTime(duration) {
    const data = await this.getMetrics();
    data.apiTimes.push({
      timestamp: Date.now(),
      duration
    });
    if (data.apiTimes.length > MAX_METRICS) {
      data.apiTimes.shift();
    }
    await this.saveMetrics(data);
  }

  async recordFormTime(duration) {
    const data = await this.getMetrics();
    data.formTimes.push({
      timestamp: Date.now(),
      duration
    });
    if (data.formTimes.length > MAX_METRICS) {
      data.formTimes.shift();
    }
    await this.saveMetrics(data);
  }

  async recordMessageLatency(duration) {
    const data = await this.getMetrics();
    data.messageLatency.push({
      timestamp: Date.now(),
      duration
    });
    if (data.messageLatency.length > MAX_METRICS) {
      data.messageLatency.shift();
    }
    await this.saveMetrics(data);
  }

  async getMetrics() {
    const data = await chrome.storage.local.get(METRICS_KEY);
    return data[METRICS_KEY] || {
      apiTimes: [],
      formTimes: [],
      messageLatency: []
    };
  }

  async clearMetrics() {
    await chrome.storage.local.set({
      [METRICS_KEY]: {
        apiTimes: [],
        formTimes: [],
        messageLatency: []
      }
    });
  }

  async saveMetrics(metrics) {
    await chrome.storage.local.set({
      [METRICS_KEY]: metrics
    });
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();