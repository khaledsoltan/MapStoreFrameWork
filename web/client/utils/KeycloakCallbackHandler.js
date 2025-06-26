/**
 * Copyright 2024, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import axios from 'axios';
import { KeycloakSessionManager } from './KeycloakSessionUtils';

const KEYCLOAK_CONFIG = {
    authServerUrl: 'https://gisidgw.geosystems-me.com:5443/',
    realm: 'GISID',
    clientId: 'mapstore-client',
    clientSecret: 'hy7rf5rEiDRHreQAlt6zMsizLnvK65Ih'
};

/**
 * Handles Keycloak authorization code callback
 */
export class KeycloakCallbackHandler {
    
    static async handleCallback() {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const sessionState = urlParams.get('session_state');
        
        if (code) {
            console.log('Processing Keycloak authorization code...');
            
            try {
                // Exchange authorization code for tokens
                const tokens = await this.exchangeCodeForTokens(code);
                
                // Get user information
                const userInfo = await this.getUserInfo(tokens.access_token);
                console.log('Keycloak UserInfo from callback:', userInfo);
                
                // Parse token claims for additional info
                const tokenClaims = this.parseJWTToken(tokens.access_token);
                console.log('Token claims from callback:', tokenClaims);
                
                // Create comprehensive user object for MapStore using session manager
                const user = KeycloakSessionManager.createMapStoreUser(userInfo, tokens, tokenClaims);
                console.log('MapStore user object from callback:', user);
                
                // Store session data using session manager
                KeycloakSessionManager.saveSession(tokens, user, userInfo);
                localStorage.setItem('keycloak_session_state', sessionState);
                
                // Clean URL (remove Keycloak parameters)
                this.cleanUrl();
                
                // Trigger MapStore login success
                this.triggerMapStoreLogin(user, userInfo);
                
                console.log('Keycloak login successful:', user);
                return { success: true, user: user, tokens, userInfo };
                
            } catch (error) {
                console.error('Failed to process Keycloak callback:', error);
                this.cleanUrl();
                return { success: false, error };
            }
        }
        
        return { success: false, error: 'No authorization code found' };
    }
    
    static async exchangeCodeForTokens(code) {
        const tokenUrl = `${KEYCLOAK_CONFIG.authServerUrl}realms/${KEYCLOAK_CONFIG.realm}/protocol/openid-connect/token`;
        const redirectUri = window.location.origin + '/mapstore/';
        
                    const params = new URLSearchParams();
            params.append('grant_type', 'authorization_code');
            params.append('client_id', KEYCLOAK_CONFIG.clientId);
            params.append('code', code);
            params.append('redirect_uri', redirectUri);
            
            // Add client secret if available (for confidential clients)
            if (KEYCLOAK_CONFIG.clientSecret) {
                params.append('client_secret', KEYCLOAK_CONFIG.clientSecret);
            }
        
        const response = await axios.post(tokenUrl, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        
        return response.data;
    }
    
    static async getUserInfo(accessToken) {
        const userInfoUrl = `${KEYCLOAK_CONFIG.authServerUrl}realms/${KEYCLOAK_CONFIG.realm}/protocol/openid-connect/userinfo`;
        
        const response = await axios.get(userInfoUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        return response.data;
    }
    
    static cleanUrl() {
        // Remove Keycloak parameters from URL
        const url = new URL(window.location);
        url.searchParams.delete('code');
        url.searchParams.delete('state');
        url.searchParams.delete('session_state');
        url.searchParams.delete('iss');
        
        // Update URL without page reload
        window.history.replaceState({}, document.title, url.toString());
    }
    
    /**
     * Parse JWT token to extract claims
     */
    static parseJWTToken(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                atob(base64)
                    .split('')
                    .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
            );
            return JSON.parse(jsonPayload);
        } catch (error) {
            console.error('Error parsing JWT token:', error);
            return {};
        }
    }

    /**
     * Extract groups from user info and token
     */
    static extractGroups(userInfo, tokenData, tokenClaims) {
        const groups = [];
        
        // From userInfo
        if (userInfo.groups && Array.isArray(userInfo.groups)) {
            groups.push(...userInfo.groups);
        }
        
        // From token claims
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
        
        // Default groups if none found
        if (groups.length === 0) {
            groups.push('users'); // Default group
        }
        
        // Remove duplicates
        return [...new Set(groups)];
    }

    /**
     * Extract role from user info and token
     * Maps Keycloak roles to MapStore roles (ADMIN, USER)
     */
    static extractRole(userInfo, tokenData, tokenClaims) {
        let roles = [];
        
        // From userInfo
        if (userInfo.roles && Array.isArray(userInfo.roles)) {
            roles.push(...userInfo.roles);
        }
        
        // From token claims
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
        
        // Default to USER
        return 'USER';
    }



    static triggerMapStoreLogin(user, userInfo) {
        // Trigger MapStore login event
        const loginEvent = new CustomEvent('keycloak-login-success', {
            detail: {
                user: user,
                userInfo: userInfo,
                provider: 'keycloak'
            }
        });
        
        window.dispatchEvent(loginEvent);
    }
    
    static shouldHandleCallback() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.has('code') && urlParams.has('session_state');
    }
}

export default KeycloakCallbackHandler; 