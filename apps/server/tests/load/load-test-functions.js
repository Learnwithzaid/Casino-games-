/**
 * Load test helper functions for Artillery
 */

const crypto = require('crypto');

module.exports = {
  generateRandomEmail,
  generateRandomTransactionId,
  setupScenarios
};

function generateRandomEmail() {
  const randomString = crypto.randomBytes(8).toString('hex');
  return `testuser${randomString}@example.com`;
}

function generateRandomTransactionId() {
  return `test-txn-${crypto.randomBytes(16).toString('hex')}`;
}

function generateRandomSignature() {
  return crypto.randomBytes(32).toString('hex');
}

function setupScenarios(context, events, done) {
  console.log('Setting up load test scenarios...');
  
  // Generate test data
  context.vars.testUsers = [];
  for (let i = 0; i < 1000; i++) {
    context.vars.testUsers.push({
      email: `testuser${i}@example.com`,
      password: 'password123',
      adminEmail: i === 0 ? 'admin@example.com' : null,
      adminPassword: i === 0 ? 'admin123' : null
    });
  }

  // Setup custom metrics
  context.vars.metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    startTime: Date.now()
  };

  // Override console.log to capture metrics
  const originalLog = console.log;
  console.log = function(...args) {
    if (args[0] && typeof args[0] === 'string' && args[0].includes('pulse')) {
      // Artillery pulse - good place to do custom reporting
      const elapsed = Date.now() - context.vars.metrics.startTime;
      const successRate = (context.vars.metrics.successfulRequests / context.vars.metrics.totalRequests * 100).toFixed(2);
      originalLog(`Metrics: Total: ${context.vars.metrics.totalRequests}, Success: ${context.vars.metrics.successfulRequests}, Failed: ${context.vars.metrics.failedRequests}, Success Rate: ${successRate}%, Elapsed: ${elapsed}ms`);
    }
    originalLog.apply(console, args);
  };

  // Track custom events
  events.on('request', function(requestParams, response, context, ee, next) {
    context.vars.metrics.totalRequests++;
    
    if (response.statusCode >= 200 && response.statusCode < 300) {
      context.vars.metrics.successfulRequests++;
    } else {
      context.vars.metrics.failedRequests++;
    }
    
    return next();
  });

  done();
}

// Custom assertions for security testing
module.exports.checkSecurityHeaders = function checkSecurityHeaders(response, context, ee, next) {
  const requiredHeaders = [
    'x-content-type-options',
    'x-frame-options',
    'x-xss-protection',
    'strict-transport-security'
  ];

  const missingHeaders = requiredHeaders.filter(header => 
    !response.headers[header]
  );

  if (missingHeaders.length > 0) {
    throw new Error(`Missing security headers: ${missingHeaders.join(', ')}`);
  }

  return next();
};

module.exports.validateRateLimitHeaders = function validateRateLimitHeaders(response, context, ee, next) {
  const rateLimitHeaders = [
    'x-ratelimit-limit',
    'x-ratelimit-remaining',
    'x-ratelimit-reset'
  ];

  const missingHeaders = rateLimitHeaders.filter(header => 
    !response.headers[header]
  );

  if (missingHeaders.length > 0) {
    console.warn(`Missing rate limit headers: ${missingHeaders.join(', ')}`);
  }

  return next();
};

module.exports.checkCORSHeaders = function checkCORSHeaders(response, context, ee, next) {
  // Check CORS headers for security
  const origin = context.vars.$environment ? context.vars.$environment.headers.origin : null;
  
  if (origin && response.headers['access-control-allow-origin']) {
    // Should not allow wildcard origins in production
    if (response.headers['access-control-allow-origin'] === '*') {
      console.warn('CORS wildcard origin allowed');
    }
  }

  return next();
};

module.exports.validateResponseTime = function validateResponseTime(response, context, ee, next) {
  const maxExpectedResponseTime = 500; // 500ms
  
  if (response.timings && response.timings.response) {
    const responseTime = response.timings.response;
    
    if (responseTime > maxExpectedResponseTime) {
      console.warn(`Slow response detected: ${responseTime}ms for ${response.url}`);
    }
  }

  return next();
};