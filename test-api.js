/**
 * Basit API Test Script
 * Kullanım: node test-api.js
 */

// Use Gateway URL (port 8080) for testing
const BASE_URL = process.env.GATEWAY_URL || 'http://localhost:8080';

// Renkli console output için
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

async function test(endpoint, options = {}) {
  try {
    const url = `${BASE_URL}${endpoint}`;
    console.log(`\n${colors.blue}Testing: ${options.method || 'GET'} ${endpoint}${colors.reset}`);
    
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log(`${colors.green}✓ Success${colors.reset} (${response.status})`);
      console.log(JSON.stringify(data, null, 2));
      return data;
    } else {
      console.log(`${colors.red}✗ Failed${colors.reset} (${response.status})`);
      console.log(JSON.stringify(data, null, 2));
      return null;
    }
  } catch (error) {
    console.log(`${colors.red}✗ Error: ${error.message}${colors.reset}`);
    return null;
  }
}

async function runTests() {
  console.log(`${colors.yellow}=== Mobile Provider Bill Payment API Tests ===${colors.reset}`);
  
  // 1. Health Check
  await test('/health');
  
  // 2. Login (Admin)
  const adminLogin = await test('/api/v1/auth/login', {
    method: 'POST',
    body: {
      username: 'admin',
      password: 'password123'
    }
  });
  
  const adminToken = adminLogin?.data?.token;
  
  if (adminToken) {
    console.log(`\n${colors.green}Admin Token: ${adminToken.substring(0, 50)}...${colors.reset}`);
    
    // 3. Query Bill (Mobile Provider App)
    await test('/api/v1/bills/query?subscriber_no=5551234567&month=10&year=2024', {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    
    // 4. Query Bill Detailed
    await test('/api/v1/bills/query/detailed?subscriber_no=5551234567&month=10&year=2024&page=1&limit=10', {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    
    // 5. Pay Bill (Web Site - No Auth)
    await test('/api/v1/bills/pay', {
      method: 'POST',
      body: {
        subscriber_no: '5551234567',
        month: 10,
        year: 2024,
        amount: 50.00
      }
    });
    
    // 6. Admin - Add Bill
    await test('/api/v1/admin/bills', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      },
      body: {
        subscriber_no: '5551234567',
        month: 12,
        year: 2024,
        total_amount: 200.00,
        details: [
          {
            service_type: 'voice',
            description: 'Dakika kullanımı',
            amount: 120.00
          },
          {
            service_type: 'data',
            description: 'İnternet paketi',
            amount: 80.00
          }
        ]
      }
    });
  }
  
  // 7. Banking Login
  const bankingLogin = await test('/api/v1/auth/login', {
    method: 'POST',
    body: {
      username: 'banking',
      password: 'password123'
    }
  });
  
  const bankingToken = bankingLogin?.data?.token;
  
  if (bankingToken) {
    // 8. Query Unpaid Bills
    await test('/api/v1/bills/unpaid?subscriber_no=5551234567', {
      headers: {
        'Authorization': `Bearer ${bankingToken}`
      }
    });
  }
  
  console.log(`\n${colors.yellow}=== Tests Completed ===${colors.reset}`);
}

// Node.js 18+ için fetch desteği kontrolü
if (typeof fetch === 'undefined') {
  console.log('Node.js 18+ gerekiyor veya node-fetch kurun: npm install node-fetch');
  process.exit(1);
}

runTests().catch(console.error);

