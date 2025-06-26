#!/usr/bin/env node

/**
 * CORS Test Script
 * Tests CORS configuration for Keycloak and Backend API
 */

const axios = require('axios');

const endpoints = {
    keycloak: {
        discovery: 'https://gisidgw.geosystems-me.com:5443/realms/GISID/.well-known/openid_configuration',
        token: 'https://gisidgw.geosystems-me.com:5443/realms/GISID/protocol/openid-connect/token'
    },
    backend: {
        health: 'http://localhost:9191/geostore/rest/misc/version',
        resources: 'http://localhost:9191/geostore/rest/resources'
    }
};

async function testCORS(url, method = 'GET') {
    try {
        console.log(`\n🔗 Testing ${method} ${url}`);
        
        const config = {
            method: method.toLowerCase(),
            url: url,
            headers: {
                'Origin': 'http://localhost:8080'
            },
            timeout: 5000
        };

        if (method === 'OPTIONS') {
            config.headers['Access-Control-Request-Method'] = 'GET';
            config.headers['Access-Control-Request-Headers'] = 'Authorization,Content-Type';
        }

        const response = await axios(config);
        
        console.log(`✅ Status: ${response.status}`);
        
        // Check CORS headers
        const corsHeaders = {
            'access-control-allow-origin': response.headers['access-control-allow-origin'],
            'access-control-allow-credentials': response.headers['access-control-allow-credentials'],
            'access-control-allow-methods': response.headers['access-control-allow-methods'],
            'access-control-allow-headers': response.headers['access-control-allow-headers']
        };
        
        Object.entries(corsHeaders).forEach(([key, value]) => {
            if (value) {
                console.log(`🔒 ${key}: ${value}`);
            }
        });
        
        return true;
    } catch (error) {
        console.log(`❌ Failed: ${error.response?.status || error.code || error.message}`);
        if (error.response?.data) {
            console.log(`📄 Response: ${JSON.stringify(error.response.data)}`);
        }
        return false;
    }
}

async function runCORSTests() {
    console.log('🚀 Starting CORS Configuration Tests\n');
    console.log('Testing from Origin: http://localhost:8080\n');
    
    let passedTests = 0;
    let totalTests = 0;
    
    // Test Keycloak endpoints
    console.log('=== KEYCLOAK ENDPOINTS ===');
    
    totalTests++;
    if (await testCORS(endpoints.keycloak.discovery, 'GET')) passedTests++;
    
    totalTests++;
    if (await testCORS(endpoints.keycloak.token, 'OPTIONS')) passedTests++;
    
    // Test Backend API endpoints
    console.log('\n=== BACKEND API ENDPOINTS ===');
    
    totalTests++;
    if (await testCORS(endpoints.backend.health, 'GET')) passedTests++;
    
    totalTests++;
    if (await testCORS(endpoints.backend.health, 'OPTIONS')) passedTests++;
    
    totalTests++;
    if (await testCORS(endpoints.backend.resources, 'OPTIONS')) passedTests++;
    
    // Summary
    console.log('\n=== SUMMARY ===');
    console.log(`✅ Passed: ${passedTests}/${totalTests} tests`);
    
    if (passedTests === totalTests) {
        console.log('🎉 All CORS tests passed!');
        console.log('\n📝 Next steps:');
        console.log('   • Start MapStore: npm start');
        console.log('   • Test login flow in browser');
    } else {
        console.log('⚠️  Some CORS tests failed. Please check:');
        console.log('   • Keycloak client configuration (Web Origins)');
        console.log('   • Backend API CORS settings');
        console.log('   • Network connectivity');
        
        console.log('\n🔧 To fix CORS issues:');
        console.log('   • See: keycloak-cors-config.md');
        console.log('   • See: backend-cors-config.md');
    }
}

if (require.main === module) {
    runCORSTests().catch(console.error);
}

module.exports = { testCORS, runCORSTests }; 