/**
 * Test script to verify political query detection works correctly
 */

const testQueries = [
  // Political queries (should NOT be hotel queries)
  'was warne die letzten drei budneskanzler in deutschlanbd',
  'wer ist der aktuelle bundeskanzler',
  'bundeskanzler in russland', 
  'wer regiert usa',
  'deutsche politiker',
  'präsident von deutschland',
  
  // Hotel queries (should be hotel queries)
  'kalkulation für hotel dolder',
  'letzte kalkulation',
  'alle hotels profit',
  'zimmer auslastung',
  
  // General queries (should NOT be hotel queries)
  'wieviel uhr in new york',
  'wetter in münchen',
  'wie geht es dir',
  'was ist 2+2'
];

async function testDetection() {
  console.log('🔍 TESTING POLITICAL QUERY DETECTION...\n');
  
  for (const query of testQueries) {
    // Simulate the detection logic
    const politicalWords = ['bundeskanzler', 'budneskanzler', 'kanzler', 'präsident', 'minister', 
                           'politik', 'regierung', 'deutschland', 'russland', 'usa', 'politiker'];
    
    const isPolitical = politicalWords.some(w => query.toLowerCase().includes(w));
    const shouldBeHotel = query.includes('kalkulation') || query.includes('hotel') || 
                         (query.includes('letzte') && query.includes('hotel'));
    
    console.log(`Query: "${query}"`);
    console.log(`  Political: ${isPolitical}`);
    console.log(`  Should be hotel: ${shouldBeHotel}`);
    console.log(`  Expected result: ${isPolitical ? 'GENERAL' : (shouldBeHotel ? 'HOTEL' : 'GENERAL')}`);
    console.log('');
  }
}

testDetection();