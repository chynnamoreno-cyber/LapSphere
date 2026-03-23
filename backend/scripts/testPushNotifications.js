/**
 * Comprehensive Push Notification Test Script
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const baseURL = 'http://localhost:4000/api/v1';

async function makeRequest(method, endpoint, body = null, token = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (token) options.headers.Authorization = `Bearer ${token}`;
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${baseURL}${endpoint}`, options);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  Push Notification Test Suite         ║');
  console.log('╚════════════════════════════════════════╝\n');

  try {
    // Test 1: Health check
    console.log('📍 Test 1: Backend Health Check');
    const health = await makeRequest('GET', '/health');
    if (health.ok) {
      console.log('✅ Backend is responding\n');
    } else {
      console.log('❌ Backend not accessible\n');
      return;
    }

    // Test 2: Create test user or login
    console.log('📍 Test 2: Setting Up Test User');
    const loginEmail = 'test-admin@lapsphere.com';
    const loginPass = 'test123456';
    
    // Try login
    let tokenRes = await makeRequest('POST', '/users/login', { email: loginEmail, password: loginPass });
    
    // If login fails, register as admin
    if (!tokenRes.ok) {
      console.log('  - User not found, registering as admin...');
      const regRes = await makeRequest('POST', '/users/register', {
        name: 'Test Admin',
        email: loginEmail,
        password: loginPass,
        phone: '1234567890',
        isAdmin: true,
      });
      if (!regRes.ok) {
        console.log(`❌ Could not register: ${regRes.data.message}`);
        return;
      }
      // Login again
      tokenRes = await makeRequest('POST', '/users/login', { email: loginEmail, password: loginPass });
    }

    if (!tokenRes.ok) {
      console.log(`❌ Could not login: ${tokenRes.data.message}`);
      return;
    }

    const token = tokenRes.data.token;
    const userId = tokenRes.data.user.userId;
    
    console.log(`✅ Test user ready`);
    console.log(`  - Email: ${loginEmail}`);
    console.log(`  - User ID: ${userId}`);
    console.log(`  - Token: ${token.substring(0, 30)}...\n`);

    // Test 3: Check push token status
    console.log('📍 Test 3: Checking Push Token Status');
    const statusRes = await makeRequest('GET', '/users/push-token', null, token);
    if (statusRes.ok) {
      console.log(`✅ User push token status:`);
      console.log(`  - Has Token: ${statusRes.data.hasToken}`);
      console.log(`  - Token Type: ${statusRes.data.tokenType || 'None'}`);
      if (statusRes.data.tokenPreview) {
        console.log(`  - Preview: ${statusRes.data.tokenPreview}`);
      }
    } else {
      console.log(`❌ Could not check token status (${statusRes.status})`);
      console.log(`   Response: ${JSON.stringify(statusRes.data)}`);
    }
    console.log();

    // Test 4: Send test notification to this user
    console.log('📍 Test 4: Sending Test Notification to User');
    const testRes = await makeRequest('POST', '/promos/test/send-notification', { userId }, token);

    if (testRes.ok && testRes.data.success) {
      console.log(`✅ Test notification sent!`);
      console.log(`  - Sent to: ${testRes.data.sent} device(s)`);
      console.log(`  - User: ${testRes.data.userInfo.name} (${testRes.data.userInfo.email})`);
      console.log(`  - Token Type: ${testRes.data.userInfo.tokenType}`);
    } else if (testRes.status === 400) {
      console.log(`⚠️  ${testRes.data.message}`);
      console.log(`  → User has no push token registered yet`);
    } else {
      console.log(`❌ Error (${testRes.status}): ${testRes.data.message || 'Unknown error'}`);
      console.log(`   Full response: ${JSON.stringify(testRes.data)}`);
    }
    console.log();

    // Test 5: List all users with push tokens (broadcast to all)
    console.log('📍 Test 5: Broadcast Test to All Users');
    const broadcastRes = await makeRequest('POST', '/promos/test/send-notification', {}, token);

    if (broadcastRes.ok) {
      console.log(`✅ Broadcast Summary:`);
      console.log(`  - Devices with tokens: ${broadcastRes.data.sent}`);
      if (broadcastRes.data.breakdown) {
        console.log(`  - Expo tokens: ${broadcastRes.data.breakdown.expo}`);
        console.log(`  - FCM tokens: ${broadcastRes.data.breakdown.fcm}`);
      }
      if (broadcastRes.data.sent === 0) {
        console.log(`\n  ⚠️  No push tokens registered in system!`);
      }
    }
    console.log();

    // Summary
    console.log('╔════════════════════════════════════════╗');
    console.log('║  Test Summary                          ║');
    console.log('╚════════════════════════════════════════╝\n');
    console.log('✅ Push notification system is configured!\n');
    console.log('📋 To get notifications working:');
    console.log('   1. Open mobile app in Expo Go');
    console.log('   2. Log in with email: ' + loginEmail + ' (or any user account)');
    console.log('   3. Grant notification permissions');
    console.log('   4. Check console for: "[Push] Token registered successfully"');
    console.log('   5. Re-run this test to verify registration');
    console.log('   6. Then notifications will be received\n');

  } catch (err) {
    console.error('Fatal error:', err.message);
  }
}

// Run tests
runTests();
