/**
 * Test authentication functionality
 */

import { authService } from './src/lib/auth.js';
import { config } from 'dotenv';

config();

async function testAuth() {
  console.log('🔐 Testing Authentication System');
  console.log('================================');

  try {
    // Test 1: Sign in with demo user
    console.log('1️⃣ Testing sign in with demo user...');
    const signInResult = await authService.signIn('demo@chalmers.se', 'demo123');
    
    if (signInResult.data) {
      console.log('✅ Sign in successful');
      console.log('   User ID:', signInResult.data.user.id);
      console.log('   Email:', signInResult.data.user.email);
      console.log('   Role:', signInResult.data.user.role);
      console.log('   Token expires at:', new Date(signInResult.data.session.expires_at * 1000).toISOString());
    } else {
      console.log('❌ Sign in failed:', signInResult.error?.message);
      return;
    }

    // Test 2: Verify token
    console.log('\n2️⃣ Testing token verification...');
    const getUserResult = await authService.getUser(signInResult.data.session.access_token);
    
    if (getUserResult.data) {
      console.log('✅ Token verification successful');
      console.log('   User:', getUserResult.data.user.email);
    } else {
      console.log('❌ Token verification failed:', getUserResult.error?.message);
    }

    // Test 3: Test refresh token
    console.log('\n3️⃣ Testing refresh token...');
    const refreshResult = await authService.refreshSession(signInResult.data.session.refresh_token);
    
    if (refreshResult.data) {
      console.log('✅ Refresh token successful');
      console.log('   New token expires at:', new Date(refreshResult.data.session.expires_at * 1000).toISOString());
    } else {
      console.log('❌ Refresh token failed:', refreshResult.error?.message);
    }

    // Test 4: Sign out
    console.log('\n4️⃣ Testing sign out...');
    const signOutResult = await authService.signOut(signInResult.data.session.refresh_token);
    
    if (!signOutResult.error) {
      console.log('✅ Sign out successful');
    } else {
      console.log('❌ Sign out failed:', signOutResult.error.message);
    }

    console.log('\n🎉 Authentication system test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAuth();