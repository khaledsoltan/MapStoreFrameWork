/**
 * Copyright 2024, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import Rx from 'rxjs';
import { LOCATION_CHANGE } from 'connected-react-router';
import { loginSuccess, refreshSuccess } from '../actions/security';
import KeycloakCallbackHandler from '../utils/KeycloakCallbackHandler';
import { KeycloakSessionManager } from '../utils/KeycloakSessionUtils';
import PrivilegeManager from '../utils/PrivilegeManager';

// Action to trigger Keycloak initialization
export const KEYCLOAK_INIT = 'KEYCLOAK_INIT';

export const keycloakInit = () => ({
    type: KEYCLOAK_INIT
});

/**
 * Epic to handle Keycloak initialization on app start
 */
export const keycloakInitEpic = (action$) =>
    action$.ofType(KEYCLOAK_INIT)
        .switchMap(() => {
            // Check if this is a Keycloak callback
            if (KeycloakCallbackHandler.shouldHandleCallback()) {
                console.log('Detected Keycloak callback, processing...');
                
                return Rx.Observable.fromPromise(KeycloakCallbackHandler.handleCallback())
                    .switchMap(result => {
                        if (result.success) {
                            console.log('Keycloak callback processed successfully');
                            
                            // Create MapStore user details format
                            const userDetails = {
                                User: result.user,
                                access_token: result.tokens?.access_token,
                                refresh_token: result.tokens?.refresh_token,
                                expires: result.tokens?.expires_in,
                                authProvider: 'keycloak'
                            };
                            
                            return Rx.Observable.of(loginSuccess(userDetails, result.user.name, '', 'keycloak'));
                        } else {
                            console.error('Failed to process Keycloak callback:', result.error);
                            return Rx.Observable.empty();
                        }
                    })
                    .catch(error => {
                        console.error('Error processing Keycloak callback:', error);
                        return Rx.Observable.empty();
                    });
            } else {
                // Check for existing Keycloak session
                const existingUser = localStorage.getItem('keycloak_user');
                const accessToken = localStorage.getItem('keycloak_access_token');
                
                if (existingUser && accessToken) {
                    try {
                        // Refresh user info from current token to get latest groups/roles
                        const user = KeycloakSessionManager.refreshUserInfo();
                        
                        if (user) {
                            console.log('Restoring Keycloak session for user:', user.name);
                            console.log('User groups:', user.groups);
                            console.log('User role:', user.role);
                            
                            // Create MapStore user details format
                            const userDetails = {
                                User: user,
                                access_token: accessToken,
                                refresh_token: localStorage.getItem('keycloak_refresh_token'),
                                authProvider: 'keycloak'
                            };
                            
                            return Rx.Observable.of(loginSuccess(userDetails, user.name, '', 'keycloak'));
                        }
                    } catch (error) {
                        console.error('Failed to restore Keycloak session:', error);
                        // Clear invalid session data
                        localStorage.removeItem('keycloak_user');
                        localStorage.removeItem('keycloak_access_token');
                        localStorage.removeItem('keycloak_refresh_token');
                        return Rx.Observable.empty();
                    }
                }
                
                return Rx.Observable.empty();
            }
        });

/**
 * Epic to handle custom Keycloak login events
 */
export const keycloakLoginEventEpic = () =>
    Rx.Observable.fromEvent(window, 'keycloak-login-success')
        .map(event => {
            console.log('Keycloak login event received:', event.detail);
            const { user, userInfo, provider } = event.detail;
            
            // Create MapStore user details format
            const userDetails = {
                User: user,
                access_token: localStorage.getItem('keycloak_access_token'),
                refresh_token: localStorage.getItem('keycloak_refresh_token'),
                authProvider: provider || 'keycloak'
            };
            
            return loginSuccess(userDetails, user.name, '', provider || 'keycloak');
        });

/**
 * Epic to handle MapStore Keycloak login events from our custom components
 */
export const mapstoreKeycloakLoginEpic = () =>
    Rx.Observable.fromEvent(window, 'mapstore-keycloak-login')
        .map(event => {
            console.log('MapStore Keycloak login event received:', event.detail);
            const { userDetails, username, provider } = event.detail;
            
            return loginSuccess(userDetails, username, '', provider);
        });

/**
 * Epic to initialize Keycloak when the app starts
 */
export const keycloakAppStartEpic = (action$) =>
    action$.ofType('LOAD_VERSION')
        .take(1)
        .delay(100) // Small delay to ensure app is initialized
        .mapTo(keycloakInit());

/**
 * Epic to periodically refresh Keycloak session and user privileges
 */
export const keycloakSessionRefreshEpic = (action$) =>
    action$.ofType('LOGIN_SUCCESS')
        .filter(action => action.authProvider === 'keycloak' || action.authProvider === 'keycloak-password')
        .switchMap(() => {
            // Start periodic session refresh every 5 minutes
            return Rx.Observable.interval(5 * 60 * 1000) // 5 minutes
                .startWith(0)
                .switchMap(() => {
                    return Rx.Observable.fromPromise(PrivilegeManager.validateSession())
                        .switchMap(isValid => {
                            if (isValid) {
                                // Session is valid, refresh user info if needed
                                const accessToken = KeycloakSessionManager.getAccessToken();
                                if (accessToken && !KeycloakSessionManager.isTokenExpired(accessToken)) {
                                    // Refresh user privileges from token
                                    const updatedUser = KeycloakSessionManager.refreshUserInfo();
                                    if (updatedUser) {
                                        const userDetails = {
                                            User: updatedUser,
                                            access_token: accessToken,
                                            refresh_token: KeycloakSessionManager.getRefreshToken(),
                                            authProvider: 'keycloak'
                                        };
                                        return Rx.Observable.of(refreshSuccess(userDetails, 'keycloak'));
                                    }
                                }
                                return Rx.Observable.empty();
                            } else {
                                // Session invalid, logout
                                console.warn('Keycloak session invalid, logging out');
                                KeycloakSessionManager.clearSession();
                                return Rx.Observable.of({ type: 'LOGOUT' });
                            }
                        })
                        .catch(error => {
                            console.error('Session refresh error:', error);
                            return Rx.Observable.empty();
                        });
                })
                .takeUntil(action$.ofType('LOGOUT')); // Stop when user logs out
        });

export default {
    keycloakInitEpic,
    keycloakLoginEventEpic,
    mapstoreKeycloakLoginEpic,
    keycloakAppStartEpic,
    keycloakSessionRefreshEpic
}; 