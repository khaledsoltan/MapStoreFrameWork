/**
 * Copyright 2024, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import axios from 'axios';

const KEYCLOAK_CONFIG = {
    authServerUrl: 'https://gisidgw.geosystems-me.com:5443/',
    realm: 'GISID',
    clientId: 'mapstore-client',
    clientSecret: 'hy7rf5rEiDRHreQAlt6zMsizLnvK65Ih'
};

/**
 * Keycloak Session Management Utilities
 */
export class KeycloakSessionManager {
    
    static getAccessToken() {
        return localStorage.getItem('keycloak_access_token');
    }
    
    static getRefreshToken() {
        return localStorage.getItem('keycloak_refresh_token');
    }
    
    static getUser() {
        const userStr = localStorage.getItem('keycloak_user');
        return userStr ? JSON.parse(userStr) : null;
    }
    
    static getUserInfo() {
        const userInfoStr = localStorage.getItem('keycloak_userinfo');
        return userInfoStr ? JSON.parse(userInfoStr) : null;
    }
    
    static saveSession(tokens, user, userInfo = null) {
        if (tokens.access_token) {
            localStorage.setItem('keycloak_access_token', tokens.access_token);
        }
        if (tokens.refresh_token) {
            localStorage.setItem('keycloak_refresh_token', tokens.refresh_token);
        }
        if (user) {
            localStorage.setItem('keycloak_user', JSON.stringify(user));
        }
        if (userInfo) {
            localStorage.setItem('keycloak_userinfo', JSON.stringify(userInfo));
        }
        
        console.log('Keycloak session saved:', { user, userInfo, hasTokens: !!tokens.access_token });
    }
    
    static isLoggedIn() {
        return !!this.getAccessToken();
    }
    
    static clearSession() {
        console.log('🧹 KeycloakSessionManager: Clearing all session data...');
        
        // Clear primary Keycloak session data
        localStorage.removeItem('keycloak_access_token');
        localStorage.removeItem('keycloak_refresh_token');
        localStorage.removeItem('keycloak_user');
        localStorage.removeItem('keycloak_userinfo');
        
        // Clear additional Keycloak session data that might exist
        const keycloakKeys = [
            'keycloak_session_state',
            'keycloak_session',
            'keycloak_auth_state',
            'keycloak_code_verifier',
            'keycloak_state',
            'keycloak_nonce',
            'keycloak_id_token',
            'keycloak_token_parsed',
            'keycloak_refresh_token_parsed',
            'keycloak_id_token_parsed',
            'keycloak_timeSkew',
            'keycloak_authenticated',
            'keycloak_login_hint',
            'keycloak_kc_action',
            'keycloak_prompt',
            'keycloak_locale',
            'keycloak_callback_storage',
            'keycloak_error',
            'keycloak_error_description',
            'keycloak_error_uri'
        ];
        
        // Remove all Keycloak-related keys from localStorage
        keycloakKeys.forEach(key => {
            try {
                localStorage.removeItem(key);
                sessionStorage.removeItem(key);
            } catch (e) {
                console.warn(`Failed to remove key: ${key}`);
            }
        });
        
        // Clear any keys that start with 'kc-' or 'kc_' (Keycloak prefixes)
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('kc-') || key.startsWith('kc_') || key.includes('keycloak')) {
                try {
                    localStorage.removeItem(key);
                } catch (e) {
                    console.warn(`Failed to remove localStorage key: ${key}`);
                }
            }
        });
        
        Object.keys(sessionStorage).forEach(key => {
            if (key.startsWith('kc-') || key.startsWith('kc_') || key.includes('keycloak')) {
                try {
                    sessionStorage.removeItem(key);
                } catch (e) {
                    console.warn(`Failed to remove sessionStorage key: ${key}`);
                }
            }
        });
        
        console.log('✅ KeycloakSessionManager: All session data cleared');
    }
    
    static async refreshAccessToken() {
        const refreshToken = this.getRefreshToken();
        if (!refreshToken) {
            throw new Error('No refresh token available');
        }
        
        try {
            const tokenUrl = `${KEYCLOAK_CONFIG.authServerUrl}realms/${KEYCLOAK_CONFIG.realm}/protocol/openid-connect/token`;
            
            const params = new URLSearchParams();
            params.append('grant_type', 'refresh_token');
            params.append('client_id', KEYCLOAK_CONFIG.clientId);
            params.append('refresh_token', refreshToken);
            
            // Add client secret if available (for confidential clients)
            if (KEYCLOAK_CONFIG.clientSecret) {
                params.append('client_secret', KEYCLOAK_CONFIG.clientSecret);
            }
            
            const response = await axios.post(tokenUrl, params, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
            
            if (response.data.access_token) {
                // Save new tokens
                localStorage.setItem('keycloak_access_token', response.data.access_token);
                if (response.data.refresh_token) {
                    localStorage.setItem('keycloak_refresh_token', response.data.refresh_token);
                }
                
                // Refresh user info with new token
                await this.refreshUserInfoFromKeycloak(response.data.access_token);
                
                return response.data.access_token;
            }
        } catch (error) {
            console.error('Failed to refresh token:', error);
            this.clearSession();
            throw error;
        }
    }
    
    /**
     * Refresh user information from Keycloak userinfo endpoint
     */
    static async refreshUserInfoFromKeycloak(accessToken = null) {
        const token = accessToken || this.getAccessToken();
        if (!token) {
            return null;
        }
        
        try {
            const userInfoUrl = `${KEYCLOAK_CONFIG.authServerUrl}realms/${KEYCLOAK_CONFIG.realm}/protocol/openid-connect/userinfo`;
            
            const response = await axios.get(userInfoUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const userInfo = response.data;
            const tokenClaims = this.getTokenClaims(token);
            
            // Create comprehensive user object
            const updatedUser = this.createMapStoreUser(userInfo, { access_token: token }, tokenClaims);
            
            // Save updated user info
            this.saveSession({ access_token: token }, updatedUser, userInfo);
            
            console.log('User info refreshed from Keycloak:', updatedUser);
            return updatedUser;
            
        } catch (error) {
            console.error('Failed to refresh user info from Keycloak:', error);
            // Fallback to token-only refresh
            return this.refreshUserInfo();
        }
    }
    
    /**
     * Create comprehensive MapStore user object from Keycloak data
     */
    static createMapStoreUser(userInfo, tokenData, tokenClaims) {
        const groups = this.extractGroupsFromToken(tokenClaims);
        const role = this.extractRoleFromToken(tokenClaims);
        const privileges = this.extractPrivileges(tokenClaims, groups, role);
        
        return {
            // Basic user info
            name: userInfo.preferred_username || userInfo.name || userInfo.sub,
            enabled: true,
            
            // Keycloak specific info
            id: userInfo.sub || userInfo.preferred_username,
            email: userInfo.email || `${userInfo.preferred_username}@keycloak.local`,
            firstName: userInfo.given_name || userInfo.preferred_username,
            lastName: userInfo.family_name || 'User',
            
            // Groups and roles
            groups: groups,
            role: role,
            
            // Application privileges
            privileges: privileges,
            
            // Additional attributes for Account Info display
            attributes: {
                keycloak_id: userInfo.sub,
                client_id: KEYCLOAK_CONFIG.clientId,
                scope: tokenData.scope,
                authenticated_via: 'password',
                realm: KEYCLOAK_CONFIG.realm,
                session_state: userInfo.session_state,
                token_updated: new Date().toISOString(),
                // Include all Keycloak user attributes
                ...userInfo,
                // Include token claims for debugging
                token_claims: tokenClaims
            }
        };
    }
    
    /**
     * Extract application privileges based on roles and groups
     */
    static extractPrivileges(tokenClaims, groups, role) {
        const privileges = {
            // MapStore privileges
            canCreateMaps: false,
            canEditMaps: false,
            canDeleteMaps: false,
            canShareMaps: false,
            canAccessDashboard: false,
            canAccessContext: false,
            canManageUsers: false,
            canManageGroups: false,
            canAccessRulesManager: false,
            canAccessImporter: false,
            
            // Custom application privileges
            canViewProtectedLayers: false,
            canExportData: false,
            canUploadData: false,
            canAccessAnalytics: false
        };
        
        // Admin privileges
        if (role === 'ADMIN') {
            Object.keys(privileges).forEach(key => {
                privileges[key] = true;
            });
            return privileges;
        }
        
        // Basic user privileges
        privileges.canCreateMaps = true;
        privileges.canEditMaps = true;
        privileges.canShareMaps = true;
        privileges.canAccessDashboard = true;
        privileges.canAccessContext = true;
        
        // Role-based privileges from token claims
        const realmRoles = tokenClaims.realm_access?.roles || [];
        const clientRoles = tokenClaims.resource_access?.[KEYCLOAK_CONFIG.clientId]?.roles || [];
        const allRoles = [...realmRoles, ...clientRoles];
        
        console.log('Extracting privileges from roles:', { realmRoles, clientRoles, allRoles });
        
        // Check specific roles for privileges
        if (allRoles.some(r => r.toLowerCase().includes('manager') || r.toLowerCase().includes('editor'))) {
            privileges.canDeleteMaps = true;
            privileges.canManageUsers = true;
            privileges.canManageGroups = true;
            privileges.canAccessRulesManager = true;
            privileges.canViewProtectedLayers = true;
            privileges.canExportData = true;
            privileges.canUploadData = true;
        }
        
        if (allRoles.some(r => r.toLowerCase().includes('analyst') || r.toLowerCase().includes('advanced'))) {
            privileges.canAccessAnalytics = true;
            privileges.canExportData = true;
            privileges.canViewProtectedLayers = true;
        }
        
        if (allRoles.some(r => r.toLowerCase().includes('importer'))) {
            privileges.canAccessImporter = true;
            privileges.canUploadData = true;
        }
        
        return privileges;
    }
    
    static async logout() {
        const refreshToken = this.getRefreshToken();
        const accessToken = this.getAccessToken();
        
        // Direct Keycloak logout using proper endpoint to terminate sessions
        if (refreshToken && accessToken) {
            try {
                console.log('🔐 Performing direct Keycloak logout to terminate sessions...');
                
                // Use the correct Keycloak logout endpoint format
                const logoutUrl = `${KEYCLOAK_CONFIG.authServerUrl}realms/${KEYCLOAK_CONFIG.realm}/protocol/openid-connect/logout`;
                
                // Prepare form data with client_id and refresh_token
                const params = new URLSearchParams();
                params.append('client_id', KEYCLOAK_CONFIG.clientId);
                params.append('refresh_token', refreshToken);
                
                // Add client secret if available (for confidential clients)
                if (KEYCLOAK_CONFIG.clientSecret) {
                    params.append('client_secret', KEYCLOAK_CONFIG.clientSecret);
                }
                
                console.log('🔄 Sending logout request to:', logoutUrl);
                console.log('🔄 With client_id:', KEYCLOAK_CONFIG.clientId);
                
                // Direct POST request to logout endpoint with Bearer token
                const response = await axios.post(logoutUrl, params, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    timeout: 15000
                });
                
                console.log('✅ Direct Keycloak logout successful - sessions terminated:', response.status);
                
            } catch (error) {
                console.warn('⚠️ Direct Keycloak logout failed:', error.message);
                
                // Fallback: try alternative logout method
                try {
                    console.log('🔄 Trying alternative logout method...');
                    const alternativeUrl = `${KEYCLOAK_CONFIG.authServerUrl}realms/${KEYCLOAK_CONFIG.realm}/protocol/openid-connect/logout`;
                    
                    const altParams = new URLSearchParams();
                    altParams.append('client_id', KEYCLOAK_CONFIG.clientId);
                    altParams.append('id_token_hint', accessToken);
                    
                    await axios.post(alternativeUrl, altParams, {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/x-www-form-urlencoded'
                        },
                        timeout: 10000
                    });
                    
                    console.log('✅ Alternative Keycloak logout successful');
                } catch (altError) {
                    console.warn('⚠️ Alternative Keycloak logout also failed:', altError.message);
                }
            }
        } else {
            console.warn('⚠️ Missing tokens for Keycloak logout - performing local cleanup only');
        }
        
        // Always clear local session regardless of Keycloak logout result
        this.clearSession();
        console.log('✅ Keycloak session cleared locally');
    }
    
    static setupAxiosInterceptor() {
        // Request interceptor to add Authorization header
        axios.interceptors.request.use(
            (config) => {
                const token = this.getAccessToken();
                if (token && !config.headers.Authorization) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );
        
        // Response interceptor to handle token expiration
        axios.interceptors.response.use(
            (response) => response,
            async (error) => {
                if (error.response?.status === 401 && this.isLoggedIn()) {
                    try {
                        await this.refreshAccessToken();
                        // Retry the original request
                        return axios.request(error.config);
                    } catch (refreshError) {
                        this.clearSession();
                        window.location.reload();
                    }
                }
                return Promise.reject(error);
            }
        );
    }
    
    static isTokenExpired(token) {
        if (!token) return true;
        
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const now = Date.now() / 1000;
            return payload.exp < now;
        } catch (error) {
            return true;
        }
    }
    
    static isTokenNearExpiry(token, bufferSeconds = 300) {
        if (!token) return true;
        
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const now = Date.now() / 1000;
            return payload.exp < (now + bufferSeconds);
        } catch (error) {
            return true;
        }
    }
    
    static getTokenClaims(token) {
        if (!token) return null;
        
        try {
            return JSON.parse(atob(token.split('.')[1]));
        } catch (error) {
            return null;
        }
    }
    
    static refreshUserInfo() {
        const accessToken = this.getAccessToken();
        const user = this.getUser();
        
        if (!accessToken || !user) {
            return null;
        }
        
        // Parse current token to get updated claims
        const tokenClaims = this.getTokenClaims(accessToken);
        if (tokenClaims) {
            // Update user with fresh token information
            const updatedUser = {
                ...user,
                // Update groups from token
                groups: this.extractGroupsFromToken(tokenClaims),
                role: this.extractRoleFromToken(tokenClaims),
                attributes: {
                    ...user.attributes,
                    token_updated: new Date().toISOString(),
                    ...tokenClaims
                }
            };
            
            // Save updated user
            localStorage.setItem('keycloak_user', JSON.stringify(updatedUser));
            console.log('User info refreshed from token:', updatedUser);
            return updatedUser;
        }
        
        return user;
    }
    
    static extractGroupsFromToken(tokenClaims) {
        const groups = [];
        
        if (tokenClaims.groups && Array.isArray(tokenClaims.groups)) {
            groups.push(...tokenClaims.groups);
        }
        if (tokenClaims.realm_access?.roles) {
            groups.push(...tokenClaims.realm_access.roles.map(role => `realm:${role}`));
        }
        if (tokenClaims.resource_access) {
            Object.keys(tokenClaims.resource_access).forEach(client => {
                const clientRoles = tokenClaims.resource_access[client].roles || [];
                groups.push(...clientRoles.map(role => `${client}:${role}`));
            });
        }
        
        return groups.length > 0 ? [...new Set(groups)] : ['users'];
    }
    
    static extractRoleFromToken(tokenClaims) {
        const roles = [];
        
        if (tokenClaims.realm_access?.roles) {
            roles.push(...tokenClaims.realm_access.roles);
        }
        if (tokenClaims.resource_access?.['mapstore-client']?.roles) {
            roles.push(...tokenClaims.resource_access['mapstore-client'].roles);
        }
        
        // Map Keycloak roles to MapStore roles
        const roleMapping = {
            'admin': 'ADMIN',
            'administrator': 'ADMIN',
            'mapstore-admin': 'ADMIN',
            'realm-admin': 'ADMIN',
            'user': 'USER',
            'mapstore-user': 'USER'
        };
        
        // Find the highest privilege role
        for (const role of roles) {
            const mappedRole = roleMapping[role.toLowerCase()];
            if (mappedRole === 'ADMIN') {
                return 'ADMIN';
            }
        }
        
        // Check if any role contains 'admin'
        for (const role of roles) {
            if (role.toLowerCase().includes('admin')) {
                return 'ADMIN';
            }
        }
        
        return 'USER';
    }
}

// Setup interceptors when module loads
KeycloakSessionManager.setupAxiosInterceptor();

export default KeycloakSessionManager; 