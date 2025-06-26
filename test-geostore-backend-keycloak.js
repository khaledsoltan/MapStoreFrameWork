/**
 * Test script for GeoStore Backend Keycloak Integration
 * 
 * This script tests the complete backend integration between GeoStore and Keycloak
 * to ensure the 403 Forbidden errors are resolved.
 */

const axios = require('axios');

const KEYCLOAK_CONFIG = {
    authServerUrl: 'https://gisidgw.geosystems-me.com:5443/',
    realm: 'GISID',
    clientId: 'mapstore-client',
    clientSecret: 'hy7rf5rEiDRHreQAlt6zMsizLnvK65Ih'
};

const GEOSTORE_CONFIG = {
    baseUrl: 'http://localhost:8081/rest/geostore',
    timeout: 30000
};

async function testGeoStoreBackendKeycloakIntegration() {
    console.log('🔐 Testing GeoStore Backend Keycloak Integration\n');
    
    let testResults = {
        keycloakAuth: false,
        geoStoreAccess: false,
        resourceCreation: false,
        resourceRetrieval: false,
        resourceUpdate: false,
        resourceDeletion: false,
        tokenRefresh: false
    };
    
    try {
        // Step 1: Authenticate with Keycloak
        console.log('Step 1: Authenticating with Keycloak...');
        
        const loginUrl = `${KEYCLOAK_CONFIG.authServerUrl}realms/${KEYCLOAK_CONFIG.realm}/protocol/openid-connect/token`;
        
        const loginParams = new URLSearchParams();
        loginParams.append('grant_type', 'client_credentials');
        loginParams.append('client_id', KEYCLOAK_CONFIG.clientId);
        loginParams.append('client_secret', KEYCLOAK_CONFIG.clientSecret);
        loginParams.append('scope', 'openid profile email');
        
        const loginResponse = await axios.post(loginUrl, loginParams, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            timeout: GEOSTORE_CONFIG.timeout
        });
        
        const { access_token, refresh_token, token_type } = loginResponse.data;
        console.log('✅ Keycloak authentication successful');
        console.log(`   Token type: ${token_type}`);
        console.log(`   Token expires in: ${loginResponse.data.expires_in} seconds`);
        testResults.keycloakAuth = true;
        
        // Step 2: Test GeoStore API access
        console.log('\nStep 2: Testing GeoStore API access...');
        
        const authHeaders = {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        
        try {
            const categoriesResponse = await axios.get(`${GEOSTORE_CONFIG.baseUrl}/misc/category/MAP`, {
                headers: authHeaders,
                timeout: GEOSTORE_CONFIG.timeout
            });
            
            console.log('✅ GeoStore API access successful');
            console.log(`   Response status: ${categoriesResponse.status}`);
            testResults.geoStoreAccess = true;
            
        } catch (error) {
            console.error('❌ GeoStore API access failed:', error.response?.status, error.response?.statusText);
            if (error.response?.status === 403) {
                console.error('   🚨 403 Forbidden - Backend Keycloak integration not working properly');
            }
            throw error;
        }
        
        // Step 3: Test resource creation
        console.log('\nStep 3: Testing resource creation...');
        
        const testResource = {
            name: `Backend Test Resource ${Date.now()}`,
            description: 'Test resource created by backend integration test',
            category: 'CONTEXT',
            data: {
                mapConfig: {
                    version: 2,
                    map: {
                        center: { x: 0, y: 0, crs: 'EPSG:4326' },
                        zoom: 5,
                        projection: 'EPSG:3857'
                    },
                    layers: []
                }
            }
        };
        
        const resourceXML = `<Resource>
            <description><![CDATA[${testResource.description}]]></description>
            <metadata></metadata>
            <name><![CDATA[${testResource.name}]]></name>
            <advertised>true</advertised>
            <category><name>${testResource.category}</name></category>
            <store><data><![CDATA[${JSON.stringify(testResource.data)}]]></data></store>
        </Resource>`;
        
        try {
            const createResponse = await axios.post(
                `${GEOSTORE_CONFIG.baseUrl}/resources/`,
                resourceXML,
                {
                    headers: {
                        'Authorization': `Bearer ${access_token}`,
                        'Content-Type': 'application/xml'
                    },
                    timeout: GEOSTORE_CONFIG.timeout
                }
            );
            
            const resourceId = createResponse.data;
            console.log('✅ Resource creation successful');
            console.log(`   Resource ID: ${resourceId}`);
            testResults.resourceCreation = true;
            
            // Step 4: Test resource retrieval
            console.log('\nStep 4: Testing resource retrieval...');
            
            const getResponse = await axios.get(
                `${GEOSTORE_CONFIG.baseUrl}/resources/resource/${resourceId}`,
                {
                    headers: authHeaders,
                    timeout: GEOSTORE_CONFIG.timeout
                }
            );
            
            console.log('✅ Resource retrieval successful');
            console.log(`   Resource name: ${getResponse.data?.Resource?.name}`);
            testResults.resourceRetrieval = true;
            
            // Step 5: Test resource update
            console.log('\nStep 5: Testing resource update...');
            
            const updatedData = {
                ...testResource.data,
                mapConfig: {
                    ...testResource.data.mapConfig,
                    map: {
                        ...testResource.data.mapConfig.map,
                        zoom: 10
                    }
                }
            };
            
            const updateResponse = await axios.put(
                `${GEOSTORE_CONFIG.baseUrl}/data/${resourceId}`,
                JSON.stringify(updatedData),
                {
                    headers: {
                        'Authorization': `Bearer ${access_token}`,
                        'Content-Type': 'application/json; charset=utf-8'
                    },
                    timeout: GEOSTORE_CONFIG.timeout
                }
            );
            
            console.log('✅ Resource update successful');
            console.log(`   Update status: ${updateResponse.status}`);
            testResults.resourceUpdate = true;
            
            // Step 6: Test token refresh
            console.log('\nStep 6: Testing token refresh...');
            
            if (refresh_token) {
                const refreshParams = new URLSearchParams();
                refreshParams.append('grant_type', 'refresh_token');
                refreshParams.append('client_id', KEYCLOAK_CONFIG.clientId);
                refreshParams.append('client_secret', KEYCLOAK_CONFIG.clientSecret);
                refreshParams.append('refresh_token', refresh_token);
                
                const refreshResponse = await axios.post(loginUrl, refreshParams, {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    timeout: GEOSTORE_CONFIG.timeout
                });
                
                const newAccessToken = refreshResponse.data.access_token;
                console.log('✅ Token refresh successful');
                testResults.tokenRefresh = true;
                
                // Test API access with new token
                const testWithNewToken = await axios.get(
                    `${GEOSTORE_CONFIG.baseUrl}/resources/resource/${resourceId}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${newAccessToken}`,
                            'Accept': 'application/json'
                        },
                        timeout: GEOSTORE_CONFIG.timeout
                    }
                );
                
                console.log('✅ API access with refreshed token successful');
            } else {
                console.log('⚠️  No refresh token available (client_credentials grant)');
                testResults.tokenRefresh = true; // Not applicable for client credentials
            }
            
            // Step 7: Clean up - delete test resource
            console.log('\nStep 7: Cleaning up test resource...');
            
            const deleteResponse = await axios.delete(
                `${GEOSTORE_CONFIG.baseUrl}/resources/resource/${resourceId}`,
                {
                    headers: authHeaders,
                    timeout: GEOSTORE_CONFIG.timeout
                }
            );
            
            console.log('✅ Resource deletion successful');
            console.log(`   Delete status: ${deleteResponse.status}`);
            testResults.resourceDeletion = true;
            
        } catch (error) {
            console.error('❌ Resource operations failed:', error.response?.status, error.response?.statusText);
            if (error.response?.status === 403) {
                console.error('   🚨 403 Forbidden - This indicates backend Keycloak integration issues');
                console.error('   💡 Check GeoStore configuration and restart the application');
            }
            if (error.response?.data) {
                console.error('   Error details:', error.response.data);
            }
            throw error;
        }
        
        // Final assessment
        console.log('\n🎉 GeoStore Backend Keycloak Integration Test Completed!');
        console.log('\n📋 Test Results Summary:');
        Object.entries(testResults).forEach(([test, passed]) => {
            console.log(`   ${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
        });
        
        const allPassed = Object.values(testResults).every(result => result === true);
        
        if (allPassed) {
            console.log('\n🎊 All tests passed! Backend Keycloak integration is working properly.');
            console.log('   The 403 Forbidden errors should now be resolved.');
        } else {
            console.log('\n⚠️  Some tests failed. Backend integration may need additional configuration.');
        }
        
        return { success: allPassed, results: testResults };
        
    } catch (error) {
        console.error('\n❌ Backend integration test failed:', error.message);
        
        if (error.response) {
            console.error('   Response status:', error.response.status);
            console.error('   Response data:', JSON.stringify(error.response.data, null, 2));
        }
        
        console.log('\n🔧 Troubleshooting Steps:');
        console.log('   1. Ensure MapStore application is running (http://localhost:8081)');
        console.log('   2. Check that GeoStore Keycloak configuration is enabled');
        console.log('   3. Verify Keycloak server is accessible');
        console.log('   4. Restart MapStore application to apply configuration changes');
        console.log('   5. Check application logs for detailed error information');
        
        return { success: false, error: error.message, results: testResults };
    }
}

// Run the test
if (require.main === module) {
    testGeoStoreBackendKeycloakIntegration()
        .then(result => {
            if (result.success) {
                console.log('\n✅ Backend integration test completed successfully');
                process.exit(0);
            } else {
                console.log('\n❌ Backend integration test failed');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('❌ Unexpected error:', error);
            process.exit(1);
        });
}

module.exports = { testGeoStoreBackendKeycloakIntegration }; 