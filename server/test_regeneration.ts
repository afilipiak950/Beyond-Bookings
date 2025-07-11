import { insightRestorer } from './insightRestorer';

async function main() {
  console.log('Testing AI insight regeneration...');
  
  try {
    const results = await insightRestorer.restoreInsights(1);
    console.log('Regeneration completed:', results);
  } catch (error) {
    console.error('Error during regeneration:', error);
  }
}

main().catch(console.error);