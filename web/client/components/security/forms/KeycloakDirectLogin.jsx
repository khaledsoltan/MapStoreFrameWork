/**
 * Copyright 2024, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useState } from 'react';
import { FormControl, FormGroup, ControlLabel, Alert, Button } from 'react-bootstrap';
import PropTypes from 'prop-types';
import axios from 'axios';

import Message from '../../I18N/Message';
import { getMessageById } from '../../../utils/LocaleUtils';
import Spinner from "../../layout/Spinner";

/**
 * Direct Keycloak Login Component
 * Authenticates users directly with their username and password using the password grant flow
 */
class KeycloakDirectLogin extends React.Component {
    static propTypes = {
        onLoginSuccess: PropTypes.func,
        onError: PropTypes.func,
        keycloakConfig: PropTypes.object
    };

    static contextTypes = {
        messages: PropTypes.object
    };

    static defaultProps = {
        onLoginSuccess: () => {},
        onError: () => {},
        keycloakConfig: {
            authServerUrl: 'https://gisidgw.geosystems-me.com:5443/',
            realm: 'GISID',
            clientId: 'mapstore-client',
            clientSecret: 'hy7rf5rEiDRHreQAlt6zMsizLnvK65Ih'
        }
    };

    constructor(props) {
        super(props);
        this.state = {
            username: '',
            password: '',
            loading: false,
            error: null
        };
    }

    render() {
        const { loading, error, username, password } = this.state;

        return (
            <form onSubmit={this.handleSubmit}>
                <FormGroup>
                    <ControlLabel><Message msgId="user.username"/></ControlLabel>
                    <FormControl 
                        type="text"
                        value={username}
                        placeholder={getMessageById(this.context.messages, "user.username")}
                        onChange={this.handleUsernameChange}
                        disabled={loading}
                    />
                </FormGroup>
                
                <FormGroup>
                    <ControlLabel><Message msgId="user.password"/></ControlLabel>
                    <FormControl 
                        type="password"
                        value={password}
                        placeholder={getMessageById(this.context.messages, "user.password")}
                        onChange={this.handlePasswordChange}
                        disabled={loading}
                        onKeyPress={this.handleKeyPress}
                    />
                </FormGroup>

                {error && (
                    <Alert bsStyle="danger">
                        <strong><Message msgId="user.loginFail"/></strong> {error}
                    </Alert>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Button 
                        type="submit" 
                        bsStyle="primary" 
                        disabled={loading || !username || !password}
                    >
                        {loading ? <Spinner style={{ marginRight: 5 }} /> : null}
                        <Message msgId="user.signIn"/>
                    </Button>
                    
                    <Button 
                        bsStyle="info" 
                        onClick={this.handleKeycloakRedirect}
                        disabled={loading}
                    >
                        <Message msgId="user.loginWithKeycloak" defaultMessage="Login with Keycloak"/>
                    </Button>
                </div>
            </form>
        );
    }

    handleUsernameChange = (e) => {
        this.setState({ username: e.target.value, error: null });
    };

    handlePasswordChange = (e) => {
        this.setState({ password: e.target.value, error: null });
    };

    handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            this.handleSubmit(e);
        }
    };



    handleSubmit = async (e) => {
        e.preventDefault();
        const { username, password } = this.state;
        const { keycloakConfig } = this.props;

        if (!username || !password) {
            this.setState({ error: 'Username and password are required' });
            return;
        }

        this.setState({ loading: true, error: null });

        try {
            // Use Password Grant flow (Resource Owner Password Credentials)
            console.log('Authenticating user with Keycloak using password grant...');
            const tokenUrl = `${keycloakConfig.authServerUrl}realms/${keycloakConfig.realm}/protocol/openid-connect/token`;
            
            const params = new URLSearchParams();
            params.append('grant_type', 'password');
            params.append('client_id', keycloakConfig.clientId);
            params.append('username', username);
            params.append('password', password);
            
            // Add client secret if available (for confidential clients)
            if (keycloakConfig.clientSecret) {
                params.append('client_secret', keycloakConfig.clientSecret);
            }

            const response = await axios.post(tokenUrl, params, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            if (response.data.access_token) {
                console.log('Password grant token response:', response.data);
                
                // Get detailed user info from the access token and userinfo endpoint
                let userInfo = {};
                try {
                    // Try to get user info from userinfo endpoint
                    userInfo = await this.getUserInfo(response.data.access_token);
                    console.log('UserInfo from Keycloak:', userInfo);
                } catch (userInfoError) {
                    console.warn('Could not get userinfo, using token claims:', userInfoError);
                    // Fallback to token claims
                    try {
                        const tokenClaims = this.parseJWTToken(response.data.access_token);
                        userInfo = tokenClaims;
                        console.log('Token claims:', tokenClaims);
                    } catch (tokenError) {
                        console.warn('Could not parse token claims:', tokenError);
                    }
                }
                
                // Create comprehensive user object for MapStore using session manager
                const KeycloakSessionManager = require('../../../utils/KeycloakSessionUtils').default;
                const tokenClaims = this.parseJWTToken(response.data.access_token);
                const user = KeycloakSessionManager.createMapStoreUser(userInfo, response.data, tokenClaims);
                
                console.log('MapStore user object created:', user);
                
                // Save session data
                KeycloakSessionManager.saveSession(response.data, user, userInfo);
                
                // Call success callback with user data and tokens
                this.props.onLoginSuccess({
                    user: user,
                    tokens: response.data,
                    userInfo: userInfo,
                    provider: 'keycloak-password'
                });
            }
        } catch (error) {
            console.error('Keycloak login error:', error);
            let errorMessage = 'Login failed';
            
            if (error.response?.status === 401) {
                errorMessage = 'Authentication failed - invalid credentials';
            } else if (error.response?.status === 400) {
                errorMessage = 'Invalid request or client configuration';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            this.setState({ error: errorMessage });
            this.props.onError(error);
        } finally {
            this.setState({ loading: false });
        }
    };

    getUserInfo = async (accessToken) => {
        const { keycloakConfig } = this.props;
        const userInfoUrl = `${keycloakConfig.authServerUrl}realms/${keycloakConfig.realm}/protocol/openid-connect/userinfo`;
        
        const response = await axios.get(userInfoUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        return response.data;
    };

    /**
     * Parse JWT token to extract claims
     */
    parseJWTToken = (token) => {
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
    };

    /**
     * Extract groups from user info and token
     */
    extractGroups = (userInfo, tokenData) => {
        const groups = [];
        
        // From userInfo
        if (userInfo.groups && Array.isArray(userInfo.groups)) {
            groups.push(...userInfo.groups);
        }
        
        // From token claims if available
        if (tokenData.access_token) {
            try {
                const tokenClaims = this.parseJWTToken(tokenData.access_token);
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
            } catch (error) {
                console.warn('Could not extract groups from token:', error);
            }
        }
        
        // Default groups if none found
        if (groups.length === 0) {
            groups.push('users'); // Default group
        }
        
        // Remove duplicates
        return [...new Set(groups)];
    };

    /**
     * Extract role from user info and token
     * Maps Keycloak roles to MapStore roles (ADMIN, USER)
     */
    extractRole = (userInfo, tokenData) => {
        let roles = [];
        
        // From userInfo
        if (userInfo.roles && Array.isArray(userInfo.roles)) {
            roles.push(...userInfo.roles);
        }
        
        // From token claims
        if (tokenData.access_token) {
            try {
                const tokenClaims = this.parseJWTToken(tokenData.access_token);
                if (tokenClaims.realm_access?.roles) {
                    roles.push(...tokenClaims.realm_access.roles);
                }
                if (tokenClaims.resource_access?.['mapstore-client']?.roles) {
                    roles.push(...tokenClaims.resource_access['mapstore-client'].roles);
                }
            } catch (error) {
                console.warn('Could not extract roles from token:', error);
            }
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
    };

    handleKeycloakRedirect = () => {
        const { keycloakConfig } = this.props;
        const authUrl = `${keycloakConfig.authServerUrl}realms/${keycloakConfig.realm}/protocol/openid-connect/auth`;
        const redirectUri = encodeURIComponent(window.location.origin + '/mapstore/');
        const clientId = encodeURIComponent(keycloakConfig.clientId);
        
        const params = [
            `client_id=${clientId}`,
            `redirect_uri=${redirectUri}`,
            'response_type=code',
            'scope=openid profile email'
        ].join('&');
        
        window.location.href = `${authUrl}?${params}`;
    };
}

export default KeycloakDirectLogin; 