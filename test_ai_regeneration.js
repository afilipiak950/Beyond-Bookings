const { insightRestorer } = require('./server/insightRestorer');

async function testRegeneration() {
  try {
    console.log('Starting AI insight regeneration...');
    const results = await insightRestorer.restoreInsights(1);
    console.log('Regeneration completed:', results);
  } catch (error) {
    console.error('Error during regeneration:', error);
  }
}

testRegeneration();