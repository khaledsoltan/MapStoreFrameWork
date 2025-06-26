/**
 * Copyright 2024, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import axios from 'axios';
import { getConfigProp } from './ConfigUtils';
import { KeycloakSessionManager } from './KeycloakSessionUtils';
import { KeycloakSecurityUtils } from './KeycloakSecurityUtils';

/**
 * Optimized Keycloak Utils for Backend API Integration
 * Provides high-performance authentication and session management
 */
export class OptimizedKeycloakUtils {
    
    static cache = new Map();
    static cacheTimeout = 300000; // 5 minutes
    
    /**
     * Authenticate with backend API using Keycloak token
     */
    static async authenticateWithBackend(keycloakToken) {
        try {
            const backendUrl = getConfigProp('geoStoreUrl');
            const cacheKey = `backend_auth_${keycloakToken.substring(0, 20)}`;
            
            // Check cache first
            const cached = this.getCached(cacheKey);
            if (cached) {
                return cached;
            }
            
            const response = await axios.post(`${backendUrl}auth/keycloak`, {
                token: keycloakToken
            }, {
                headers: {
                    'Authorization': `Bearer ${keycloakToken}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });
            
            // Cache the result
            this.setCached(cacheKey, response.data);
            return response.data;
            
        } catch (error) {
            console.error('Backend authentication failed:', error);
            throw error;
        }
    }
    
    /**
     * Sync user permissions from backend API
     */
    static async syncUserPermissions(keycloakToken) {
        try {
            const backendUrl = getConfigProp('geoStoreUrl');
            const cacheKey = `user_permissions_${keycloakToken.substring(0, 20)}`;
            
            // Check cache first
            const cached = this.getCached(cacheKey);
            if (cached) {
                return cached;
            }
            
            const response = await axios.get(`${backendUrl}users/user/details`, {
                headers: {
                    'Authorization': `Bearer ${keycloakToken}`
                },
                timeout: 10000
            });
            
            // Cache for shorter time (permissions may change more frequently)
            this.setCached(cacheKey, response.data, 60000); // 1 minute
            return response.data;
            
        } catch (error) {
            console.error('Permission sync failed:', error);
            throw error;
        }
    }
    
    /**
     * Perform complete logout with backend and Keycloak (Enhanced)
     */
    static async performCompleteLogout(keycloakToken) {
        const authProviders = getConfigProp('authenticationProviders') || [];
        const keycloakProvider = authProviders.find(p => 
            p.type === 'openID' || p.type === 'keycloak' || p.provider === 'keycloak'
        );
        
        const results = {
            backend: false,
            keycloak: false,
            localStorage: false,
            keycloakRedirect: false,
            errors: [],
            startTime: new Date().toISOString()
        };
        
        try {
            console.log('🚪 OptimizedKeycloakUtils: Starting complete logout...');
            
            // 1. Backend logout with enhanced error handling
            if (keycloakToken) {
                try {
                    const backendLogoutUrl = keycloakProvider?.advanced?.backendLogoutUrl || 
                                           keycloakProvider?.config?.backendLogoutUrl ||
                                           'http://localhost:9191/geostore/rest/users/user/logout';
                    
                    console.log('🔄 Backend logout to:', backendLogoutUrl);
                    
                    const response = await Promise.race([
                        this.performBackendLogout(keycloakToken, keycloakProvider),
                        new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('Backend logout timeout')), 8000)
                        )
                    ]);
                    
                    results.backend = true;
                    console.log('✅ Backend logout completed');
                } catch (error) {
                    results.errors.push(`Backend logout failed: ${error.message}`);
                    console.warn('⚠️ Backend logout failed:', error.message);
                }
            }
            
            // 2. Enhanced local cleanup
            try {
                this.cleanupLocalStorage();
                results.localStorage = true;
                console.log('✅ Local storage cleanup completed');
            } catch (error) {
                results.errors.push(`LocalStorage cleanup failed: ${error.message}`);
                console.warn('⚠️ LocalStorage cleanup failed:', error.message);
            }
            
            // 3. Keycloak session cleanup (local)
            try {
                if (KeycloakSecurityUtils.isKeycloakUser()) {
                    await KeycloakSecurityUtils.logout();
                    console.log('✅ Keycloak session cleanup completed');
                }
            } catch (error) {
                results.errors.push(`Keycloak session cleanup failed: ${error.message}`);
                console.warn('⚠️ Keycloak session cleanup failed:', error.message);
            }
            
            // 4. Keycloak single logout redirect (if configured)
            const logoutUrl = keycloakProvider?.advanced?.logoutUrl || 
                             keycloakProvider?.config?.logoutUrl;
            const enableSingleLogout = keycloakProvider?.advanced?.enableSingleLogout || 
                                      keycloakProvider?.config?.enableSingleLogout;
            
            if (enableSingleLogout && logoutUrl && keycloakToken) {
                console.log('🔄 Preparing Keycloak single logout redirect...');
                
                const redirectUri = keycloakProvider?.advanced?.postLogoutRedirectUri || 
                                   keycloakProvider?.config?.postLogoutRedirectUri || 
                                   window.location.origin;
                
                const logoutParams = new URLSearchParams({
                    id_token_hint: keycloakToken,
                    post_logout_redirect_uri: redirectUri,
                    redirect_uri: redirectUri,
                    client_id: keycloakProvider?.config?.resource || keycloakProvider?.config?.clientId
                });
                
                const fullLogoutUrl = `${logoutUrl}?${logoutParams.toString()}`;
                
                // Delay to ensure other logout steps complete
                setTimeout(() => {
                    console.log('🔗 Redirecting to Keycloak logout:', fullLogoutUrl);
                    window.location.href = fullLogoutUrl;
                }, 2000);
                
                results.keycloakRedirect = true;
                results.keycloak = true;
            } else {
                console.log('ℹ️ Keycloak single logout not configured or disabled');
                results.keycloak = true; // Consider it successful if not configured
            }
            
        } catch (error) {
            console.error('❌ Complete logout failed:', error);
            results.errors.push(`Complete logout failed: ${error.message}`);
        }
        
        results.endTime = new Date().toISOString();
        console.log('📊 Logout Results:', results);
        
        return results;
    }
    
    /**
     * Perform backend logout with proper error handling
     */
    static async performBackendLogout(keycloakToken, keycloakProvider) {
        if (!keycloakProvider?.advanced?.backendLogoutUrl) {
            throw new Error('Backend logout URL not configured');
        }
        
        const response = await axios.post(keycloakProvider.advanced.backendLogoutUrl, {}, {
            headers: { 
                'Authorization': `Bearer ${keycloakToken}`,
                'Content-Type': 'application/json'
            },
            timeout: 5000,
            validateStatus: (status) => status < 500 // Accept 4xx as success (user might already be logged out)
        });
        
        return response.data;
    }
    
    /**
     * Clean up all local storage with optimized key removal
     */
    static cleanupLocalStorage() {
        const keysToRemove = [
            'mapstore2-user',
            'mapstore2-token', 
            'mapstore2-refresh-token',
            'keycloak_access_token',
            'keycloak_refresh_token',
            'keycloak_user'
        ];
        
        // Batch remove known keys
        keysToRemove.forEach(key => {
            try {
                localStorage.removeItem(key);
            } catch (e) {
                console.warn(`Failed to remove localStorage key: ${key}`);
            }
        });
        
        // Clear keycloak-specific keys
        try {
            Object.keys(localStorage).forEach(key => {
                if (key.includes('keycloak') || key.includes('kc-') || key.includes('oidc')) {
                    localStorage.removeItem(key);
                }
            });
        } catch (e) {
            console.warn('Failed to clear Keycloak localStorage keys');
        }
        
        // Clear session storage
        try {
            sessionStorage.clear();
        } catch (e) {
            console.warn('Failed to clear sessionStorage');
        }
        
        // Clear our cache
        this.cache.clear();
    }
    
    /**
     * Enhanced token refresh with backend synchronization
     */
    static async refreshTokenWithSync() {
        try {
            // Use existing Keycloak security utils for token refresh
            const tokenData = await KeycloakSecurityUtils.refreshToken();
            
            // Sync with backend after token refresh
            if (tokenData.access_token) {
                try {
                    await this.syncUserPermissions(tokenData.access_token);
                } catch (error) {
                    console.warn('Failed to sync permissions after token refresh:', error);
                    // Don't fail the entire refresh for permission sync failures
                }
            }
            
            return tokenData;
            
        } catch (error) {
            console.error('Token refresh with sync failed:', error);
            throw error;
        }
    }
    
    /**
     * Validate token with backend verification
     */
    static async validateTokenWithBackend(token) {
        try {
            const cacheKey = `token_valid_${token.substring(0, 20)}`;
            
            // Check cache first
            const cached = this.getCached(cacheKey);
            if (cached !== null) {
                return cached;
            }
            
            // Check with Keycloak first (faster)
            const isExpired = KeycloakSessionManager.isTokenExpired(token);
            if (isExpired) {
                this.setCached(cacheKey, false, 60000); // Cache negative result for 1 minute
                return false;
            }
            
            // Verify with backend
            try {
                await this.syncUserPermissions(token);
                this.setCached(cacheKey, true, 60000); // Cache positive result for 1 minute
                return true;
            } catch (error) {
                if (error.response?.status === 401 || error.response?.status === 403) {
                    this.setCached(cacheKey, false, 60000);
                    return false;
                }
                // For other errors, don't cache and return true (assume token is valid)
                return true;
            }
            
        } catch (error) {
            console.error('Token validation failed:', error);
            return false;
        }
    }
    
    /**
     * Get user info with enhanced caching
     */
    static async getUserInfoWithCaching(token) {
        const cacheKey = `user_info_${token.substring(0, 20)}`;
        
        // Check cache first
        const cached = this.getCached(cacheKey);
        if (cached) {
            return cached;
        }
        
        try {
            // Get from Keycloak
            const keycloakUser = await KeycloakSessionManager.refreshUserInfoFromKeycloak(token);
            
            // Get backend permissions
            let backendPermissions = {};
            try {
                backendPermissions = await this.syncUserPermissions(token);
            } catch (error) {
                console.warn('Failed to get backend permissions:', error);
            }
            
            // Merge user info
            const mergedUser = {
                ...keycloakUser,
                backendPermissions,
                lastUpdated: new Date().toISOString()
            };
            
            // Cache for 5 minutes
            this.setCached(cacheKey, mergedUser, 300000);
            return mergedUser;
            
        } catch (error) {
            console.error('Failed to get user info:', error);
            throw error;
        }
    }
    
    /**
     * Simple cache implementation with TTL
     */
    static getCached(key) {
        const cached = this.cache.get(key);
        if (cached && cached.expires > Date.now()) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }
    
    static setCached(key, data, ttl = null) {
        const expires = Date.now() + (ttl || this.cacheTimeout);
        this.cache.set(key, { data, expires });
        
        // Simple cache cleanup (remove 10% of expired entries when cache gets large)
        if (this.cache.size > 1000) {
            let deleted = 0;
            const target = this.cache.size * 0.1;
            
            for (const [k, v] of this.cache.entries()) {
                if (v.expires <= Date.now()) {
                    this.cache.delete(k);
                    deleted++;
                    if (deleted >= target) break;
                }
            }
        }
    }
    
    /**
     * Health check for Keycloak and backend connectivity
     */
    static async performHealthCheck() {
        const health = {
            keycloak: false,
            backend: false,
            timestamp: new Date().toISOString(),
            errors: []
        };
        
        // Check Keycloak
        try {
            const response = await axios.get(
                'https://gisidgw.geosystems-me.com:5443/realms/GISID/.well-known/openid_configuration',
                { timeout: 5000 }
            );
            health.keycloak = response.status === 200;
        } catch (error) {
            health.errors.push(`Keycloak: ${error.message}`);
        }
        
        // Check Backend (if we have a token)
        try {
            const token = KeycloakSecurityUtils.getToken();
            if (token) {
                const backendUrl = getConfigProp('geoStoreUrl');
                const response = await axios.get(`${backendUrl}misc/version`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                    timeout: 5000
                });
                health.backend = response.status === 200;
            } else {
                health.backend = 'no_token';
            }
        } catch (error) {
            health.errors.push(`Backend: ${error.message}`);
        }
        
        return health;
    }
}

export default OptimizedKeycloakUtils; 