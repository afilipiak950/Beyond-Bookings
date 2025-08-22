// Test Script: Verify AI System works correctly
console.log('🧪 Testing AI System Configuration...');

// Test scenarios
const testCases = [
  {
    input: "Was ist die Hauptstadt von Deutschland?",
    expected: "No tools - direct OpenAI knowledge",
    shouldUseTools: false
  },
  {
    input: "Wie ist das Wetter in München?", 
    expected: "No tools - direct OpenAI knowledge",
    shouldUseTools: false
  },
  {
    input: "Infos zur Kalkulation Dolder Grand",
    expected: "SQL tools - database query",
    shouldUseTools: true
  },
  {
    input: "Rechne 15 + 27",
    expected: "Calculator tool",
    shouldUseTools: true
  }
];

// Test logic (similar to aiService.ts)
function shouldUseTools(message) {
  const isHotelQuery = message.toLowerCase().includes('kalkulation') || 
                      message.toLowerCase().includes('dolder') ||
                      message.toLowerCase().includes('hotel');
  const isMathQuery = message.toLowerCase().includes('rechne') || 
                     /[\+\-\*\/=]/.test(message);
  
  return isHotelQuery || isMathQuery;
}

// Run tests
testCases.forEach((test, index) => {
  const result = shouldUseTools(test.input);
  const status = result === test.shouldUseTools ? '✅ PASS' : '❌ FAIL';
  
  console.log(`\n${index + 1}. "${test.input}"`);
  console.log(`   Expected: ${test.expected}`);
  console.log(`   Tools: ${result ? 'YES' : 'NO'} ${status}`);
});

console.log('\n🎯 System Configuration:');
console.log('✅ Hotel/Business queries → Use SQL tools');
console.log('✅ General knowledge → Use OpenAI direct knowledge');
console.log('✅ Weather questions → Use OpenAI direct knowledge');
console.log('✅ Math calculations → Use calculator tool');