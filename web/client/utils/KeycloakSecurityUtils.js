/**
 * Copyright 2024, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { KeycloakSessionManager } from './KeycloakSessionUtils';
import { getSecurityInfo, getUser } from './SecurityUtils';

/**
 * Keycloak Security Utils - Integrates Keycloak token management with MapStore
 */
export class KeycloakSecurityUtils {
    
    /**
     * Check if current user is authenticated via Keycloak
     */
    static isKeycloakUser() {
        const user = getUser();
        return user && user.attributes && 
               (user.attributes.authenticated_via === 'password' || 
                user.attributes.authenticated_via === 'authorization_code' ||
                user.attributes.realm);
    }
    
    /**
     * Get access token - prioritizes Keycloak token for Keycloak users
     */
    static getToken() {
        if (this.isKeycloakUser()) {
            return KeycloakSessionManager.getAccessToken();
        }
        // Fallback to default MapStore token
        const secInfo = getSecurityInfo();
        return secInfo?.token;
    }
    
    /**
     * Get refresh token - prioritizes Keycloak refresh token for Keycloak users
     */
    static getRefreshToken() {
        if (this.isKeycloakUser()) {
            return KeycloakSessionManager.getRefreshToken();
        }
        // Fallback to default MapStore refresh token
        const secInfo = getSecurityInfo();
        return secInfo?.refresh_token;
    }
    
    /**
     * Check if token is expired
     */
    static isTokenExpired() {
        if (this.isKeycloakUser()) {
            const token = KeycloakSessionManager.getAccessToken();
            return KeycloakSessionManager.isTokenExpired(token);
        }
        // Fallback to default logic
        return false; // Default MapStore doesn't have expiration check
    }
    
    /**
     * Refresh access token using appropriate method
     */
    static async refreshToken() {
        if (this.isKeycloakUser()) {
            try {
                const newToken = await KeycloakSessionManager.refreshAccessToken();
                console.log('Keycloak token refreshed successfully');
                return {
                    access_token: newToken,
                    refresh_token: KeycloakSessionManager.getRefreshToken(),
                    authProvider: 'keycloak'
                };
            } catch (error) {
                console.error('Keycloak token refresh failed:', error);
                throw error;
            }
        } else {
            // Fallback to default MapStore refresh mechanism
            const AuthenticationAPI = require('../api/GeoStoreDAO').default;
            const secInfo = getSecurityInfo();
            if (secInfo?.token && secInfo?.refresh_token) {
                return AuthenticationAPI.refreshToken(secInfo.token, secInfo.refresh_token);
            }
            throw new Error('No refresh token available');
        }
    }
    
    /**
     * Get user details using appropriate method
     */
    static async getUserDetails(tokenData) {
        if (this.isKeycloakUser()) {
            // For Keycloak users, get fresh user info
            try {
                const updatedUser = await KeycloakSessionManager.refreshUserInfoFromKeycloak(tokenData.access_token);
                return {
                    User: updatedUser,
                    access_token: tokenData.access_token,
                    refresh_token: tokenData.refresh_token,
                    authProvider: tokenData.authProvider || 'keycloak'
                };
            } catch (error) {
                console.error('Failed to get Keycloak user details:', error);
                // Fallback to stored user
                const user = getUser();
                return {
                    User: user,
                    access_token: tokenData.access_token,
                    refresh_token: tokenData.refresh_token,
                    authProvider: tokenData.authProvider || 'keycloak'
                };
            }
        } else {
            // Fallback to default MapStore mechanism
            const AuthenticationAPI = require('../api/GeoStoreDAO').default;
            return AuthenticationAPI.getUserDetails(tokenData);
        }
    }
    
    /**
     * Verify session using appropriate method
     */
    static async verifySession() {
        if (this.isKeycloakUser()) {
            const token = KeycloakSessionManager.getAccessToken();
            if (!token) {
                throw new Error('No Keycloak token available');
            }
            
            if (KeycloakSessionManager.isTokenExpired(token)) {
                // Try to refresh the token
                try {
                    await KeycloakSessionManager.refreshAccessToken();
                    const user = KeycloakSessionManager.getUser();
                    return {
                        User: user,
                        access_token: KeycloakSessionManager.getAccessToken(),
                        refresh_token: KeycloakSessionManager.getRefreshToken(),
                        authProvider: 'keycloak'
                    };
                } catch (error) {
                    console.error('Token refresh failed during session verification:', error);
                    throw error;
                }
            } else {
                // Token is still valid
                const user = KeycloakSessionManager.getUser();
                return {
                    User: user,
                    access_token: token,
                    refresh_token: KeycloakSessionManager.getRefreshToken(),
                    authProvider: 'keycloak'
                };
            }
        } else {
            // Fallback to default MapStore mechanism
            const AuthenticationAPI = require('../api/GeoStoreDAO').default;
            return AuthenticationAPI.verifySession();
        }
    }
    
    /**
     * Complete logout with comprehensive token and cache cleanup
     */
    static async logout() {
        try {
            console.log('🚪 KeycloakSecurityUtils: Starting complete logout and cache cleanup...');
            
            // 1. Keycloak session cleanup
            if (this.isKeycloakUser()) {
                await KeycloakSessionManager.logout();
                console.log('✅ Keycloak session manager cleanup completed');
            }
            
            // 2. Clear all cached tokens and session data
            this.clearAllTokensAndCache();
            
            // 3. Clear Redux store security state
            this.clearReduxSecurityState();
            
            console.log('✅ Complete logout and cache cleanup finished');
            
        } catch (error) {
            console.error('❌ Logout cleanup error:', error);
            // Force cleanup even if errors occur
            this.forceCleanup();
        }
    }
    
    /**
     * Clear all tokens and cached data from the application
     */
    static clearAllTokensAndCache() {
        try {
            console.log('🧹 Clearing all tokens and cache...');
            
            // Clear all localStorage keys related to authentication
            const authKeys = [
                // MapStore keys
                'mapstore2-user',
                'mapstore2-token',
                'mapstore2-refresh-token',
                'mapstore2-security',
                'mapstore2-auth',
                'mapstore2-session',
                
                // Keycloak keys
                'keycloak_access_token',
                'keycloak_refresh_token',
                'keycloak_user',
                'keycloak_session_state',
                'keycloak_session',
                
                // OIDC keys
                'oidc.user',
                'oidc.access_token',
                'oidc.refresh_token',
                'oidc.session',
                
                // OAuth keys
                'oauth_token',
                'oauth_refresh_token',
                'oauth_session',
                
                // Security related keys
                'security_token',
                'auth_token',
                'bearer_token',
                'access_token',
                'refresh_token',
                'session_token'
            ];
            
            // Remove known authentication keys
            authKeys.forEach(key => {
                try {
                    localStorage.removeItem(key);
                    sessionStorage.removeItem(key);
                } catch (e) {
                    console.warn(`Failed to remove key: ${key}`);
                }
            });
            
            // Clear all keys that contain authentication-related terms
            const authPatterns = [
                'keycloak', 'kc-', 'kc_', 'oidc', 'oauth', 'auth', 'token', 
                'session', 'security', 'bearer', 'jwt', 'credential'
            ];
            
            // Clear localStorage
            Object.keys(localStorage).forEach(key => {
                if (authPatterns.some(pattern => key.toLowerCase().includes(pattern))) {
                    try {
                        localStorage.removeItem(key);
                    } catch (e) {
                        console.warn(`Failed to remove localStorage key: ${key}`);
                    }
                }
            });
            
            // Clear sessionStorage
            Object.keys(sessionStorage).forEach(key => {
                if (authPatterns.some(pattern => key.toLowerCase().includes(pattern))) {
                    try {
                        sessionStorage.removeItem(key);
                    } catch (e) {
                        console.warn(`Failed to remove sessionStorage key: ${key}`);
                    }
                }
            });
            
            // Clear IndexedDB if available
            this.clearIndexedDBAuth();
            
            // Clear cookies related to authentication
            this.clearAuthCookies();
            
            console.log('✅ All tokens and cache cleared');
            
        } catch (error) {
            console.error('❌ Error clearing tokens and cache:', error);
        }
    }
    
    /**
     * Clear Redux store security state
     */
    static clearReduxSecurityState() {
        try {
            // Try to access Redux store and clear security state
            if (window.__REDUX_STORE__) {
                const store = window.__REDUX_STORE__;
                store.dispatch({ type: 'LOGOUT' });
                store.dispatch({ type: 'RESET_SECURITY_STATE' });
                console.log('✅ Redux security state cleared');
            }
            
            // Clear any global application state
            if (window.mapstore) {
                delete window.mapstore.user;
                delete window.mapstore.token;
                delete window.mapstore.security;
                console.log('✅ Global mapstore state cleared');
            }
            
        } catch (error) {
            console.warn('⚠️ Could not clear Redux state:', error.message);
        }
    }
    
    /**
     * Clear IndexedDB authentication data
     */
    static clearIndexedDBAuth() {
        try {
            if ('indexedDB' in window) {
                // Common IndexedDB names for authentication
                const dbNames = ['auth', 'security', 'keycloak', 'oidc', 'oauth', 'mapstore'];
                
                dbNames.forEach(dbName => {
                    try {
                        const deleteRequest = indexedDB.deleteDatabase(dbName);
                        deleteRequest.onsuccess = () => {
                            console.log(`✅ IndexedDB ${dbName} cleared`);
                        };
                        deleteRequest.onerror = () => {
                            console.warn(`⚠️ Could not clear IndexedDB ${dbName}`);
                        };
                    } catch (e) {
                        console.warn(`⚠️ Error clearing IndexedDB ${dbName}:`, e);
                    }
                });
            }
        } catch (error) {
            console.warn('⚠️ IndexedDB cleanup error:', error);
        }
    }
    
    /**
     * Clear authentication-related cookies
     */
    static clearAuthCookies() {
        try {
            const authCookieNames = [
                'KEYCLOAK_SESSION',
                'KC_RESTART',
                'AUTH_SESSION_ID',
                'JSESSIONID',
                'access_token',
                'refresh_token',
                'session_token',
                'auth_token',
                'bearer_token'
            ];
            
            authCookieNames.forEach(cookieName => {
                // Clear for current domain
                document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
                // Clear for parent domain
                document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
                // Clear for Keycloak domain
                document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=gisidgw.geosystems-me.com;`;
            });
            
            console.log('✅ Authentication cookies cleared');
            
        } catch (error) {
            console.warn('⚠️ Cookie cleanup error:', error);
        }
    }
    
    /**
     * Force cleanup when normal logout fails
     */
    static forceCleanup() {
        try {
            console.log('🔥 Performing force cleanup...');
            
            // Nuclear option: clear all localStorage and sessionStorage
            try {
                localStorage.clear();
                sessionStorage.clear();
                console.log('✅ Force cleared all storage');
            } catch (e) {
                console.error('❌ Force cleanup failed:', e);
            }
            
            // Clear all cookies
            document.cookie.split(";").forEach(cookie => {
                const eqPos = cookie.indexOf("=");
                const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
                document.cookie = `${name.trim()}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            });
            
            // Reload page as last resort
            setTimeout(() => {
                console.log('🔄 Force reloading page to complete cleanup...');
                window.location.reload();
            }, 1000);
            
        } catch (error) {
            console.error('❌ Force cleanup error:', error);
        }
    }
    
    /**
     * Get authorization headers for API requests
     */
    static getAuthHeaders() {
        const token = this.getToken();
        if (token) {
            return {
                'Authorization': `Bearer ${token}`
            };
        }
        return {};
    }
}

export default KeycloakSecurityUtils; 