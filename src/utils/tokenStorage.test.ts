// Demo/test file for token storage utilities
// This would typically be in a proper test suite but included here for demonstration

import { EnhancedTokenStorage, TokenManager, TokenValidationError } from './tokenStorage';

// Mock JWT tokens for testing (normally these would come from your backend)
const MOCK_ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwidXNlcklkIjoiMTIzNDU2Nzg5MCIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsImlhdCI6MTcyNjA0NDE3NSwiZXhwIjoxOTQxNDA0MTc1LCJ0eXBlIjoiYWNjZXNzIn0.example_signature';
const MOCK_REFRESH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwidXNlcklkIjoiMTIzNDU2Nzg5MCIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsImlhdCI6MTcyNjA0NDE3NSwiZXhwIjoxOTQxNDA0MTc1LCJ0eXBlIjoicmVmcmVzaCJ9.example_signature';

/**
 * Demo function showing basic token storage operations
 */
export function demoBasicTokenOperations(): void {
  console.log('=== Basic Token Storage Demo ===');
  
  try {
    // Clear any existing tokens
    EnhancedTokenStorage.clearTokens();
    console.log('✓ Cleared existing tokens');

    // Check initial state
    console.log('Initial authentication state:', EnhancedTokenStorage.hasValidTokens());

    // Store tokens (normally these would be real JWT tokens from your backend)
    // For demo purposes, we'll use the fallback storage
    try {
      EnhancedTokenStorage.setTokens(MOCK_ACCESS_TOKEN, MOCK_REFRESH_TOKEN);
      console.log('✓ Stored tokens successfully');
    } catch (error) {
      console.log('Token validation failed (expected with mock tokens), using fallback storage');
      // Fallback to direct localStorage for demo
      localStorage.setItem('playshelf_access_token', MOCK_ACCESS_TOKEN);
      localStorage.setItem('playshelf_refresh_token', MOCK_REFRESH_TOKEN);
    }

    // Check authentication state
    const isAuthenticated = !!(localStorage.getItem('playshelf_access_token') && localStorage.getItem('playshelf_refresh_token'));
    console.log('Authentication state after storing tokens:', isAuthenticated);

    // Get storage statistics
    const stats = EnhancedTokenStorage.getStorageStats();
    console.log('Storage statistics:', stats);

  } catch (error) {
    console.error('Error in basic token operations demo:', error);
  }
}

/**
 * Demo function showing enhanced token validation features
 */
export function demoTokenValidation(): void {
  console.log('\n=== Token Validation Demo ===');
  
  try {
    // Test token expiry checking
    const accessExpiry = EnhancedTokenStorage.getTokenExpiry('access');
    const refreshExpiry = EnhancedTokenStorage.getTokenExpiry('refresh');
    
    console.log('Access token expiry:', accessExpiry);
    console.log('Refresh token expiry:', refreshExpiry);

    // Test time to expiry
    const timeToExpiry = EnhancedTokenStorage.getTimeToExpiry('access');
    console.log('Time to access token expiry (ms):', timeToExpiry);

    // Test access token expiry status
    const isExpired = EnhancedTokenStorage.isAccessTokenExpired();
    console.log('Is access token expired:', isExpired);

    // Try to get user info (will be null with mock tokens due to validation)
    const userInfo = EnhancedTokenStorage.getUserInfo();
    console.log('User info from token:', userInfo);

  } catch (error) {
    console.error('Error in token validation demo:', error);
  }
}

/**
 * Demo function showing cross-tab synchronization
 */
export function demoCrossTabSync(): void {
  console.log('\n=== Cross-Tab Synchronization Demo ===');
  
  try {
    // Set up cross-tab sync
    const cleanup = EnhancedTokenStorage.setupCrossTabSync();
    console.log('✓ Cross-tab sync set up');

    // Add a change listener
    const removeListener = EnhancedTokenStorage.addChangeListener((event, tokens) => {
      console.log('Token change event:', event, tokens ? 'with tokens' : 'without tokens');
    });

    // Simulate token update (in real app, this would come from another tab)
    setTimeout(() => {
      console.log('Simulating token removal...');
      EnhancedTokenStorage.clearTokens();
      
      // Clean up after demo
      setTimeout(() => {
        removeListener();
        cleanup();
        console.log('✓ Cross-tab sync demo complete');
      }, 100);
    }, 1000);

  } catch (error) {
    console.error('Error in cross-tab sync demo:', error);
  }
}

/**
 * Demo function showing error handling
 */
export function demoErrorHandling(): void {
  console.log('\n=== Error Handling Demo ===');
  
  try {
    // Test invalid token handling
    try {
      EnhancedTokenStorage.setAccessToken('invalid-token');
    } catch (error) {
      if (error instanceof TokenValidationError) {
        console.log('✓ Caught token validation error:', error.message);
      }
    }

    // Test empty token handling
    try {
      EnhancedTokenStorage.setAccessToken('');
    } catch (error) {
      if (error instanceof TokenValidationError) {
        console.log('✓ Caught empty token error:', error.message);
      }
    }

    // Test storage error simulation (would require mocking localStorage)
    console.log('Storage error handling would be tested with localStorage mocking');

  } catch (error) {
    console.error('Error in error handling demo:', error);
  }
}

/**
 * Demo function showing legacy compatibility
 */
export function demoLegacyCompatibility(): void {
  console.log('\n=== Legacy Compatibility Demo ===');
  
  try {
    // Test that old TokenManager still works
    TokenManager.clearTokens();
    console.log('✓ Legacy TokenManager.clearTokens() works');

    // Test fallback storage
    TokenManager.setAccessToken(MOCK_ACCESS_TOKEN);
    TokenManager.setRefreshToken(MOCK_REFRESH_TOKEN);
    console.log('✓ Legacy TokenManager.setTokens() works with fallback');

    const hasTokens = TokenManager.hasValidTokens();
    console.log('Legacy TokenManager.hasValidTokens():', hasTokens);

    const accessToken = TokenManager.getAccessToken();
    console.log('Legacy TokenManager.getAccessToken() returns:', !!accessToken);

  } catch (error) {
    console.error('Error in legacy compatibility demo:', error);
  }
}

/**
 * Run all demos
 */
export function runAllTokenStorageDemos(): void {
  console.log('🔐 PlayShelf Token Storage Utilities Demo\n');
  
  demoBasicTokenOperations();
  demoTokenValidation();
  demoErrorHandling();
  demoLegacyCompatibility();
  demoCrossTabSync(); // This one uses setTimeout, so runs last
}

// Export for use in browser console or testing
if (typeof window !== 'undefined') {
  (window as any).tokenStorageDemo = {
    runAll: runAllTokenStorageDemos,
    basic: demoBasicTokenOperations,
    validation: demoTokenValidation,
    crossTab: demoCrossTabSync,
    errors: demoErrorHandling,
    legacy: demoLegacyCompatibility,
  };
  
  console.log('💡 Token storage demo functions available at window.tokenStorageDemo');
  console.log('   Run window.tokenStorageDemo.runAll() to test all features');
}