/**
 * Copyright 2024, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import Rx from 'rxjs';
import { 
    refreshAccessToken, 
    sessionValid,
    loginSuccess,
    logout,
    REFRESH_ACCESS_TOKEN,
    LOGIN_SUCCESS
} from '../actions/security';
import { KeycloakSecurityUtils } from '../utils/KeycloakSecurityUtils';
import { KeycloakSessionManager } from '../utils/KeycloakSessionUtils';
import { KeycloakErrorUtils } from '../utils/KeycloakErrorUtils';
import { LOCATION_CHANGE } from 'connected-react-router';
import { get } from 'lodash';
import ConfigUtils from '../utils/ConfigUtils';

/**
 * Custom refresh token epic for Keycloak users
 * This overrides the default MapStore refresh behavior when using Keycloak
 */
export const keycloakRefreshTokenEpic = (action$, store) =>
    action$.ofType(REFRESH_ACCESS_TOKEN)
        .filter(() => KeycloakSecurityUtils.isKeycloakUser())
        .switchMap(() => {
            console.log('Keycloak refresh token requested');
            return Rx.Observable.fromPromise(KeycloakSecurityUtils.refreshToken())
                .switchMap((tokenData) => {
                    console.log('Keycloak token refreshed successfully');
                    return Rx.Observable.fromPromise(KeycloakSecurityUtils.getUserDetails(tokenData))
                        .map((userDetails) => {
                            console.log('User details refreshed:', userDetails);
                            return loginSuccess(userDetails);
                        });
                })
                .catch((error) => {
                    KeycloakErrorUtils.logError(error, 'Keycloak Token Refresh');
                    
                    // Use smart error classification
                    if (KeycloakErrorUtils.shouldLogout(error)) {
                        console.warn('Keycloak session truly expired, logging out');
                        return Rx.Observable.of(logout(KeycloakErrorUtils.getUserFriendlyMessage(error)));
                    } else {
                        console.warn('Keycloak token refresh failed but session may still be valid');
                        return Rx.Observable.empty();
                    }
                });
        });

/**
 * Custom session verification epic for Keycloak users
 * This provides automatic session validation and token refresh
 */
export const keycloakSessionVerificationEpic = (action$, store) =>
    action$.ofType(LOCATION_CHANGE)
        .take(1)
        .filter(() => {
            const user = get(store.getState(), "security.user");
            return user && KeycloakSecurityUtils.isKeycloakUser();
        })
        .switchMap(() => {
            console.log('Verifying Keycloak session...');
            return Rx.Observable.fromPromise(KeycloakSecurityUtils.verifySession())
                .map((response) => {
                    console.log('Keycloak session verified:', response);
                    return sessionValid(response, 'keycloak');
                })
                .catch((error) => {
                    KeycloakErrorUtils.logError(error, 'Keycloak Session Verification');
                    
                    // Use smart error classification
                    if (KeycloakErrorUtils.shouldLogout(error)) {
                        console.warn('Keycloak session verification failed - session expired');
                        return Rx.Observable.of(logout(KeycloakErrorUtils.getUserFriendlyMessage(error)));
                    } else {
                        console.warn('Keycloak session verification failed but may be temporary');
                        return Rx.Observable.empty();
                    }
                });
        });

/**
 * Periodic token refresh for Keycloak users
 * This epic runs a periodic check to refresh tokens before they expire
 */
export const keycloakPeriodicRefreshEpic = (action$, store) =>
    action$.ofType(LOGIN_SUCCESS)
        .filter((action) => {
            return action.authProvider === 'keycloak' || 
                   (action.user && action.user.attributes && action.user.attributes.realm);
        })
        .switchMap(() => {
            const refreshInterval = ConfigUtils.getConfigProp("tokenRefreshInterval") ?? 300000; // 5 minutes default
            console.log(`Starting Keycloak periodic refresh every ${refreshInterval}ms`);
            
            return Rx.Observable.interval(refreshInterval)
                .filter(() => {
                    const user = get(store.getState(), "security.user");
                    return user && KeycloakSecurityUtils.isKeycloakUser();
                })
                .switchMap(() => {
                    const token = KeycloakSecurityUtils.getToken();
                    if (!token) {
                        console.log('No Keycloak token found, skipping refresh');
                        return Rx.Observable.empty();
                    }
                    
                    // Check if token is close to expiration (refresh 2 minutes before expiry)
                    const isNearExpiry = KeycloakSessionManager.isTokenNearExpiry(token, 120); // 2 minutes
                    
                    if (isNearExpiry) {
                        console.log('Keycloak token is near expiry, refreshing...');
                        return Rx.Observable.of(refreshAccessToken());
                    }
                    
                    return Rx.Observable.empty();
                })
                .takeUntil(action$.ofType('LOGOUT'));
        });

/**
 * Handle automatic logout when Keycloak session expires
 */
export const keycloakSessionExpirationEpic = (action$, store) =>
    action$.ofType(LOGIN_SUCCESS)
        .filter((action) => {
            return action.authProvider === 'keycloak' || 
                   (action.user && action.user.attributes && action.user.attributes.realm);
        })
        .switchMap(() => {
            return Rx.Observable.interval(60000) // Check every minute
                .filter(() => {
                    const user = get(store.getState(), "security.user");
                    return user && KeycloakSecurityUtils.isKeycloakUser();
                })
                .switchMap(() => {
                    const token = KeycloakSecurityUtils.getToken();
                    const refreshToken = KeycloakSecurityUtils.getRefreshToken();
                    
                    // If no tokens, logout
                    if (!token || !refreshToken) {
                        console.log('No Keycloak tokens found, logging out');
                        return Rx.Observable.of(logout('Session expired'));
                    }
                    
                    // If access token is expired and refresh token is also expired, logout
                    if (KeycloakSessionManager.isTokenExpired(token) && 
                        KeycloakSessionManager.isTokenExpired(refreshToken)) {
                        console.log('Both Keycloak tokens expired, logging out');
                        return Rx.Observable.of(logout('Session expired'));
                    }
                    
                    return Rx.Observable.empty();
                })
                .takeUntil(action$.ofType('LOGOUT'));
        });

/**
 * Enhanced session refresh that updates user info from Keycloak
 */
export const keycloakUserInfoRefreshEpic = (action$, store) =>
    action$.ofType(LOGIN_SUCCESS)
        .filter((action) => {
            return action.authProvider === 'keycloak' || 
                   (action.user && action.user.attributes && action.user.attributes.realm);
        })
        .switchMap(() => {
            // Refresh user info every 10 minutes to get updated roles/groups
            return Rx.Observable.interval(600000) // 10 minutes
                .filter(() => {
                    const user = get(store.getState(), "security.user");
                    return user && KeycloakSecurityUtils.isKeycloakUser();
                })
                .switchMap(() => {
                    const token = KeycloakSecurityUtils.getToken();
                    if (!token || KeycloakSessionManager.isTokenExpired(token)) {
                        return Rx.Observable.empty();
                    }
                    
                    console.log('Refreshing Keycloak user info...');
                    return Rx.Observable.fromPromise(KeycloakSessionManager.refreshUserInfoFromKeycloak(token))
                        .map((updatedUser) => {
                            console.log('User info refreshed from Keycloak:', updatedUser);
                            return loginSuccess({
                                User: updatedUser,
                                access_token: token,
                                refresh_token: KeycloakSecurityUtils.getRefreshToken(),
                                authProvider: 'keycloak'
                            });
                        })
                        .catch((error) => {
                            console.error('Failed to refresh user info from Keycloak:', error);
                            return Rx.Observable.empty();
                        });
                })
                .takeUntil(action$.ofType('LOGOUT'));
        });

export default {
    keycloakRefreshTokenEpic,
    keycloakSessionVerificationEpic,
    keycloakPeriodicRefreshEpic,
    keycloakSessionExpirationEpic,
    keycloakUserInfoRefreshEpic
}; 