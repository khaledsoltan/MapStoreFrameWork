#!/usr/bin/env node

/**
 * Complete Logout Flow Test Script
 * Tests the enhanced logout functionality for both Keycloak and Backend API
 */

const axios = require('axios');
const qs = require('querystring');

// Configuration
const CONFIG = {
    keycloak: {
        serverUrl: 'https://gisidgw.geosystems-me.com:5443',
        realm: 'GISID',
        clientId: 'mapstore-client',
        clientSecret: 'hy7rf5rEiDRHreQAlt6zMsizLnvK65Ih'
    },
    backend: {
        baseUrl: 'http://localhost:9191/geostore',
        logoutEndpoint: '/rest/users/user/logout',
        userDetailsEndpoint: '/rest/users/user/details'
    },
    testUser: {
        username: 'testuser', // Replace with actual test user
        password: 'testpass'   // Replace with actual password
    }
};

class CompleteLogoutTester {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            testPhases: [],
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                errors: []
            }
        };
    }

    /**
     * Run complete logout flow test
     */
    async runLogoutTest() {
        console.log('🚪 Testing Complete Logout Flow\n');
        
        try {
            // Phase 1: Get authentication token
            const token = await this.getAuthToken();
            if (!token) {
                throw new Error('Could not obtain authentication token');
            }
            
            // Phase 2: Verify initial authentication
            await this.verifyAuthentication(token);
            
            // Phase 3: Test backend logout
            await this.testBackendLogout(token);
            
            // Phase 4: Verify token invalidation
            await this.verifyTokenInvalidation(token);
            
            // Phase 5: Test Keycloak logout URLs
            await this.testKeycloakLogoutUrls();
            
        } catch (error) {
            this.addResult('GLOBAL_ERROR', false, error.message);
        }
        
        this.printSummary();
        return this.results;
    }

    /**
     * Get authentication token from Keycloak
     */
    async getAuthToken() {
        try {
            console.log('🔑 Phase 1: Getting authentication token...');
            
            const tokenUrl = `${CONFIG.keycloak.serverUrl}/realms/${CONFIG.keycloak.realm}/protocol/openid-connect/token`;
            
            const data = qs.stringify({
                grant_type: 'password',
                client_id: CONFIG.keycloak.clientId,
                client_secret: CONFIG.keycloak.clientSecret,
                username: CONFIG.testUser.username,
                password: CONFIG.testUser.password,
                scope: 'openid profile email'
            });

            const response = await axios.post(tokenUrl, data, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                timeout: 10000
            });

            if (response.data.access_token) {
                this.addResult('TOKEN_ACQUISITION', true, 'Successfully obtained access token');
                return response.data.access_token;
            } else {
                this.addResult('TOKEN_ACQUISITION', false, 'No access token in response');
                return null;
            }
            
        } catch (error) {
            this.addResult('TOKEN_ACQUISITION', false, error.response?.data?.error_description || error.message);
            return null;
        }
    }

    /**
     * Verify initial authentication with backend
     */
    async verifyAuthentication(token) {
        try {
            console.log('✅ Phase 2: Verifying authentication with backend...');
            
            const response = await axios.get(`${CONFIG.backend.baseUrl}${CONFIG.backend.userDetailsEndpoint}`, {
                headers: { 'Authorization': `Bearer ${token}` },
                timeout: 10000
            });
            
            if (response.status === 200) {
                this.addResult('INITIAL_AUTH_VERIFICATION', true, 'Backend accepts token');
            } else {
                this.addResult('INITIAL_AUTH_VERIFICATION', false, `Unexpected status: ${response.status}`);
            }
            
        } catch (error) {
            this.addResult('INITIAL_AUTH_VERIFICATION', false, 
                error.response?.status ? `HTTP ${error.response.status}` : error.message);
        }
    }

    /**
     * Test backend logout functionality
     */
    async testBackendLogout(token) {
        try {
            console.log('🚪 Phase 3: Testing backend logout...');
            
            // Test the logout endpoint
            const logoutUrl = `${CONFIG.backend.baseUrl}${CONFIG.backend.logoutEndpoint}`;
            
            const response = await axios.post(logoutUrl, {}, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000,
                validateStatus: (status) => status < 500 // Accept 4xx as potential success
            });
            
            const isSuccess = response.status >= 200 && response.status < 400;
            this.addResult('BACKEND_LOGOUT', isSuccess, `Backend logout status: ${response.status}`);
            
            // Test different scenarios
            await this.testLogoutWithInvalidToken();
            await this.testLogoutWithoutToken();
            
        } catch (error) {
            this.addResult('BACKEND_LOGOUT', false, 
                error.response?.status ? `HTTP ${error.response.status}` : error.message);
        }
    }

    /**
     * Test logout with invalid token
     */
    async testLogoutWithInvalidToken() {
        try {
            const logoutUrl = `${CONFIG.backend.baseUrl}${CONFIG.backend.logoutEndpoint}`;
            
            await axios.post(logoutUrl, {}, {
                headers: { 
                    'Authorization': 'Bearer invalid_token_12345',
                    'Content-Type': 'application/json'
                },
                timeout: 5000
            });
            
            this.addResult('LOGOUT_INVALID_TOKEN', false, 'Should have failed with invalid token');
            
        } catch (error) {
            const expectedStatus = [401, 403];
            const actualStatus = error.response?.status;
            const isExpected = expectedStatus.includes(actualStatus);
            
            this.addResult('LOGOUT_INVALID_TOKEN', isExpected, 
                `Invalid token properly rejected: ${actualStatus}`);
        }
    }

    /**
     * Test logout without token
     */
    async testLogoutWithoutToken() {
        try {
            const logoutUrl = `${CONFIG.backend.baseUrl}${CONFIG.backend.logoutEndpoint}`;
            
            await axios.post(logoutUrl, {}, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 5000
            });
            
            this.addResult('LOGOUT_NO_TOKEN', false, 'Should have failed without token');
            
        } catch (error) {
            const expectedStatus = [401, 403];
            const actualStatus = error.response?.status;
            const isExpected = expectedStatus.includes(actualStatus);
            
            this.addResult('LOGOUT_NO_TOKEN', isExpected, 
                `No token properly rejected: ${actualStatus}`);
        }
    }

    /**
     * Verify token invalidation after logout
     */
    async verifyTokenInvalidation(token) {
        try {
            console.log('🔍 Phase 4: Verifying token invalidation...');
            
            // Wait a moment for logout to take effect
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Try to use the token again
            const response = await axios.get(`${CONFIG.backend.baseUrl}${CONFIG.backend.userDetailsEndpoint}`, {
                headers: { 'Authorization': `Bearer ${token}` },
                timeout: 5000
            });
            
            // If we get here, the token is still valid (might be expected behavior)
            this.addResult('TOKEN_INVALIDATION', false, 
                `Token still valid after logout (status: ${response.status})`);
            
        } catch (error) {
            const expectedStatus = [401, 403];
            const actualStatus = error.response?.status;
            const isExpected = expectedStatus.includes(actualStatus);
            
            this.addResult('TOKEN_INVALIDATION', isExpected, 
                isExpected ? 'Token properly invalidated' : `Unexpected error: ${actualStatus || error.message}`);
        }
    }

    /**
     * Test Keycloak logout URLs and parameters
     */
    async testKeycloakLogoutUrls() {
        try {
            console.log('🔗 Phase 5: Testing Keycloak logout URLs...');
            
            // Test logout endpoint discovery
            const discoveryUrl = `${CONFIG.keycloak.serverUrl}/realms/${CONFIG.keycloak.realm}/.well-known/openid_configuration`;
            const discoveryResponse = await axios.get(discoveryUrl, { timeout: 5000 });
            
            const logoutEndpoint = discoveryResponse.data.end_session_endpoint;
            if (logoutEndpoint) {
                this.addResult('KEYCLOAK_LOGOUT_DISCOVERY', true, `Logout endpoint: ${logoutEndpoint}`);
                
                // Test logout URL construction
                await this.testLogoutUrlConstruction(logoutEndpoint);
            } else {
                this.addResult('KEYCLOAK_LOGOUT_DISCOVERY', false, 'No logout endpoint in discovery');
            }
            
        } catch (error) {
            this.addResult('KEYCLOAK_LOGOUT_DISCOVERY', false, error.message);
        }
    }

    /**
     * Test logout URL construction with various parameters
     */
    async testLogoutUrlConstruction(logoutEndpoint) {
        try {
            const testCases = [
                {
                    name: 'BASIC_LOGOUT_URL',
                    params: {
                        post_logout_redirect_uri: 'http://localhost:8080',
                        client_id: CONFIG.keycloak.clientId
                    }
                },
                {
                    name: 'LOGOUT_WITH_ID_TOKEN_HINT',
                    params: {
                        id_token_hint: 'dummy_token',
                        post_logout_redirect_uri: 'http://localhost:8080',
                        client_id: CONFIG.keycloak.clientId
                    }
                },
                {
                    name: 'LOGOUT_WITH_STATE',
                    params: {
                        post_logout_redirect_uri: 'http://localhost:8080',
                        client_id: CONFIG.keycloak.clientId,
                        state: 'logout_state_123'
                    }
                }
            ];
            
            for (const testCase of testCases) {
                const params = new URLSearchParams(testCase.params);
                const fullUrl = `${logoutEndpoint}?${params.toString()}`;
                
                // Validate URL structure
                try {
                    new URL(fullUrl);
                    this.addResult(testCase.name, true, `Valid logout URL constructed`);
                } catch (urlError) {
                    this.addResult(testCase.name, false, `Invalid URL: ${urlError.message}`);
                }
            }
            
        } catch (error) {
            this.addResult('LOGOUT_URL_CONSTRUCTION', false, error.message);
        }
    }

    /**
     * Add a test result
     */
    addResult(testName, passed, message) {
        const result = {
            test: testName,
            passed,
            message,
            timestamp: new Date().toISOString()
        };
        
        this.results.testPhases.push(result);
        this.results.summary.total++;
        
        if (passed) {
            this.results.summary.passed++;
            console.log(`  ✅ ${testName}: ${message}`);
        } else {
            this.results.summary.failed++;
            this.results.summary.errors.push(`${testName}: ${message}`);
            console.log(`  ❌ ${testName}: ${message}`);
        }
    }

    /**
     * Print test summary
     */
    printSummary() {
        console.log('\n' + '='.repeat(60));
        console.log('🚪 COMPLETE LOGOUT FLOW TEST SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total Tests: ${this.results.summary.total}`);
        console.log(`✅ Passed: ${this.results.summary.passed}`);
        console.log(`❌ Failed: ${this.results.summary.failed}`);
        console.log(`📈 Success Rate: ${((this.results.summary.passed / this.results.summary.total) * 100).toFixed(1)}%`);
        
        if (this.results.summary.failed > 0) {
            console.log('\n🔍 FAILURES:');
            this.results.summary.errors.forEach(error => {
                console.log(`  • ${error}`);
            });
        }
        
        console.log('\n🎯 LOGOUT FLOW ANALYSIS:');
        const phases = ['TOKEN_ACQUISITION', 'INITIAL_AUTH_VERIFICATION', 'BACKEND_LOGOUT', 'TOKEN_INVALIDATION', 'KEYCLOAK_LOGOUT_DISCOVERY'];
        const phaseResults = phases.map(phase => {
            const result = this.results.testPhases.find(r => r.test === phase);
            return result ? (result.passed ? '✅' : '❌') : '⏭️';
        });
        
        console.log(`  Authentication Flow: ${phaseResults.join(' → ')}`);
        console.log('  Legend: ✅ Pass | ❌ Fail | ⏭️ Skipped');
        
        console.log('\n📝 RECOMMENDATIONS:');
        if (this.results.summary.passed === this.results.summary.total) {
            console.log('  • ✅ Complete logout flow is working correctly!');
            console.log('  • 🔄 Regular testing recommended to monitor logout functionality');
            console.log('  • 📊 Consider implementing logout analytics for production monitoring');
        } else {
            console.log('  • 🔧 Review failed test cases and fix configuration issues');
            console.log('  • 🔐 Ensure backend logout endpoint is properly implemented');
            console.log('  • 🌐 Verify Keycloak logout configuration and CORS settings');
            console.log('  • 🧹 Test local storage cleanup in browser development tools');
        }
        
        console.log('\n🔄 TESTING IN BROWSER:');
        console.log('  1. Start MapStore: npm start');
        console.log('  2. Login with Keycloak credentials');
        console.log('  3. Open browser developer tools (F12)');
        console.log('  4. Monitor Console and Network tabs during logout');
        console.log('  5. Verify localStorage is cleared after logout');
        console.log('  6. Confirm redirection to Keycloak logout page');
    }
}

// Run tests if script is executed directly
if (require.main === module) {
    const tester = new CompleteLogoutTester();
    tester.runLogoutTest().catch(console.error);
}

module.exports = CompleteLogoutTester; 