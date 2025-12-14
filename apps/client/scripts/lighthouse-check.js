const chromeLauncher = require('chrome-launcher');
const lighthouse = require('lighthouse');
const fs = require('fs');
const path = require('path');

const URLs = [
  'http://localhost:5173', // Vite dev server
];

const categoryWeights = {
  performance: 0.4,
  accessibility: 0.2,
  bestPractices: 0.2,
  seo: 0.2,
};

const thresholds = {
  performance: 90,
  accessibility: 90,
  bestPractices: 90,
  seo: 90,
  pwa: 80,
};

async function runLighthouse(url) {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  
  try {
    const options = {
      logLevel: 'info',
      output: 'json',
      onlyCategories: Object.keys(categoryWeights),
      port: chrome.port,
    };

    const runnerResult = await lighthouse(url, options);
    const reportJson = runnerResult.report;
    
    // Parse the report
    const report = JSON.parse(reportJson);
    const scores = {};
    
    Object.keys(categoryWeights).forEach(category => {
      scores[category] = Math.round((report.categories[category]?.score || 0) * 100);
    });
    
    // Calculate overall score
    const overallScore = Object.keys(categoryWeights).reduce((sum, category) => {
      return sum + (scores[category] * categoryWeights[category]);
    }, 0);
    
    scores.overall = Math.round(overallScore);
    
    console.log(`\n🚀 Lighthouse Report for ${url}`);
    console.log('=================================');
    Object.keys(scores).forEach(metric => {
      const emoji = scores[metric] >= thresholds[metric] ? '✅' : '❌';
      console.log(`${emoji} ${metric.toUpperCase()}: ${scores[metric]}/100`);
    });
    
    // Check thresholds
    let passed = true;
    Object.keys(thresholds).forEach(metric => {
      if (scores[metric] && scores[metric] < thresholds[metric]) {
        console.log(`\n❌ FAILED: ${metric.toUpperCase()} score ${scores[metric]} is below threshold ${thresholds[metric]}`);
        passed = false;
      }
    });
    
    // Save detailed report
    const reportDir = path.join(__dirname, '..', 'lighthouse-reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFile = path.join(reportDir, `lighthouse-${timestamp}.json`);
    fs.writeFileSync(reportFile, reportJson);
    
    console.log(`\n📊 Detailed report saved to: ${reportFile}`);
    
    return {
      passed,
      scores,
      reportFile,
    };
  } finally {
    await chrome.kill();
  }
}

async function main() {
  console.log('🎯 Running Lighthouse Performance Tests...\n');
  
  let allPassed = true;
  
  for (const url of URLs) {
    try {
      const result = await runLighthouse(url);
      if (!result.passed) {
        allPassed = false;
      }
    } catch (error) {
      console.error(`❌ Failed to run lighthouse for ${url}:`, error.message);
      allPassed = false;
    }
  }
  
  if (allPassed) {
    console.log('\n🎉 All Lighthouse scores meet the SLA requirements!');
    process.exit(0);
  } else {
    console.log('\n💥 Some Lighthouse scores are below SLA requirements.');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Lighthouse test failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runLighthouse,
  thresholds,
  categoryWeights,
};