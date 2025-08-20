import axios from 'axios';

async function testHotelContextFix() {
  console.log('🔧 TESTING HOTEL CONTEXT FIX');
  
  const baseURL = 'http://localhost:5000';
  
  // Login
  const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
    email: 'test@example.com',
    password: 'password123'
  });
  
  const cookies = loginResponse.headers['set-cookie'];
  const cookieString = cookies.map(cookie => cookie.split(';')[0]).join('; ');
  
  console.log('✅ Authenticated');
  
  // Test the exact scenario that was failing:
  // 1. Ask weather question
  // 2. Ask hotel question 
  // 3. Verify hotel question doesn't get weather response
  
  console.log('\n🌤️ Step 1: Ask weather question');
  try {
    const weatherResponse = await axios.post(`${baseURL}/api/ai/chat`, {
      message: "Wetter heute in düsseldorf",
      mode: 'general',
      model: 'gpt-5-mini'
    }, {
      headers: { 'Cookie': cookieString, 'Content-Type': 'application/json' }
    });
    
    console.log('✅ Weather response received');
    
    // Small delay to ensure response is processed
    await new Promise(resolve => setTimeout(resolve, 2000));
    
  } catch (error) {
    console.log('❌ Weather request failed:', error.message);
    return;
  }
  
  console.log('\n🏨 Step 2: Ask hotel question in same thread');
  try {
    const hotelResponse = await axios.post(`${baseURL}/api/ai/chat`, {
      message: "erzähl mir etwas über das dolder grand in zürich",
      mode: 'general', 
      model: 'gpt-5-mini'
    }, {
      headers: { 'Cookie': cookieString, 'Content-Type': 'application/json' }
    });
    
    console.log('✅ Hotel response received');
    
    // Check response content
    const hasWeatherContent = hotelResponse.data.includes('Wetter') || hotelResponse.data.includes('Düsseldorf') || hotelResponse.data.includes('Temperatur');
    const hasHotelContent = hotelResponse.data.includes('Dolder') || hotelResponse.data.includes('sql_query') || hotelResponse.data.includes('*Executing tools*');
    
    console.log('\n📊 ANALYSIS:');
    console.log('Has weather content:', hasWeatherContent);
    console.log('Has hotel content:', hasHotelContent);
    
    if (hasWeatherContent && !hasHotelContent) {
      console.log('❌ FAIL: Hotel question got weather response (context bleeding)');
    } else if (hasHotelContent && !hasWeatherContent) {
      console.log('✅ PASS: Hotel question got proper hotel response');
    } else {
      console.log('❓ UNCLEAR: Mixed response detected');
    }
    
    // Show preview
    const preview = hotelResponse.data.substring(0, 300).replace(/\n/g, ' ');
    console.log(`\nPreview: ${preview}...`);
    
  } catch (error) {
    console.log('❌ Hotel request failed:', error.message);
  }
}

testHotelContextFix().catch(console.error);