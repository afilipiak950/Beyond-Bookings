// Test script to verify PDF report generation with fixed data
const fetch = require('node-fetch');

const testData = {
  calculations: [
    {
      id: 1,
      hotelName: "Test Hotel Premium",
      hotelUrl: "https://test-hotel.com",
      averageRoomPrice: 150,
      roomPrice: 150,
      totalPrice: 5000,
      operationalCosts: 1200,
      profitMargin: 2300,
      vatAmount: 950,
      vatRate: 19,
      occupancyRate: 75,
      stars: 4,
      roomCount: 20,
      contractDuration: 12,
      createdAt: new Date().toISOString()
    },
    {
      id: 2,
      hotelName: "Budget Lodge",
      hotelUrl: "https://budget-lodge.com",
      averageRoomPrice: 80,
      roomPrice: 80,
      totalPrice: 2400,
      operationalCosts: 800,
      profitMargin: 900,
      vatAmount: 456,
      vatRate: 19,
      occupancyRate: 85,
      stars: 3,
      roomCount: 15,
      contractDuration: 12,
      createdAt: new Date().toISOString()
    }
  ],
  config: {
    title: "Test Hotel Portfolio Report",
    authorName: "Test Analytics Team",
    companyName: "bebo convert",
    reportDate: new Date().toISOString(),
    includeExecutiveSummary: true,
    includeDetailedCalculations: true,
    includeMarketAnalysis: true,
    includeRecommendations: true
  },
  filters: {
    cities: [],
    starRatings: [],
    priceRange: { enabled: false },
    dateRange: { enabled: false }
  }
};

async function testPDFGeneration() {
  try {
    console.log('Testing PDF generation with corrected data...');
    
    const response = await fetch('http://localhost:5000/api/export/comprehensive-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // You'll need actual auth
      },
      body: JSON.stringify(testData)
    });

    if (response.ok) {
      console.log('✅ PDF generated successfully!');
      console.log('Response status:', response.status);
      console.log('Content-Type:', response.headers.get('content-type'));
      console.log('Content-Disposition:', response.headers.get('content-disposition'));
    } else {
      console.log('❌ PDF generation failed');
      console.log('Status:', response.status);
      console.log('Error:', await response.text());
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// testPDFGeneration();
console.log('PDF test script ready. Execute testPDFGeneration() when authenticated.');