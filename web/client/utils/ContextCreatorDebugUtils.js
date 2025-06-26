/**
 * Copyright 2024, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { KeycloakSessionManager } from './KeycloakSessionUtils';
import { KeycloakSecurityUtils } from './KeycloakSecurityUtils';
import { getUser, getToken } from './SecurityUtils';

/**
 * Debug utilities for Context Creator with Keycloak integration
 */
export class ContextCreatorDebugUtils {
    
    /**
     * Check authentication status for context creation
     */
    static checkAuthenticationStatus() {
        const debug = {
            timestamp: new Date().toISOString(),
            isKeycloakUser: false,
            hasToken: false,
            tokenValid: false,
            userInfo: null,
            authHeaders: null,
            errors: []
        };
        
        try {
            // Check if user is Keycloak authenticated
            debug.isKeycloakUser = KeycloakSecurityUtils.isKeycloakUser();
            
            // Get current user
            debug.userInfo = getUser();
            
            // Check token availability
            const token = getToken();
            debug.hasToken = !!token;
            
            if (token) {
                debug.tokenValid = !KeycloakSessionManager.isTokenExpired(token);
                debug.authHeaders = KeycloakSecurityUtils.getAuthHeaders();
            }
            
        } catch (error) {
            debug.errors.push(`Authentication check failed: ${error.message}`);
        }
        
        return debug;
    }
    
    /**
     * Test GeoStore API connectivity with current authentication
     */
    static async testGeoStoreConnectivity() {
        const debug = {
            timestamp: new Date().toISOString(),
            geoStoreReachable: false,
            authenticationWorking: false,
            canCreateResources: false,
            errors: []
        };
        
        try {
            const axios = require('../libs/ajax').default;
            const ConfigUtils = require('./ConfigUtils').default;
            
            const geoStoreUrl = ConfigUtils.getDefaults().geoStoreUrl;
            debug.geoStoreUrl = geoStoreUrl;
            
            // Test basic connectivity
            try {
                const response = await axios.get(`${geoStoreUrl}/misc/category/MAP`, {
                    timeout: 5000
                });
                debug.geoStoreReachable = true;
                debug.authenticationWorking = response.status === 200;
            } catch (error) {
                if (error.response?.status === 401 || error.response?.status === 403) {
                    debug.geoStoreReachable = true;
                    debug.authenticationWorking = false;
                    debug.errors.push('Authentication required for GeoStore');
                } else {
                    debug.errors.push(`GeoStore connectivity failed: ${error.message}`);
                }
            }
            
            // Test resource creation capability
            if (debug.authenticationWorking) {
                try {
                    const testResponse = await axios.get(`${geoStoreUrl}/resources/`, {
                        timeout: 5000
                    });
                    debug.canCreateResources = testResponse.status === 200;
                } catch (error) {
                    debug.errors.push(`Resource access test failed: ${error.message}`);
                }
            }
            
        } catch (error) {
            debug.errors.push(`GeoStore test failed: ${error.message}`);
        }
        
        return debug;
    }
    
    /**
     * Validate context creation payload
     */
    static validateContextPayload(contextData) {
        const validation = {
            timestamp: new Date().toISOString(),
            isValid: true,
            errors: [],
            warnings: []
        };
        
        try {
            // Check required fields
            if (!contextData.name) {
                validation.errors.push('Context name is required');
                validation.isValid = false;
            }
            
            if (!contextData.windowTitle) {
                validation.errors.push('Window title is required');
                validation.isValid = false;
            }
            
            // Check data structure
            if (contextData.mapConfig) {
                if (!contextData.mapConfig.version) {
                    validation.warnings.push('Map config version not specified');
                }
                
                if (!contextData.mapConfig.map) {
                    validation.errors.push('Map configuration is missing');
                    validation.isValid = false;
                }
            } else {
                validation.warnings.push('Map configuration not provided');
            }
            
            // Check plugins configuration
            if (contextData.pluginsConfig) {
                const modes = Object.keys(contextData.pluginsConfig);
                if (modes.length === 0) {
                    validation.warnings.push('No plugin configurations found');
                }
            }
            
        } catch (error) {
            validation.errors.push(`Payload validation failed: ${error.message}`);
            validation.isValid = false;
        }
        
        return validation;
    }
    
    /**
     * Monitor context creation process
     */
    static async monitorContextCreation(contextData, onProgress) {
        const monitor = {
            timestamp: new Date().toISOString(),
            steps: [],
            success: false,
            finalResult: null,
            errors: []
        };
        
        const logStep = (step, status, details = {}) => {
            const stepInfo = {
                step,
                status,
                timestamp: new Date().toISOString(),
                ...details
            };
            monitor.steps.push(stepInfo);
            if (onProgress) onProgress(stepInfo);
            console.log(`Context Creation Monitor: ${step} - ${status}`, details);
        };
        
        try {
            // Step 1: Authentication check
            logStep('Authentication Check', 'started');
            const authStatus = this.checkAuthenticationStatus();
            if (!authStatus.isKeycloakUser || !authStatus.hasToken || !authStatus.tokenValid) {
                logStep('Authentication Check', 'failed', { authStatus });
                monitor.errors.push('Authentication not valid for context creation');
                return monitor;
            }
            logStep('Authentication Check', 'passed', { authStatus });
            
            // Step 2: GeoStore connectivity
            logStep('GeoStore Connectivity', 'started');
            const connectivityStatus = await this.testGeoStoreConnectivity();
            if (!connectivityStatus.authenticationWorking) {
                logStep('GeoStore Connectivity', 'failed', { connectivityStatus });
                monitor.errors.push('GeoStore authentication failed');
                return monitor;
            }
            logStep('GeoStore Connectivity', 'passed', { connectivityStatus });
            
            // Step 3: Payload validation
            logStep('Payload Validation', 'started');
            const validationResult = this.validateContextPayload(contextData);
            if (!validationResult.isValid) {
                logStep('Payload Validation', 'failed', { validationResult });
                monitor.errors.push('Context payload validation failed');
                return monitor;
            }
            logStep('Payload Validation', 'passed', { validationResult });
            
            // Step 4: Context creation attempt
            logStep('Context Creation', 'started');
            try {
                const { createResource } = require('../api/persistence');
                
                const resource = {
                    category: 'CONTEXT',
                    metadata: {
                        name: contextData.name,
                        description: contextData.description || 'Context created via Keycloak integration'
                    },
                    data: contextData
                };
                
                const result = await createResource(resource);
                logStep('Context Creation', 'completed', { resourceId: result });
                monitor.success = true;
                monitor.finalResult = result;
                
            } catch (error) {
                logStep('Context Creation', 'failed', { error: error.message });
                monitor.errors.push(`Context creation failed: ${error.message}`);
            }
            
        } catch (error) {
            logStep('Monitor Error', 'failed', { error: error.message });
            monitor.errors.push(`Monitoring failed: ${error.message}`);
        }
        
        return monitor;
    }
    
    /**
     * Generate comprehensive debug report
     */
    static async generateDebugReport() {
        const report = {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            sections: {}
        };
        
        try {
            // Authentication status
            report.sections.authentication = this.checkAuthenticationStatus();
            
            // GeoStore connectivity
            report.sections.geostore = await this.testGeoStoreConnectivity();
            
            // Configuration check
            report.sections.configuration = this.checkConfiguration();
            
            // Token details (if available)
            if (report.sections.authentication.hasToken) {
                report.sections.tokenDetails = this.analyzeToken();
            }
            
        } catch (error) {
            report.error = error.message;
        }
        
        return report;
    }
    
    /**
     * Check MapStore configuration for Keycloak
     */
    static checkConfiguration() {
        const config = {
            timestamp: new Date().toISOString(),
            authenticationRules: null,
            authenticationProviders: null,
            keycloakProvider: null,
            geoStoreUrl: null,
            errors: []
        };
        
        try {
            const ConfigUtils = require('./ConfigUtils').default;
            
            config.authenticationRules = ConfigUtils.getConfigProp('authenticationRules');
            config.authenticationProviders = ConfigUtils.getConfigProp('authenticationProviders');
            config.geoStoreUrl = ConfigUtils.getDefaults().geoStoreUrl;
            
            // Find Keycloak provider
            if (config.authenticationProviders) {
                config.keycloakProvider = config.authenticationProviders.find(
                    provider => provider.type === 'keycloak-direct' || provider.provider === 'keycloak'
                );
            }
            
            // Validate configuration
            if (!config.authenticationRules || !config.authenticationRules.length) {
                config.errors.push('No authentication rules configured');
            }
            
            if (!config.keycloakProvider) {
                config.errors.push('No Keycloak authentication provider configured');
            }
            
        } catch (error) {
            config.errors.push(`Configuration check failed: ${error.message}`);
        }
        
        return config;
    }
    
    /**
     * Analyze current token
     */
    static analyzeToken() {
        const analysis = {
            timestamp: new Date().toISOString(),
            tokenPresent: false,
            tokenExpired: false,
            tokenClaims: null,
            errors: []
        };
        
        try {
            const token = getToken();
            analysis.tokenPresent = !!token;
            
            if (token) {
                analysis.tokenExpired = KeycloakSessionManager.isTokenExpired(token);
                analysis.tokenClaims = KeycloakSessionManager.getTokenClaims(token);
                
                if (analysis.tokenClaims) {
                    analysis.expiresAt = new Date(analysis.tokenClaims.exp * 1000).toISOString();
                    analysis.issuedAt = new Date(analysis.tokenClaims.iat * 1000).toISOString();
                    analysis.subject = analysis.tokenClaims.sub;
                    analysis.audience = analysis.tokenClaims.aud;
                }
            }
            
        } catch (error) {
            analysis.errors.push(`Token analysis failed: ${error.message}`);
        }
        
        return analysis;
    }
}

export default ContextCreatorDebugUtils; 