import axios from 'axios';

async function testDolderSpecific() {
  console.log('🏨 TESTING DOLDER GRAND CLASSIFICATION');
  
  // Wait for server to be ready
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const baseURL = 'http://localhost:5000';
  
  try {
    // Login
    const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
      email: 'test@example.com',
      password: 'password123'
    });
    
    const cookies = loginResponse.headers['set-cookie'];
    const cookieString = cookies.map(cookie => cookie.split(';')[0]).join('; ');
    
    console.log('✅ Authenticated');
    
    // Test the specific hotel question
    console.log('\n🔍 Testing: "erzähl mir etwas über das dolder grand in zürich"');
    
    const response = await axios.post(`${baseURL}/api/ai/chat`, {
      message: "erzähl mir etwas über das dolder grand in zürich",
      mode: 'general',
      model: 'gpt-5-mini'
    }, {
      headers: { 'Cookie': cookieString, 'Content-Type': 'application/json' }
    });
    
    console.log('✅ Response received');
    
    // Check for SQL tool usage
    const hasSQL = response.data.includes('sql_query') || response.data.includes('*Executing tools*');
    const hasHotelData = response.data.includes('pricing_calculations') || response.data.includes('SELECT');
    const isGeneralResponse = response.data.includes('Überblick') && !hasSQL;
    
    console.log('\n📊 RESPONSE ANALYSIS:');
    console.log('Has SQL tool usage:', hasSQL);
    console.log('Has hotel database data:', hasHotelData);
    console.log('Is general response (no tools):', isGeneralResponse);
    
    if (hasSQL && hasHotelData) {
      console.log('✅ SUCCESS: Hotel question correctly uses SQL tools');
    } else if (isGeneralResponse) {
      console.log('❌ ISSUE: Hotel question classified as general (should use database)');
    } else {
      console.log('❓ UNCLEAR: Mixed or unexpected response');
    }
    
    // Show response preview
    const preview = response.data.substring(0, 500);
    console.log('\nResponse preview:', preview);
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    }
  }
}

testDolderSpecific().catch(console.error);