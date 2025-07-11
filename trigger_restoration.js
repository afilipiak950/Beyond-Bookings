// Direct call to trigger intelligent restoration
const fetch = require('node-fetch');

async function triggerRestoration() {
  try {
    // First, let's get a session by calling the auth endpoint
    const authResponse = await fetch('http://localhost:5000/api/auth/user', {
      method: 'GET',
      headers: {
        'Cookie': 'connect.sid=s%3A-OT5ooHH4P_LljIW9DyUBniJ94yiTKS3.unuyw9BOtxz59kXswr65QVMAjZefhaYKjjwtkVMQzHc'
      }
    });
    
    console.log('Auth check status:', authResponse.status);
    
    // Now trigger the restoration
    const response = await fetch('http://localhost:5000/api/ai/intelligent-restoration', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'connect.sid=s%3A-OT5ooHH4P_LljIW9DyUBniJ94yiTKS3.unuyw9BOtxz59kXswr65QVMAjZefhaYKjjwtkVMQzHc'
      },
      body: JSON.stringify({})
    });
    
    console.log('Restoration status:', response.status);
    const result = await response.json();
    console.log('Result:', result);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

triggerRestoration();