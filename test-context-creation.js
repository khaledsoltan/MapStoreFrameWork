/**
 * Test script for Context Creation with Keycloak
 * 
 * This script simulates the context creation process to verify
 * that session expiration issues are resolved.
 */

const axios = require('axios');

const KEYCLOAK_CONFIG = {
    authServerUrl: 'https://gisidgw.geosystems-me.com:5443/',
    realm: 'GISID',
    clientId: 'mapstore-client',
    clientSecret: 'hy7rf5rEiDRHreQAlt6zMsizLnvK65Ih'
};

const MAPSTORE_CONFIG = {
    baseUrl: 'http://localhost:8081',
    geoStoreUrl: 'http://localhost:8081/rest/geostore'
};

async function testContextCreation() {
    console.log('🔐 Testing Context Creation with Keycloak Authentication\n');
    
    try {
        // Step 1: Get Keycloak token
        console.log('Step 1: Obtaining Keycloak access token...');
        
        const loginUrl = `${KEYCLOAK_CONFIG.authServerUrl}realms/${KEYCLOAK_CONFIG.realm}/protocol/openid-connect/token`;
        
        const loginParams = new URLSearchParams();
        loginParams.append('grant_type', 'client_credentials');
        loginParams.append('client_id', KEYCLOAK_CONFIG.clientId);
        loginParams.append('client_secret', KEYCLOAK_CONFIG.clientSecret);
        loginParams.append('scope', 'openid');
        
        const loginResponse = await axios.post(loginUrl, loginParams, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        
        const { access_token, refresh_token } = loginResponse.data;
        console.log('✅ Keycloak token obtained successfully');
        
        // Step 2: Create a test context
        console.log('\nStep 2: Creating test context...');
        
        const contextData = {
            name: `Test Context ${Date.now()}`,
            windowTitle: 'Test Context Window',
            description: 'Test context created to verify session handling',
            mapConfig: {
                version: 2,
                map: {
                    center: { x: 0, y: 0, crs: 'EPSG:4326' },
                    zoom: 5,
                    projection: 'EPSG:3857'
                },
                layers: []
            },
            pluginsConfig: {
                desktop: [],
                mobile: []
            }
        };
        
        const resourceXML = `<Resource>
            <description><![CDATA[${contextData.description}]]></description>
            <metadata></metadata>
            <name><![CDATA[${contextData.name}]]></name>
            <advertised>true</advertised>
            <category><name>CONTEXT</name></category>
            <store><data><![CDATA[${JSON.stringify(contextData)}]]></data></store>
        </Resource>`;
        
        const createResponse = await axios.post(
            `${MAPSTORE_CONFIG.geoStoreUrl}/resources/`,
            resourceXML,
            {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/xml'
                },
                timeout: 30000 // 30 second timeout
            }
        );
        
        const resourceId = createResponse.data;
        console.log('✅ Context created successfully');
        console.log(`   Resource ID: ${resourceId}`);
        
        // Step 3: Verify the context was created
        console.log('\nStep 3: Verifying context creation...');
        
        const getResponse = await axios.get(
            `${MAPSTORE_CONFIG.geoStoreUrl}/resources/resource/${resourceId}`,
            {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Accept': 'application/json'
                },
                timeout: 10000
            }
        );
        
        console.log('✅ Context verified successfully');
        console.log(`   Context name: ${getResponse.data?.Resource?.name}`);
        console.log(`   Context category: ${getResponse.data?.Resource?.category?.name}`);
        
        // Step 4: Test token refresh scenario
        console.log('\nStep 4: Testing token refresh scenario...');
        
        // Simulate a token refresh
        const refreshParams = new URLSearchParams();
        refreshParams.append('grant_type', 'refresh_token');
        refreshParams.append('client_id', KEYCLOAK_CONFIG.clientId);
        refreshParams.append('client_secret', KEYCLOAK_CONFIG.clientSecret);
        refreshParams.append('refresh_token', refresh_token);
        
        const refreshResponse = await axios.post(loginUrl, refreshParams, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        
        const newAccessToken = refreshResponse.data.access_token;
        console.log('✅ Token refresh successful');
        
        // Step 5: Test context update with new token
        console.log('\nStep 5: Testing context update with refreshed token...');
        
        const updatedContextData = {
            ...contextData,
            description: 'Updated context description after token refresh',
            mapConfig: {
                ...contextData.mapConfig,
                map: {
                    ...contextData.mapConfig.map,
                    zoom: 10
                }
            }
        };
        
        const updateResponse = await axios.put(
            `${MAPSTORE_CONFIG.geoStoreUrl}/data/${resourceId}`,
            JSON.stringify(updatedContextData),
            {
                headers: {
                    'Authorization': `Bearer ${newAccessToken}`,
                    'Content-Type': 'application/json; charset=utf-8'
                },
                timeout: 10000
            }
        );
        
        console.log('✅ Context updated successfully with refreshed token');
        console.log(`   Update status: ${updateResponse.status}`);
        
        // Step 6: Clean up
        console.log('\nStep 6: Cleaning up test context...');
        
        const deleteResponse = await axios.delete(
            `${MAPSTORE_CONFIG.geoStoreUrl}/resources/resource/${resourceId}`,
            {
                headers: {
                    'Authorization': `Bearer ${newAccessToken}`
                },
                timeout: 10000
            }
        );
        
        console.log('✅ Test context deleted successfully');
        
        console.log('\n🎉 Context Creation Test Completed Successfully!');
        console.log('\n📋 Test Results:');
        console.log('   ✅ Keycloak authentication works');
        console.log('   ✅ Context creation succeeds');
        console.log('   ✅ Token refresh works');
        console.log('   ✅ Context updates work after token refresh');
        console.log('   ✅ No session expiration issues detected');
        
        return { success: true, resourceId };
        
    } catch (error) {
        console.error('❌ Context creation test failed:', error.message);
        
        if (error.response) {
            console.error('   Response status:', error.response.status);
            console.error('   Response data:', JSON.stringify(error.response.data, null, 2));
            
            if (error.response.status === 401 || error.response.status === 403) {
                console.error('   🚨 Authentication error detected - this indicates the session expiration issue');
            }
        }
        
        return { success: false, error: error.message };
    }
}

// Run the test
if (require.main === module) {
    testContextCreation()
        .then(result => {
            if (result.success) {
                console.log('\n✅ Context creation test completed successfully');
                console.log('   The session expiration issue should now be resolved!');
                process.exit(0);
            } else {
                console.log('\n❌ Context creation test failed');
                console.log('   Session expiration issues may still exist');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('❌ Unexpected error:', error);
            process.exit(1);
        });
}

module.exports = { testContextCreation }; 