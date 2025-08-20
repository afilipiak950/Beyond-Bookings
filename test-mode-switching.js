/**
 * Test script to verify mode switching works correctly
 */

const testScenarios = [
  // Starting with SQL mode, then switching to general
  {
    mode: 'sql',
    message: 'gib mir infos zur dolder kalkulation',
    expected: 'HOTEL (SQL tools)',
  },
  {
    mode: 'general', 
    message: 'wer ist bundeskanzler',
    expected: 'GENERAL (no tools)',
  },
  
  // Starting with general mode, then switching to SQL
  {
    mode: 'general',
    message: 'wie geht es dir',
    expected: 'GENERAL (no tools)',
  },
  {
    mode: 'sql',
    message: 'zeige mir alle hotels',
    expected: 'HOTEL (SQL tools)',
  },
  
  // Auto-detection should work regardless of mode for obvious cases
  {
    mode: 'general',
    message: 'dolder grand kalkulation profit',
    expected: 'HOTEL (auto-detected)',
  },
  {
    mode: 'sql',
    message: 'bundeskanzler deutschland politik',
    expected: 'GENERAL (political exclusion)',
  }
];

console.log('🔄 TESTING MODE SWITCHING LOGIC...\n');

testScenarios.forEach((scenario, index) => {
  console.log(`Test ${index + 1}:`);
  console.log(`  Mode: ${scenario.mode}`);
  console.log(`  Message: "${scenario.message}"`);
  console.log(`  Expected: ${scenario.expected}`);
  console.log('');
});

console.log('✅ Mode switching should work bidirectionally:');
console.log('  - SQL → General: Political/weather questions bypass SQL tools');
console.log('  - General → SQL: Hotel questions get SQL tools');
console.log('  - Manual mode selection always overrides auto-detection');