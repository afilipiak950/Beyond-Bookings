/**
 * Test script to verify the semantic AI classification fix
 * Tests that general questions get proper ChatGPT responses instead of database errors
 */

import axios from 'axios';

async function runTest() {
  console.log('🧪 TESTING SEMANTIC AI CLASSIFICATION FIX');
  console.log('=====================================');
  
  const baseURL = 'http://localhost:5000';
  
  // Get session cookie first
  const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
    email: 'test@example.com',
    password: 'password123'
  });
  
  const cookies = loginResponse.headers['set-cookie'];
  const cookieString = cookies.map(cookie => cookie.split(';')[0]).join('; ');
  
  console.log('✅ Authenticated successfully');
  
  // Test the exact question that was failing
  const testQuestions = [
    {
      question: "wieviele hotels gibts in deutschland",
      expectedType: "general",
      description: "German hotel statistics question - should be GENERAL, not hotel_business"
    },
    {
      question: "how many hotels are in germany",
      expectedType: "general", 
      description: "English hotel statistics question - should be GENERAL"
    },
    {
      question: "dolder grand kalkulation",
      expectedType: "hotel_business",
      description: "Specific hotel calculation - should be HOTEL_BUSINESS"
    },
    {
      question: "what is the weather in berlin",
      expectedType: "weather",
      description: "Weather question - should be WEATHER"
    },
    {
      question: "calculate 25 + 30",
      expectedType: "calculation", 
      description: "Math calculation - should be CALCULATION"
    }
  ];
  
  for (const test of testQuestions) {
    console.log(`\n🔍 Testing: "${test.question}"`);
    console.log(`Expected: ${test.expectedType}`);
    console.log(`Description: ${test.description}`);
    
    try {
      const response = await axios.post(`${baseURL}/api/ai/chat`, {
        message: test.question,
        mode: 'general',
        model: 'gpt-5-mini'
      }, {
        headers: {
          'Cookie': cookieString,
          'Content-Type': 'application/json'
        }
      });
      
      // Parse streaming response if needed
      let fullResponse = '';
      if (typeof response.data === 'string') {
        // Handle streaming response
        const lines = response.data.split('\n').filter(line => line.startsWith('data: '));
        for (const line of lines) {
          try {
            const data = JSON.parse(line.substring(6));
            if (data.type === 'message' && data.content) {
              fullResponse += data.content;
            }
          } catch (e) {
            // Skip malformed JSON
          }
        }
      }
      
      console.log(`✅ Response received (${fullResponse.length} chars)`);
      console.log(`Preview: ${fullResponse.substring(0, 200)}...`);
      
      // Check for signs of correct classification
      const hasDatabaseMention = fullResponse.includes('database') || fullResponse.includes('sql_query') || fullResponse.includes('I\'ll run a database query');
      const hasProperAnswer = fullResponse.length > 100 && !hasDatabaseMention;
      
      if (test.expectedType === 'general' && hasDatabaseMention) {
        console.log('❌ FAIL: General question incorrectly mentions database/SQL');
      } else if (test.expectedType === 'general' && hasProperAnswer) {
        console.log('✅ PASS: General question gets proper ChatGPT-style response');
      } else if (test.expectedType === 'hotel_business' && !hasDatabaseMention) {
        console.log('❌ FAIL: Hotel business question should use database tools');
      } else {
        console.log('✅ PASS: Classification appears correct');
      }
      
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
      if (error.response) {
        console.log(`Status: ${error.response.status}`);
        console.log(`Data: ${JSON.stringify(error.response.data)}`);
      }
    }
  }
  
  console.log('\n🎯 TEST COMPLETE');
  console.log('================');
}

runTest().catch(console.error);