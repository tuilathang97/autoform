// Performance metrics collection and storage
class PerformanceMetrics {
  constructor() {
    this.metrics = {
      apiResponseTimes: [],
      formFillDurations: [],
      messageLatencies: []
    };
    this.MAX_METRICS = 1000; // Keep last 1000 samples
  }

  // Record API response time in ms
  recordApiResponseTime(duration) {
    this.metrics.apiResponseTimes.push({
      timestamp: Date.now(),
      duration
    });
    this.trimMetrics('apiResponseTimes');
  }

  // Record form filling duration in ms
  recordFormFillDuration(duration) {
    this.metrics.formFillDurations.push({
      timestamp: Date.now(),
      duration
    });
    this.trimMetrics('formFillDurations');
  }

  // Record message passing latency in ms
  recordMessageLatency(duration) {
    this.metrics.messageLatencies.push({
      timestamp: Date.now(),
      duration
    });
    this.trimMetrics('messageLatencies');
  }

  // Keep metrics array from growing too large
  trimMetrics(metricType) {
    if (this.metrics[metricType].length > this.MAX_METRICS) {
      this.metrics[metricType].shift();
    }
  }

  // Get aggregated stats for a metric type
  getStats(metricType) {
    const values = this.metrics[metricType].map(m => m.duration);
    if (values.length === 0) return null;

    return {
      count: values.length,
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      p95: this.calculatePercentile(values, 95),
      latest: values[values.length - 1]
    };
  }

  // Calculate percentile (e.g. p95)
  calculatePercentile(values, percentile) {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(percentile / 100 * sorted.length) - 1;
    return sorted[index];
  }

  // Save metrics to storage
  async saveToStorage() {
    try {
      await chrome.storage.local.set({performanceMetrics: this.metrics});
    } catch (error) {
      console.error('Failed to save performance metrics:', error);
    }
  }

  // Load metrics from storage
  async loadFromStorage() {
    try {
      const result = await chrome.storage.local.get('performanceMetrics');
      if (result.performanceMetrics) {
        this.metrics = result.performanceMetrics;
      }
    } catch (error) {
      console.error('Failed to load performance metrics:', error);
    }
  }
}

// Singleton instance
const performanceMetrics = new PerformanceMetrics();

// Initialize by loading saved metrics
performanceMetrics.loadFromStorage();

// Periodically save metrics
setInterval(() => {
  performanceMetrics.saveToStorage();
}, 30000); // Every 30 seconds

export default performanceMetrics;