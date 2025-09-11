import { jwtDecode } from 'jwt-decode';

// JWT payload interface
interface JwtPayload {
  sub: string;
  userId: string;
  email: string;
  iat: number;
  exp: number;
  type: 'access' | 'refresh';
}

// Storage keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'playshelf_access_token',
  REFRESH_TOKEN: 'playshelf_refresh_token',
  LAST_AUTH_CHECK: 'playshelf_last_auth_check',
};

// Storage events for cross-tab synchronisation
const STORAGE_EVENTS = {
  TOKEN_UPDATED: 'playshelf_token_updated',
  TOKEN_REMOVED: 'playshelf_token_removed',
};

// Error types
export class TokenStorageError extends Error {
  public code: string;
  
  constructor(message: string, code: string) {
    super(message);
    this.name = 'TokenStorageError';
    this.code = code;
  }
}

export class TokenValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenValidationError';
  }
}

/**
 * Enhanced token storage utilities with comprehensive security and validation
 */
export class EnhancedTokenStorage {
  private static readonly EXPIRY_BUFFER_MS = 5 * 60 * 1000; // 5 minutes buffer before expiry
  private static storageAvailable = true;
  private static eventListeners: Array<(event: 'updated' | 'removed', tokens?: { access?: string; refresh?: string }) => void> = [];

  /**
   * Check if localStorage is available and handle quota errors
   */
  private static checkStorageAvailability(): boolean {
    if (!this.storageAvailable) return false;

    try {
      const testKey = '__playshelf_storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      console.warn('localStorage not available:', error);
      this.storageAvailable = false;
      return false;
    }
  }

  /**
   * Safely store item in localStorage with error handling
   */
  private static safeSetItem(key: string, value: string): void {
    if (!this.checkStorageAvailability()) {
      throw new TokenStorageError('Storage not available', 'STORAGE_UNAVAILABLE');
    }

    try {
      localStorage.setItem(key, value);
    } catch (error) {
      if (error instanceof DOMException && error.code === 22) {
        // Quota exceeded
        this.clearExpiredTokens();
        try {
          localStorage.setItem(key, value);
        } catch (retryError) {
          throw new TokenStorageError('Storage quota exceeded', 'STORAGE_QUOTA_EXCEEDED');
        }
      } else {
        throw new TokenStorageError('Failed to store token', 'STORAGE_ERROR');
      }
    }
  }

  /**
   * Safely retrieve item from localStorage
   */
  private static safeGetItem(key: string): string | null {
    if (!this.checkStorageAvailability()) {
      return null;
    }

    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn('Failed to retrieve from storage:', error);
      return null;
    }
  }

  /**
   * Safely remove item from localStorage
   */
  private static safeRemoveItem(key: string): void {
    if (!this.checkStorageAvailability()) {
      return;
    }

    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to remove from storage:', error);
    }
  }

  /**
   * Decode JWT token safely
   */
  private static decodeToken(token: string, silent = false): JwtPayload | null {
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      
      // Validate required fields
      if (!decoded.sub || !decoded.exp || !decoded.type) {
        throw new TokenValidationError('Invalid token structure');
      }

      return decoded;
    } catch (error) {
      // Only log warnings if not in silent mode
      if (!silent) {
        console.warn('Failed to decode token:', error);
      }
      return null;
    }
  }

  /**
   * Check if token is valid and not expired
   */
  private static isTokenValid(token: string, silent = false): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }

    const decoded = this.decodeToken(token, silent);
    if (!decoded) {
      return false;
    }

    // Check expiry with buffer
    const now = Math.floor(Date.now() / 1000);
    const expiryWithBuffer = decoded.exp - Math.floor(this.EXPIRY_BUFFER_MS / 1000);
    
    return now < expiryWithBuffer;
  }

  /**
   * Get access token with validation
   */
  static getAccessToken(): string | null {
    const token = this.safeGetItem(STORAGE_KEYS.ACCESS_TOKEN);
    
    if (!token) {
      return null;
    }

    // Validate token silently to avoid console warnings on app startup
    if (!this.isTokenValid(token, true)) {
      this.safeRemoveItem(STORAGE_KEYS.ACCESS_TOKEN);
      return null;
    }

    return token;
  }

  /**
   * Get refresh token with validation
   */
  static getRefreshToken(): string | null {
    const token = this.safeGetItem(STORAGE_KEYS.REFRESH_TOKEN);
    
    if (!token) {
      return null;
    }

    // Validate token silently to avoid console warnings on app startup
    if (!this.isTokenValid(token, true)) {
      this.safeRemoveItem(STORAGE_KEYS.REFRESH_TOKEN);
      return null;
    }

    return token;
  }

  /**
   * Store access token with validation
   */
  static setAccessToken(token: string): void {
    if (!token || typeof token !== 'string') {
      throw new TokenValidationError('Invalid access token');
    }

    // Validate token structure
    const decoded = this.decodeToken(token);
    if (!decoded || decoded.type !== 'access') {
      throw new TokenValidationError('Invalid access token format');
    }

    this.safeSetItem(STORAGE_KEYS.ACCESS_TOKEN, token);
    this.updateLastAuthCheck();
    this.notifyListeners('updated', { access: token });
    this.broadcastStorageEvent('updated', { access: token });
  }

  /**
   * Store refresh token with validation
   */
  static setRefreshToken(token: string): void {
    if (!token || typeof token !== 'string') {
      throw new TokenValidationError('Invalid refresh token');
    }

    // Validate token structure
    const decoded = this.decodeToken(token);
    if (!decoded || decoded.type !== 'refresh') {
      throw new TokenValidationError('Invalid refresh token format');
    }

    this.safeSetItem(STORAGE_KEYS.REFRESH_TOKEN, token);
    this.notifyListeners('updated', { refresh: token });
    this.broadcastStorageEvent('updated', { refresh: token });
  }

  /**
   * Store both tokens atomically
   */
  static setTokens(accessToken: string, refreshToken: string): void {
    // Validate both tokens first
    this.setAccessToken(accessToken);
    this.setRefreshToken(refreshToken);
    
    this.notifyListeners('updated', { access: accessToken, refresh: refreshToken });
    this.broadcastStorageEvent('updated', { access: accessToken, refresh: refreshToken });
  }

  /**
   * Clear all tokens
   */
  static clearTokens(): void {
    this.safeRemoveItem(STORAGE_KEYS.ACCESS_TOKEN);
    this.safeRemoveItem(STORAGE_KEYS.REFRESH_TOKEN);
    this.safeRemoveItem(STORAGE_KEYS.LAST_AUTH_CHECK);
    
    this.notifyListeners('removed');
    this.broadcastStorageEvent('removed');
  }

  /**
   * Check if user has valid authentication tokens
   */
  static hasValidTokens(): boolean {
    const accessToken = this.getAccessToken();
    const refreshToken = this.getRefreshToken();
    
    return !!(accessToken && refreshToken);
  }

  /**
   * Check if access token is expired or will expire soon
   */
  static isAccessTokenExpired(): boolean {
    const token = this.safeGetItem(STORAGE_KEYS.ACCESS_TOKEN);
    
    if (!token) {
      return true;
    }

    return !this.isTokenValid(token, true);
  }

  /**
   * Get token expiration time
   */
  static getTokenExpiry(tokenType: 'access' | 'refresh'): Date | null {
    const key = tokenType === 'access' ? STORAGE_KEYS.ACCESS_TOKEN : STORAGE_KEYS.REFRESH_TOKEN;
    const token = this.safeGetItem(key);
    
    if (!token) {
      return null;
    }

    const decoded = this.decodeToken(token);
    if (!decoded) {
      return null;
    }

    return new Date(decoded.exp * 1000);
  }

  /**
   * Get time until token expiry in milliseconds
   */
  static getTimeToExpiry(tokenType: 'access' | 'refresh'): number | null {
    const expiry = this.getTokenExpiry(tokenType);
    
    if (!expiry) {
      return null;
    }

    return expiry.getTime() - Date.now();
  }

  /**
   * Get user information from access token
   */
  static getUserInfo(): { userId: string; email: string } | null {
    const token = this.getAccessToken();
    
    if (!token) {
      return null;
    }

    const decoded = this.decodeToken(token);
    if (!decoded) {
      return null;
    }

    return {
      userId: decoded.userId,
      email: decoded.email,
    };
  }

  /**
   * Update last authentication check timestamp
   */
  private static updateLastAuthCheck(): void {
    this.safeSetItem(STORAGE_KEYS.LAST_AUTH_CHECK, Date.now().toString());
  }

  /**
   * Get last authentication check timestamp
   */
  static getLastAuthCheck(): Date | null {
    const timestamp = this.safeGetItem(STORAGE_KEYS.LAST_AUTH_CHECK);
    
    if (!timestamp) {
      return null;
    }

    const parsed = parseInt(timestamp, 10);
    return isNaN(parsed) ? null : new Date(parsed);
  }

  /**
   * Clear expired tokens from storage
   */
  static clearExpiredTokens(): void {
    const accessToken = this.safeGetItem(STORAGE_KEYS.ACCESS_TOKEN);
    const refreshToken = this.safeGetItem(STORAGE_KEYS.REFRESH_TOKEN);

    if (accessToken && !this.isTokenValid(accessToken, true)) {
      this.safeRemoveItem(STORAGE_KEYS.ACCESS_TOKEN);
    }

    if (refreshToken && !this.isTokenValid(refreshToken, true)) {
      this.safeRemoveItem(STORAGE_KEYS.REFRESH_TOKEN);
    }
  }

  /**
   * Add event listener for token changes
   */
  static addChangeListener(
    callback: (event: 'updated' | 'removed', tokens?: { access?: string; refresh?: string }) => void
  ): () => void {
    this.eventListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.eventListeners.indexOf(callback);
      if (index > -1) {
        this.eventListeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of token changes
   */
  private static notifyListeners(
    event: 'updated' | 'removed',
    tokens?: { access?: string; refresh?: string }
  ): void {
    this.eventListeners.forEach(callback => {
      try {
        callback(event, tokens);
      } catch (error) {
        console.warn('Error in token change listener:', error);
      }
    });
  }

  /**
   * Broadcast storage events for cross-tab synchronisation
   */
  private static broadcastStorageEvent(
    event: 'updated' | 'removed',
    tokens?: { access?: string; refresh?: string }
  ): void {
    try {
      const eventData = { event, tokens, timestamp: Date.now() };
      
      if (event === 'updated') {
        window.dispatchEvent(new CustomEvent(STORAGE_EVENTS.TOKEN_UPDATED, { detail: eventData }));
      } else {
        window.dispatchEvent(new CustomEvent(STORAGE_EVENTS.TOKEN_REMOVED, { detail: eventData }));
      }
    } catch (error) {
      console.warn('Failed to broadcast storage event:', error);
    }
  }

  /**
   * Set up cross-tab synchronisation listeners
   */
  static setupCrossTabSync(): () => void {
    const handleStorageChange = (event: StorageEvent) => {
      if (!event.key || !Object.values(STORAGE_KEYS).includes(event.key)) {
        return;
      }

      // Handle token removal
      if (event.newValue === null) {
        this.notifyListeners('removed');
        return;
      }

      // Handle token updates
      if (event.key === STORAGE_KEYS.ACCESS_TOKEN || event.key === STORAGE_KEYS.REFRESH_TOKEN) {
        const accessToken = this.safeGetItem(STORAGE_KEYS.ACCESS_TOKEN);
        const refreshToken = this.safeGetItem(STORAGE_KEYS.REFRESH_TOKEN);
        
        this.notifyListeners('updated', { 
          access: accessToken || undefined, 
          refresh: refreshToken || undefined 
        });
      }
    };

    const handleCustomEvent = (event: CustomEvent) => {
      const { event: eventType, tokens } = event.detail;
      this.notifyListeners(eventType, tokens);
    };

    // Add listeners
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener(STORAGE_EVENTS.TOKEN_UPDATED, handleCustomEvent as EventListener);
    window.addEventListener(STORAGE_EVENTS.TOKEN_REMOVED, handleCustomEvent as EventListener);

    // Return cleanup function
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(STORAGE_EVENTS.TOKEN_UPDATED, handleCustomEvent as EventListener);
      window.removeEventListener(STORAGE_EVENTS.TOKEN_REMOVED, handleCustomEvent as EventListener);
    };
  }

  /**
   * Get storage usage statistics
   */
  static getStorageStats(): {
    totalSize: number;
    tokenSize: number;
    available: boolean;
  } {
    if (!this.checkStorageAvailability()) {
      return { totalSize: 0, tokenSize: 0, available: false };
    }

    let totalSize = 0;
    let tokenSize = 0;

    try {
      // Calculate total storage usage
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          const value = localStorage.getItem(key) || '';
          totalSize += key.length + value.length;
          
          if (Object.values(STORAGE_KEYS).includes(key)) {
            tokenSize += key.length + value.length;
          }
        }
      }

      return { totalSize, tokenSize, available: true };
    } catch (error) {
      return { totalSize: 0, tokenSize: 0, available: false };
    }
  }
}

// Legacy compatibility wrapper to maintain existing API
export class TokenManager {
  static readonly ACCESS_TOKEN_KEY = STORAGE_KEYS.ACCESS_TOKEN;
  static readonly REFRESH_TOKEN_KEY = STORAGE_KEYS.REFRESH_TOKEN;

  static getAccessToken(): string | null {
    return EnhancedTokenStorage.getAccessToken();
  }

  static setAccessToken(token: string): void {
    try {
      EnhancedTokenStorage.setAccessToken(token);
    } catch (error) {
      // Fallback to basic storage for compatibility
      try {
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
      } catch (storageError) {
        console.warn('Failed to store access token:', storageError);
      }
    }
  }

  static getRefreshToken(): string | null {
    return EnhancedTokenStorage.getRefreshToken();
  }

  static setRefreshToken(token: string): void {
    try {
      EnhancedTokenStorage.setRefreshToken(token);
    } catch (error) {
      // Fallback to basic storage for compatibility
      try {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
      } catch (storageError) {
        console.warn('Failed to store refresh token:', storageError);
      }
    }
  }

  static setTokens(accessToken: string, refreshToken: string): void {
    try {
      EnhancedTokenStorage.setTokens(accessToken, refreshToken);
    } catch (error) {
      // Fallback to basic storage for compatibility
      this.setAccessToken(accessToken);
      this.setRefreshToken(refreshToken);
    }
  }

  static clearTokens(): void {
    EnhancedTokenStorage.clearTokens();
  }

  static hasValidTokens(): boolean {
    return EnhancedTokenStorage.hasValidTokens();
  }
}

// Default export for enhanced functionality
export default EnhancedTokenStorage;