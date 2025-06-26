/**
 * Copyright 2024, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import KeycloakCallbackHandler from '../utils/KeycloakCallbackHandler';
import { login } from '../actions/security';

/**
 * Initialize Keycloak callback handling on application startup
 */
export const initializeKeycloak = (store) => {
    // Check if this is a Keycloak callback
    if (KeycloakCallbackHandler.shouldHandleCallback()) {
        console.log('Detected Keycloak callback, processing...');
        
        KeycloakCallbackHandler.handleCallback()
            .then(result => {
                if (result.success) {
                    console.log('Keycloak callback processed successfully');
                    
                    // Dispatch login action to MapStore
                    const user = {
                        name: result.user.preferred_username || result.user.name,
                        role: 'USER',
                        enabled: true,
                        groups: result.user.groups || []
                    };
                    
                    store.dispatch(login(user, 'keycloak', null));
                } else {
                    console.error('Failed to process Keycloak callback:', result.error);
                }
            })
            .catch(error => {
                console.error('Error processing Keycloak callback:', error);
            });
    } else {
        // Check for existing Keycloak session
        const existingUser = localStorage.getItem('keycloak_user');
        const accessToken = localStorage.getItem('keycloak_access_token');
        
        if (existingUser && accessToken) {
            try {
                const user = JSON.parse(existingUser);
                console.log('Restoring Keycloak session for user:', user.preferred_username);
                
                const mapStoreUser = {
                    name: user.preferred_username || user.name,
                    role: 'USER',
                    enabled: true,
                    groups: user.groups || []
                };
                
                store.dispatch(login(mapStoreUser, 'keycloak', null));
            } catch (error) {
                console.error('Failed to restore Keycloak session:', error);
                // Clear invalid session data
                localStorage.removeItem('keycloak_user');
                localStorage.removeItem('keycloak_access_token');
                localStorage.removeItem('keycloak_refresh_token');
            }
        }
    }
    
    // Listen for custom Keycloak login events
    window.addEventListener('keycloak-login-success', (event) => {
        console.log('Keycloak login event received:', event.detail);
        
        const { user } = event.detail;
        store.dispatch(login(user, 'keycloak', null));
    });
};

export default initializeKeycloak; 