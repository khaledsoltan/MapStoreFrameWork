/*
 * Copyright 2024, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { logout, completeLogout } from '../../actions/security';
import { addNotification } from '../../actions/notifications';
import { userSelector, authProviderSelector } from '../../selectors/security';
import { getConfigProp } from '../../utils/ConfigUtils';
import axios from 'axios';

/**
 * Enhanced Logout Handler that manages complete logout flow
 * including backend logout and token cleanup
 */
class LogoutHandler extends React.Component {
    
    static contextTypes = {
        store: PropTypes.object
    };
    
    /**
     * Perform backend logout
     */
    performBackendLogout = async (token) => {
        try {
            const authProviders = getConfigProp('authenticationProviders') || [];
            const keycloakProvider = authProviders.find(p => p.type === 'keycloak');
            
            if (keycloakProvider?.config?.backendLogoutUrl && token) {
                console.log('🔄 Performing backend logout...');
                
                await axios.post(keycloakProvider.config.backendLogoutUrl, {}, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 5000
                });
                
                console.log('✅ Backend logout successful');
                return true;
            }
        } catch (error) {
            console.warn('⚠️ Backend logout failed:', error.message);
            // Don't block the logout process if backend logout fails
            return false;
        }
    };

    /**
     * Perform Keycloak logout
     */
    performKeycloakLogout = async (token) => {
        try {
            const authProviders = getConfigProp('authenticationProviders') || [];
            const keycloakProvider = authProviders.find(p => p.type === 'keycloak');
            
            if (keycloakProvider?.config?.logoutUrl && token) {
                console.log('🔄 Performing Keycloak logout...');
                
                const logoutParams = new URLSearchParams({
                    id_token_hint: token,
                    post_logout_redirect_uri: keycloakProvider.config.postLogoutRedirectUri || window.location.origin
                });
                
                // For single logout, redirect to Keycloak logout endpoint
                if (keycloakProvider.config.enableSingleLogout) {
                    window.location.href = `${keycloakProvider.config.logoutUrl}?${logoutParams.toString()}`;
                    return true;
                }
            }
        } catch (error) {
            console.warn('⚠️ Keycloak logout failed:', error.message);
            return false;
        }
    };

    /**
     * Clean up local storage and session data
     */
    cleanupLocalData = () => {
        try {
            // Clear MapStore specific data
            localStorage.removeItem('mapstore2-user');
            localStorage.removeItem('mapstore2-token');
            localStorage.removeItem('mapstore2-refresh-token');
            
            // Clear any Keycloak specific data
            const keycloakKeys = Object.keys(localStorage).filter(key => 
                key.includes('keycloak') || key.includes('kc-')
            );
            keycloakKeys.forEach(key => localStorage.removeItem(key));
            
            // Clear session storage
            sessionStorage.clear();
            
            console.log('✅ Local data cleanup completed');
        } catch (error) {
            console.warn('⚠️ Local data cleanup failed:', error.message);
        }
    };

    /**
     * Complete logout flow using optimized security actions
     */
    handleLogout = async () => {
        const { onNotification } = this.props;
        
        try {
            console.log('🚪 LogoutHandler: Starting complete logout flow...');
            
            // Check if we have Redux store access
            if (this.context && this.context.store) {
                // Use Redux action for complete logout
                this.context.store.dispatch(completeLogout());
            } else {
                // Fallback to direct logout methods
                await this.performDirectLogout();
            }
            
        } catch (error) {
            console.error('❌ LogoutHandler error:', error);
            
            if (onNotification) {
                onNotification({
                    title: 'Logout Error',
                    message: 'There was an issue during logout. Please try again.',
                    level: 'error',
                    position: 'tc'
                });
            }
            
            // Fallback: at least clear local data and redirect
            this.cleanupLocalData();
            window.location.href = '/';
        }
    };

    /**
     * Direct logout method (fallback when Redux is not available)
     */
    performDirectLogout = async () => {
        const { user, onLogout, onNotification } = this.props;
        
        console.log('🔄 Performing direct logout...');
        const token = user?.access_token || localStorage.getItem('mapstore2-token');
        
        // Step 1: Backend logout
        const backendSuccess = await this.performBackendLogout(token);
        
        // Step 2: Clean local data
        this.cleanupLocalData();
        
        // Step 3: MapStore logout
        if (onLogout) {
            onLogout();
        }
        
        // Step 4: Keycloak logout (this might redirect)
        const keycloakSuccess = await this.performKeycloakLogout(token);
        
        // Show notification if not redirecting
        if (!keycloakSuccess && onNotification) {
            onNotification({
                title: 'Logout',
                message: 'Successfully logged out from all services',
                level: 'success',
                position: 'tc'
            });
        }
        
        console.log('✅ Direct logout flow finished');
    };

    render() {
        // This component can be used as a hook or rendered as a button
        const { children, className, style } = this.props;
        
        if (children) {
            return (
                <span 
                    onClick={this.handleLogout}
                    className={className}
                    style={{ cursor: 'pointer', ...style }}
                >
                    {children}
                </span>
            );
        }
        
        return null;
    }
}

const mapStateToProps = (state) => ({
    user: userSelector(state),
    authProvider: authProviderSelector(state)
});

const mapDispatchToProps = {
    onLogout: completeLogout,
    onNotification: addNotification
};

export default connect(mapStateToProps, mapDispatchToProps)(LogoutHandler); 