// Simple Node.js script to test Supabase connection
// Run this after setting up the database schema

const fetch = require('node-fetch');

const SUPABASE_URL = 'https://fyymdsvxylcnbeacwgkd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5eW1kc3Z4eWxjbmJlYWN3Z2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5MTkyMjMsImV4cCI6MjA2OTQ5NTIyM30.BMRmivHeekCWKkaaXW2LN7cBfLYFezerEGSj9w2fHbI';

async function testConnection() {
  console.log('🔗 Testing Supabase Connection...');
  console.log('URL:', SUPABASE_URL);
  console.log('Key:', SUPABASE_KEY.substring(0, 50) + '...');
  
  try {
    // Test 1: Basic REST API connection
    console.log('\n📡 Testing REST API...');
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      }
    });
    
    console.log('Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      console.log('✅ REST API connection successful!');
    } else {
      const errorText = await response.text();
      console.log('❌ REST API failed:', errorText);
    }
    
    // Test 2: Try to access workspaces table (will fail if schema not set up)
    console.log('\n📊 Testing database access...');
    const dbResponse = await fetch(`${SUPABASE_URL}/rest/v1/workspaces?limit=1`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      }
    });
    
    if (dbResponse.ok) {
      const data = await dbResponse.json();
      console.log('✅ Database access successful!');
      console.log('Workspaces found:', data.length);
    } else {
      const errorText = await dbResponse.text();
      console.log('⚠️  Database access failed (expected if schema not set up):', errorText);
      console.log('💡 This is normal - run the database schema first!');
    }
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
  }
}

// Run the test
testConnection();