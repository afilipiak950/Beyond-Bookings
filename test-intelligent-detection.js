/**
 * Test the new Intelligent Detection System
 * Tests: Dynamic hotel detection, spelling correction, new hotel handling
 */

import { IntelligentDetector } from './server/ai/intelligent-detector.js';
import { db } from './server/db.js';

console.log('🧪 TESTING INTELLIGENT DETECTION SYSTEM\n');

// Test messages with spelling errors and new hotels
const testMessages = [
  // Spelling errors in existing hotel names
  'zeige mir die kalkauation für dolder grand',
  'informationen über kalkalation dolder grand',
  'wie ist die marge bei vier jahrszeiten?',
  'profitabilität von mönhs waldhotel', // missing 'c'
  
  // New hotel names that might be added
  'kalkulation für hilton münchen',
  'revenue analysis for marriott berlin',
  'wie ist das geschäft bei sheraton hamburg?',
  
  // Weather queries (should not trigger hotel mode)
  'wie ist das wetter in düsseldorf?',
  'temperature in berlin today',
  
  // Math queries
  'rechne 2+2',
  'calculate 100 * 0.27',
  
  // General queries
  'hello how are you?',
  'was ist die hauptstadt von deutschland?'
];

async function testDetection() {
  for (const message of testMessages) {
    console.log(`\n📝 Testing: "${message}"`);
    console.log('─'.repeat(50));
    
    try {
      const analysis = await IntelligentDetector.analyzeMessage(message);
      
      console.log(`✅ Type: ${analysis.type}`);
      console.log(`✅ Confidence: ${Math.round(analysis.confidence * 100)}%`);
      
      if (analysis.extractedHotel) {
        console.log(`🏨 Hotel: ${analysis.extractedHotel}`);
      }
      
      if (analysis.extractedLocation) {
        console.log(`🌍 Location: ${analysis.extractedLocation}`);
      }
      
      if (analysis.spellingCorrected) {
        console.log(`🔧 Spelling corrected!`);
      }
      
      console.log(`🛠️ Suggested tools: ${analysis.suggestedTools.join(', ')}`);
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }
  }
  
  // Test hotel cache
  console.log('\n🏨 CURRENT HOTEL DATABASE:');
  console.log('─'.repeat(50));
  const hotelNames = await IntelligentDetector.getAllHotelNames();
  hotelNames.forEach((name, index) => {
    console.log(`${index + 1}. ${name}`);
  });
  
  console.log(`\n✅ Total hotels in cache: ${hotelNames.length}`);
}

// Run the test
testDetection().catch(console.error);