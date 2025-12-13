const SUPABASE_URL = 'https://zcyaqinlmyysxhomdsjy.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjeWFxaW5sbXl5c3hob21kc2p5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NzY2MjEsImV4cCI6MjA4MTE1MjYyMX0.wmKx42gXDJSWrsY0zs2FYzkhRAxllBqLl1PGoe6ADmU';

console.log('🧪 Testing DocuSign Edge Functions\n');

async function testWebhook() {
  console.log('1️⃣ Testing docusign-webhook (public endpoint)...');

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/docusign-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event: 'envelope-sent',
        envelopeId: 'test-envelope-123',
        data: {
          envelopeId: 'test-envelope-123'
        }
      })
    });

    const result = await response.json();

    if (response.status === 404) {
      console.log('   ✅ Webhook endpoint responding (404 expected for test envelope)');
      console.log(`   Response: ${JSON.stringify(result)}\n`);
    } else {
      console.log(`   ⚠️  Status: ${response.status}`);
      console.log(`   Response: ${JSON.stringify(result)}\n`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}\n`);
  }
}

async function testCreateEnvelope() {
  console.log('2️⃣ Testing docusign-create-envelope (authenticated endpoint)...');

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/docusign-create-envelope`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documentId: 'test-doc-id',
        documentTitle: 'Test Document',
        filePath: 'test/path',
        signers: [
          {
            email: 'test@example.com',
            name: 'Test Signer',
            order: 1
          }
        ]
      })
    });

    const result = await response.json();

    if (response.status === 401) {
      console.log('   ✅ Auth validation working (401 expected with anon key)');
      console.log(`   Response: ${JSON.stringify(result)}\n`);
    } else if (response.status === 400 && result.needsConfiguration) {
      console.log('   ✅ Function responding correctly');
      console.log('   📝 DocuSign not configured (expected)');
      console.log(`   Message: ${result.message}\n`);
    } else {
      console.log(`   ⚠️  Status: ${response.status}`);
      console.log(`   Response: ${JSON.stringify(result)}\n`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}\n`);
  }
}

async function testSyncStatus() {
  console.log('3️⃣ Testing docusign-sync-status (authenticated endpoint)...');

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/docusign-sync-status`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        envelopeId: 'test-envelope-123',
        documentId: 'test-doc-id'
      })
    });

    const result = await response.json();

    if (response.status === 401) {
      console.log('   ✅ Auth validation working (401 expected with anon key)');
      console.log(`   Response: ${JSON.stringify(result)}\n`);
    } else if (response.status === 400) {
      console.log('   ✅ Function responding correctly');
      console.log(`   Response: ${JSON.stringify(result)}\n`);
    } else {
      console.log(`   ⚠️  Status: ${response.status}`);
      console.log(`   Response: ${JSON.stringify(result)}\n`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}\n`);
  }
}

async function testCORS() {
  console.log('4️⃣ Testing CORS headers...');

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/docusign-webhook`, {
      method: 'OPTIONS',
    });

    const headers = response.headers;
    const corsOrigin = headers.get('access-control-allow-origin');
    const corsMethods = headers.get('access-control-allow-methods');
    const corsHeaders = headers.get('access-control-allow-headers');

    if (corsOrigin === '*' && corsMethods && corsHeaders) {
      console.log('   ✅ CORS headers configured correctly');
      console.log(`   Allow-Origin: ${corsOrigin}`);
      console.log(`   Allow-Methods: ${corsMethods}`);
      console.log(`   Allow-Headers: ${corsHeaders}\n`);
    } else {
      console.log('   ⚠️  CORS headers may be incomplete');
      console.log(`   Allow-Origin: ${corsOrigin}`);
      console.log(`   Allow-Methods: ${corsMethods}`);
      console.log(`   Allow-Headers: ${corsHeaders}\n`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}\n`);
  }
}

async function runTests() {
  await testWebhook();
  await testCreateEnvelope();
  await testSyncStatus();
  await testCORS();

  console.log('✨ All tests completed!\n');
  console.log('📚 Next Steps:');
  console.log('   1. Configure DocuSign credentials (see DOCUSIGN_SETUP.md)');
  console.log('   2. Add environment variables to Supabase');
  console.log('   3. Test with real documents in the Document Hub\n');
}

runTests();
