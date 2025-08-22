import axios from 'axios';

async function debugHotelDetection() {
  console.log('🔍 DEBUGGING HOTEL DETECTION');
  
  const baseURL = 'http://localhost:5000';
  
  // Get session cookie first
  const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
    email: 'test@example.com',
    password: 'password123'
  });
  
  const cookies = loginResponse.headers['set-cookie'];
  const cookieString = cookies.map(cookie => cookie.split(';')[0]).join('; ');
  
  console.log('✅ Authenticated successfully');
  
  // Test just the hotel business question
  console.log('\n🏨 Testing: "dolder grand kalkulation"');
  
  try {
    const response = await axios.post(`${baseURL}/api/ai/chat`, {
      message: "dolder grand kalkulation",
      mode: 'general',
      model: 'gpt-5-mini'
    }, {
      headers: {
        'Cookie': cookieString,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📝 Response received:', response.data.length, 'chars');
    console.log('Preview:', response.data.substring(0, 500));
    
    // Check if it mentions tools or databases
    const hasToolMention = response.data.includes('*Executing tools*') || response.data.includes('sql_query');
    console.log('🔧 Has tool mention:', hasToolMention);
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

debugHotelDetection().catch(console.error);