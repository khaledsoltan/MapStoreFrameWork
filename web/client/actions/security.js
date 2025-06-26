/**
 * Copyright 2015, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Here you can change the API to use for AuthenticationAPI
 */
import AuthenticationAPI from '../api/GeoStoreDAO';

import {setCredentials, getToken, getRefreshToken} from '../utils/SecurityUtils';
import { KeycloakSecurityUtils } from '../utils/KeycloakSecurityUtils';
import {encodeUTF8} from '../utils/EncodeUtils';
import { getConfigProp } from '../utils/ConfigUtils';


export const CHECK_LOGGED_USER = 'CHECK_LOGGED_USER';
export const LOGIN_SUBMIT = 'LOGIN_SUBMIT';
export const LOGIN_PROMPT_CLOSED = "LOGIN:LOGIN_PROMPT_CLOSED";
export const LOGIN_REQUIRED = "LOGIN:LOGIN_REQUIRED";
export const LOGIN_SUCCESS = 'LOGIN_SUCCESS';
export const LOGIN_FAIL = 'LOGIN_FAIL';
export const RESET_ERROR = 'RESET_ERROR';
export const CHANGE_PASSWORD = 'CHANGE_PASSWORD';
export const CHANGE_PASSWORD_SUCCESS = 'CHANGE_PASSWORD_SUCCESS';
export const CHANGE_PASSWORD_FAIL = 'CHANGE_PASSWORD_FAIL';
export const LOGOUT = 'LOGOUT';
export const REFRESH_SUCCESS = 'REFRESH_SUCCESS';
export const SESSION_VALID = 'SESSION_VALID';

export const SET_SHOW_MODAL_STATUS = 'SECURITY:SET_SHOW_MODAL_STATUS';
export const SET_CREDENTIALS = 'SECURITY:SET_CREDENTIALS';
export const CLEAR_SECURITY = 'SECURITY:CLEAR_SECURITY';
export const SET_PROTECTED_SERVICES = 'SECURITY:SET_PROTECTED_SERVICES';
export const REFRESH_SECURITY_LAYERS = 'SECURITY:REFRESH_SECURITY_LAYERS';
export function loginSuccess(userDetails, username, password, authProvider) {
    return {
        type: LOGIN_SUCCESS,
        userDetails: userDetails,
        // set here for compatibility reasons
        // TODO: verify if the compatibility reasons still hold and remove otherwise
        authHeader: 'Basic ' + btoa(encodeUTF8(username) + ':' + encodeUTF8(password)),
        username: username,
        password: password,
        authProvider: authProvider
    };
}

export function loginFail(e) {
    return {
        type: LOGIN_FAIL,
        error: e
    };
}

export function resetError() {
    return {
        type: RESET_ERROR
    };
}

export function logout(redirectUrl) {
    return {
        type: LOGOUT,
        redirectUrl: redirectUrl
    };
}

export function completeLogout(redirectUrl) {
    return async (dispatch, getState) => {
        try {
            console.log('🚪 Starting complete logout flow...');
            
            const state = getState();
            const user = state.security?.user;
            const token = user?.access_token || getToken();
            
            // Get authentication provider configuration
            const authProviders = getConfigProp('authenticationProviders') || [];
            const keycloakProvider = authProviders.find(p => 
                p.type === 'openID' || p.type === 'keycloak' || p.provider === 'keycloak'
            );
            
            let backendLogoutSuccess = false;
            let keycloakLogoutUrl = null;
            
            // Step 1: Enhanced Backend logout with configuration
            if (token) {
                try {
                    // Get backend logout URL from configuration or use default
                    const backendLogoutUrl = keycloakProvider?.advanced?.backendLogoutUrl || 
                                           keycloakProvider?.config?.backendLogoutUrl ||
                                           'http://localhost:9191/geostore/rest/users/user/logout';
                    
                    console.log('🔄 Performing backend logout to:', backendLogoutUrl);
                    
                    const response = await fetch(backendLogoutUrl, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 10000
                    });
                    
                    backendLogoutSuccess = response.ok || response.status < 500;
                    console.log('✅ Backend logout successful:', response.status);
                } catch (error) {
                    console.warn('⚠️ Backend logout failed:', error.message);
                    // Continue with logout process even if backend fails
                }
            }
            
            // Step 2: Comprehensive token and cache cleanup
            try {
                console.log('🔄 Performing comprehensive token and cache cleanup...');
                
                // Clear all MapStore authentication data
                const mapstoreKeys = [
                    'mapstore2-user',
                    'mapstore2-token', 
                    'mapstore2-refresh-token',
                    'mapstore2-security',
                    'mapstore2-auth',
                    'mapstore2-session',
                    'mapstore-user',
                    'mapstore-token',
                    'mapstore-security'
                ];
                
                mapstoreKeys.forEach(key => {
                    try {
                        localStorage.removeItem(key);
                        sessionStorage.removeItem(key);
                    } catch (e) {
                        console.warn(`Failed to remove key: ${key}`);
                    }
                });
                
                // Clear all Keycloak authentication data
                const keycloakKeys = [
                    'keycloak_access_token',
                    'keycloak_refresh_token',
                    'keycloak_user',
                    'keycloak_userinfo',
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
                
                keycloakKeys.forEach(key => {
                    try {
                        localStorage.removeItem(key);
                        sessionStorage.removeItem(key);
                    } catch (e) {
                        console.warn(`Failed to remove key: ${key}`);
                    }
                });
                
                // Clear all OIDC/OAuth authentication data
                const oauthKeys = [
                    'oidc.user',
                    'oidc.access_token',
                    'oidc.refresh_token',
                    'oidc.session',
                    'oauth_token',
                    'oauth_refresh_token',
                    'oauth_session',
                    'access_token',
                    'refresh_token',
                    'bearer_token',
                    'auth_token',
                    'session_token',
                    'security_token'
                ];
                
                oauthKeys.forEach(key => {
                    try {
                        localStorage.removeItem(key);
                        sessionStorage.removeItem(key);
                    } catch (e) {
                        console.warn(`Failed to remove key: ${key}`);
                    }
                });
                
                // Clear any keys containing authentication patterns
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
                
                // Clear authentication cookies
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
                
                // Clear IndexedDB authentication data
                if ('indexedDB' in window) {
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
                
                // Clear global application state
                if (window.mapstore) {
                    delete window.mapstore.user;
                    delete window.mapstore.token;
                    delete window.mapstore.security;
                }
                
                // Clear Redux store security state if accessible
                try {
                    if (window.__REDUX_STORE__) {
                        const store = window.__REDUX_STORE__;
                        store.dispatch({ type: 'RESET_SECURITY_STATE' });
                    }
                } catch (e) {
                    console.warn('Could not clear Redux state:', e.message);
                }
                
                console.log('✅ Comprehensive token and cache cleanup completed');
            } catch (error) {
                console.warn('⚠️ Token and cache cleanup failed:', error.message);
                // Fallback: force clear everything
                try {
                    localStorage.clear();
                    sessionStorage.clear();
                    console.log('✅ Fallback: cleared all storage');
                } catch (fallbackError) {
                    console.error('❌ Fallback cleanup failed:', fallbackError);
                }
            }
            
            // Step 3: Direct Keycloak logout (no redirect) if user is Keycloak user
            if (KeycloakSecurityUtils.isKeycloakUser()) {
                try {
                    console.log('🔄 Performing direct Keycloak logout (no redirect)...');
                    await KeycloakSecurityUtils.logout();
                    
                    // Additional direct logout to Keycloak using proper endpoint to terminate sessions
                    const keycloakLogoutUrl = keycloakProvider?.advanced?.logoutUrl || 
                                            keycloakProvider?.config?.logoutUrl;
                    const refreshToken = localStorage.getItem('keycloak_refresh_token');
                    
                    if (keycloakLogoutUrl && token && refreshToken) {
                        try {
                            console.log('🔄 Sending direct logout request to terminate Keycloak sessions...');
                            
                            // Use the correct format: client_id and refresh_token in body
                            const logoutParams = new URLSearchParams({
                                client_id: 'mapstore-client',
                                refresh_token: refreshToken
                            });
                            
                            // Direct POST request to properly terminate sessions
                            const response = await fetch(keycloakLogoutUrl, {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/x-www-form-urlencoded'
                                },
                                body: logoutParams.toString(),
                                mode: 'cors'
                            });
                            
                            if (response.ok) {
                                console.log('✅ Direct Keycloak logout successful - sessions terminated');
                            } else {
                                console.warn('⚠️ Keycloak logout request failed:', response.status, response.statusText);
                            }
                        } catch (fetchError) {
                            console.warn('⚠️ Direct Keycloak logout request failed:', fetchError.message);
                        }
                    } else {
                        console.warn('⚠️ Missing required tokens for Keycloak session termination');
                    }
                    
                    console.log('✅ Keycloak direct logout completed');
                } catch (error) {
                    console.warn('⚠️ Keycloak logout failed:', error.message);
                }
            }
            
            // Step 4: Dispatch standard logout action
            dispatch(logout(redirectUrl));
            
            // Step 5: No redirect - direct logout only
            console.log('ℹ️ Keycloak direct logout completed - no redirect needed');
            
            // Step 6: Success notification and local redirect
            setTimeout(() => {
                dispatch({
                    type: 'SHOW_NOTIFICATION',
                    message: 'Successfully logged out from all services',
                    level: 'success'
                });
                
                // Redirect to home page after successful logout
                setTimeout(() => {
                    console.log('🏠 Redirecting to home page after successful logout');
                    window.location.href = window.location.origin;
                }, 1500);
            }, 1000);
            
            console.log('✅ Complete logout flow finished');
            console.log(`📊 Logout Summary: Backend=${backendLogoutSuccess ? 'Success' : 'Failed'}, Keycloak=Direct Logout`);
            
        } catch (error) {
            console.error('❌ Complete logout error:', error);
            // Still proceed with standard logout even if complete logout fails
            dispatch(logout(redirectUrl));
        }
    };
}

/**
 * Asks for  login
 */
export function loginRequired() {
    return {
        type: LOGIN_REQUIRED
    };
}

/**
 * event of login close after a LOGIN_REQUIRED event
 * @param {string} owner
 */
export function loginPromptClosed() {
    return {
        type: LOGIN_PROMPT_CLOSED
    };
}

export function logoutWithReload() {
    return (dispatch) => {
        dispatch(logout(null));
    };
}

export function login(username, password) {
    return (dispatch) => {
        return AuthenticationAPI.login(username, password).then((response) => {
            dispatch(loginSuccess(response, username, password, AuthenticationAPI.authProviderName));
        }).catch((e) => {
            dispatch(loginFail(e));
        });
    };
}

export function changePasswordSuccess(user, newPassword) {
    return {
        type: CHANGE_PASSWORD_SUCCESS,
        user: user,
        authHeader: 'Basic ' + btoa(encodeUTF8(user.name) + ':' + encodeUTF8(newPassword))
    };
}

export function changePasswordFail(e) {
    return {
        type: CHANGE_PASSWORD_FAIL,
        error: e
    };
}

export function changePasswordStart() {
    return {
        type: CHANGE_PASSWORD
    };
}

export function changePassword(user, newPassword) {
    return (dispatch) => {
        dispatch(changePasswordStart());
        AuthenticationAPI.changePassword(user, newPassword).then(() => {
            dispatch(changePasswordSuccess(user, newPassword));
        }).catch((e) => {
            dispatch(changePasswordFail(e));
        });
    };
}

export function refreshSuccess(userDetails, authProvider) {
    return {
        type: REFRESH_SUCCESS,
        userDetails: userDetails,
        authProvider: authProvider
    };
}

export function refreshAccessToken() {
    return (dispatch) => {
        // Check if this is a Keycloak user
        if (KeycloakSecurityUtils.isKeycloakUser()) {
            console.log('Refreshing Keycloak token...');
            KeycloakSecurityUtils.refreshToken().then((response) => {
                console.log('Keycloak token refreshed successfully in action');
                dispatch(refreshSuccess(response, response.authProvider || 'keycloak'));
            }).catch((error) => {
                console.error('Keycloak token refresh failed in action:', error);
                dispatch(logout(null));
            });
        } else {
            // Fallback to default MapStore refresh mechanism
            const accessToken = getToken();
            const refreshToken = getRefreshToken();
            AuthenticationAPI.refreshToken(accessToken, refreshToken).then((response) => {
                dispatch(refreshSuccess(response, AuthenticationAPI.authProviderName));
            }).catch(() => {
                dispatch(logout(null));
            });
        }
    };
}

export function sessionValid(userDetails, authProvider) {
    return {
        type: SESSION_VALID,
        userDetails: userDetails,
        authProvider: authProvider
    };
}

export function verifySession() {
    return (dispatch) => {
        // Check if this is a Keycloak user
        if (KeycloakSecurityUtils.isKeycloakUser()) {
            console.log('Verifying Keycloak session...');
            KeycloakSecurityUtils.verifySession().then((response) => {
                console.log('Keycloak session verified successfully');
                dispatch(sessionValid(response, response.authProvider || 'keycloak'));
            }).catch((error) => {
                console.error('Keycloak session verification failed:', error);
                dispatch(logout(null));
            });
        } else {
            // Fallback to default MapStore verification
            AuthenticationAPI.verifySession().then((response) => {
                dispatch(sessionValid(response, AuthenticationAPI.authProviderName));
            }).catch(() => {
                dispatch(logout(null));
            });
        }
    };
}

export const checkLoggedUser = () => ({type: CHECK_LOGGED_USER});

/**
 * set status to show modal for inserting credentials
 * @param {boolean} status
 */
export const setShowModalStatus = (status) => {
    return {
        status,
        type: SET_SHOW_MODAL_STATUS
    };
};
/**
 * set protected services to request to provide username and password
 * @param {object[]} protectedServices
 */
export const setProtectedServices = (protectedServices) => {
    return {
        protectedServices,
        type: SET_PROTECTED_SERVICES
    };
};
/**
 * clear security of layers
 * @param {string} id
 */
export const clearSecurity = (protectedId) => {
    return {
        protectedId,
        type: CLEAR_SECURITY
    };
};
/**
 * set credentials for a service ogc
 * @param {object} protectedService
 */
export const setCredentialsAction = (protectedService, creds) => {
    if (creds && protectedService.protectedId) {
        setCredentials(protectedService.protectedId, {
            ...creds,
            url: protectedService.url
        });
    }
    return {
        protectedService,
        type: SET_CREDENTIALS
    };
};

/**
 * action to use to rerender layers in map when security changed
 */
export function refreshSecurityLayers() {
    return {
        type: REFRESH_SECURITY_LAYERS
    };
}
