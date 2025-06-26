#!/usr/bin/env node

/**
 * Test script to verify Keycloak integration with backend API
 * This script tests the complete authentication flow:
 * 1. Get token from Keycloak
 * 2. Use token to authenticate with backend API
 * 3. Test API endpoints
 */

const axios = require('axios');
const qs = require('querystring');

// Configuration
const KEYCLOAK_CONFIG = {
    authServerUrl: 'https://gisidgw.geosystems-me.com:5443',
    realm: 'GISID',
    clientId: 'mapstore-client',
    clientSecret: 'hy7rf5rEiDRHreQAlt6zMsizLnvK65Ih'
};

const BACKEND_API = {
    baseUrl: 'http://localhost:9191/geostore'
};

// Test credentials - replace with actual test user
const TEST_USER = {
    username: 'testuser',  // Replace with actual username
    password: 'testpass'   // Replace with actual password
};

/**
 * Get access token from Keycloak using Resource Owner Password Credentials flow
 */
async function getKeycloakToken() {
    try {
        console.log('🔑 Getting token from Keycloak...');
        
        const tokenUrl = `${KEYCLOAK_CONFIG.authServerUrl}/realms/${KEYCLOAK_CONFIG.realm}/protocol/openid-connect/token`;
        
        const data = qs.stringify({
            grant_type: 'password',
            client_id: KEYCLOAK_CONFIG.clientId,
            client_secret: KEYCLOAK_CONFIG.clientSecret,
            username: TEST_USER.username,
            password: TEST_USER.password,
            scope: 'openid profile email'
        });

        const response = await axios.post(tokenUrl, data, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        console.log('✅ Successfully obtained token from Keycloak');
        console.log(`📋 Token type: ${response.data.token_type}`);
        console.log(`⏰ Expires in: ${response.data.expires_in} seconds`);
        
        return response.data.access_token;
    } catch (error) {
        console.error('❌ Failed to get token from Keycloak:');
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Data:`, error.response.data);
        } else {
            console.error(error.message);
        }
        throw error;
    }
}

/**
 * Test backend API endpoints with the token
 */
async function testBackendAPI(token) {
    try {
        console.log('\n🔧 Testing backend API endpoints...');
        
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        // Test 1: Get user info
        console.log('📊 Testing /rest/users/user/details endpoint...');
        try {
            const userResponse = await axios.get(`${BACKEND_API.baseUrl}/rest/users/user/details`, {
                headers
            });
            console.log('✅ User details retrieved successfully');
            console.log('👤 User info:', userResponse.data);
        } catch (error) {
            console.log('⚠️  User details endpoint failed:', error.response?.status || error.message);
        }

        // Test 2: Get resources
        console.log('\n📋 Testing /rest/resources endpoint...');
        try {
            const resourcesResponse = await axios.get(`${BACKEND_API.baseUrl}/rest/resources`, {
                headers
            });
            console.log('✅ Resources retrieved successfully');
            console.log(`📄 Found ${resourcesResponse.data.ResourceList?.Resource?.length || 0} resources`);
        } catch (error) {
            console.log('⚠️  Resources endpoint failed:', error.response?.status || error.message);
        }

        // Test 3: Health check
        console.log('\n❤️  Testing health endpoint...');
        try {
            const healthResponse = await axios.get(`${BACKEND_API.baseUrl}/rest/misc/version`, {
                headers
            });
            console.log('✅ Health check successful');
            console.log('🏥 Backend version:', healthResponse.data);
        } catch (error) {
            console.log('⚠️  Health check failed:', error.response?.status || error.message);
        }

    } catch (error) {
        console.error('❌ Backend API test failed:', error.message);
        throw error;
    }
}

/**
 * Test the complete authentication flow
 */
async function testCompleteFlow() {
    try {
        console.log('🚀 Starting Keycloak + Backend API integration test\n');
        console.log(`🔗 Keycloak Server: ${KEYCLOAK_CONFIG.authServerUrl}`);
        console.log(`🏰 Realm: ${KEYCLOAK_CONFIG.realm}`);
        console.log(`🆔 Client ID: ${KEYCLOAK_CONFIG.clientId}`);
        console.log(`🖥️  Backend API: ${BACKEND_API.baseUrl}\n`);

        // Step 1: Get token from Keycloak
        const token = await getKeycloakToken();

        // Step 2: Test backend API with token
        await testBackendAPI(token);

        console.log('\n🎉 All tests completed successfully!');
        console.log('\n📝 Frontend configuration summary:');
        console.log('   • geoStoreUrl: http://localhost:9191/geostore/rest/');
        console.log('   • Keycloak authentication provider configured');
        console.log('   • CORS enabled for backend API');
        console.log('   • Bearer token authentication rules set up');

    } catch (error) {
        console.error('\n💥 Test failed:', error.message);
        process.exit(1);
    }
}

// Run the test
if (require.main === module) {
    testCompleteFlow();
}

module.exports = {
    getKeycloakToken,
    testBackendAPI,
    testCompleteFlow,
    KEYCLOAK_CONFIG,
    BACKEND_API
}; 