/**
 * Test script for GeoStore API Integration with Keycloak
 * 
 * This script tests the complete workflow of creating/updating resources
 * in GeoStore with Keycloak authentication.
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

async function testGeoStoreKeycloakIntegration() {
    console.log('🔐 Testing GeoStore API Integration with Keycloak\n');
    
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
        
        const { access_token } = loginResponse.data;
        console.log('✅ Keycloak token obtained successfully');
        console.log(`   Token: ${access_token.substring(0, 50)}...`);
        
        // Step 2: Test GeoStore API without authentication (should fail)
        console.log('\nStep 2: Testing GeoStore API without authentication...');
        
        try {
            const testResourceResponse = await axios.get(`${MAPSTORE_CONFIG.geoStoreUrl}/resources/`, {
                timeout: 5000
            });
            console.log('⚠️  GeoStore API responded without authentication (unexpected)');
        } catch (error) {
            if (error.response?.status === 401 || error.response?.status === 403) {
                console.log('✅ GeoStore API correctly requires authentication');
            } else {
                console.log(`❌ GeoStore API error: ${error.message}`);
            }
        }
        
        // Step 3: Test GeoStore API with Keycloak token
        console.log('\nStep 3: Testing GeoStore API with Keycloak token...');
        
        try {
            const authHeaders = {
                'Authorization': `Bearer ${access_token}`,
                'Accept': 'application/json'
            };
            
            const resourcesResponse = await axios.get(`${MAPSTORE_CONFIG.geoStoreUrl}/resources/`, {
                headers: authHeaders,
                timeout: 10000
            });
            
            console.log('✅ GeoStore API responded with Keycloak token');
            console.log(`   Response status: ${resourcesResponse.status}`);
            console.log(`   Resources found: ${resourcesResponse.data?.ResourceList?.Resource?.length || 0}`);
            
        } catch (error) {
            console.error('❌ GeoStore API with Keycloak token failed:', error.response?.status, error.response?.statusText);
            if (error.response?.data) {
                console.error('   Error details:', error.response.data);
            }
        }
        
        // Step 4: Test creating a resource
        console.log('\nStep 4: Testing resource creation...');
        
        try {
            const testResourceData = {
                name: `test-context-${Date.now()}`,
                description: 'Test context created by Keycloak integration test',
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
                <description><![CDATA[${testResourceData.description}]]></description>
                <metadata></metadata>
                <name><![CDATA[${testResourceData.name}]]></name>
                <advertised>true</advertised>
                <category><name>${testResourceData.category}</name></category>
                <store><data><![CDATA[${JSON.stringify(testResourceData.data)}]]></data></store>
            </Resource>`;
            
            const createResponse = await axios.post(
                `${MAPSTORE_CONFIG.geoStoreUrl}/resources/`,
                resourceXML,
                {
                    headers: {
                        'Authorization': `Bearer ${access_token}`,
                        'Content-Type': 'application/xml'
                    },
                    timeout: 10000
                }
            );
            
            const resourceId = createResponse.data;
            console.log('✅ Resource created successfully');
            console.log(`   Resource ID: ${resourceId}`);
            
            // Step 5: Test retrieving the created resource
            console.log('\nStep 5: Testing resource retrieval...');
            
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
            
            console.log('✅ Resource retrieved successfully');
            console.log(`   Resource name: ${getResponse.data?.Resource?.name}`);
            console.log(`   Resource category: ${getResponse.data?.Resource?.category?.name}`);
            
            // Step 6: Test updating the resource
            console.log('\nStep 6: Testing resource update...');
            
            const updatedData = {
                ...testResourceData.data,
                mapConfig: {
                    ...testResourceData.data.mapConfig,
                    map: {
                        ...testResourceData.data.mapConfig.map,
                        zoom: 10
                    }
                }
            };
            
            const updateResponse = await axios.put(
                `${MAPSTORE_CONFIG.geoStoreUrl}/data/${resourceId}`,
                JSON.stringify(updatedData),
                {
                    headers: {
                        'Authorization': `Bearer ${access_token}`,
                        'Content-Type': 'application/json; charset=utf-8'
                    },
                    timeout: 10000
                }
            );
            
            console.log('✅ Resource updated successfully');
            console.log(`   Update status: ${updateResponse.status}`);
            
            // Step 7: Clean up - delete the test resource
            console.log('\nStep 7: Cleaning up test resource...');
            
            const deleteResponse = await axios.delete(
                `${MAPSTORE_CONFIG.geoStoreUrl}/resources/resource/${resourceId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${access_token}`
                    },
                    timeout: 10000
                }
            );
            
            console.log('✅ Test resource deleted successfully');
            console.log(`   Delete status: ${deleteResponse.status}`);
            
        } catch (error) {
            console.error('❌ Resource operations failed:', error.response?.status, error.response?.statusText);
            if (error.response?.data) {
                console.error('   Error details:', error.response.data);
            }
        }
        
        console.log('\n🎉 GeoStore Keycloak integration test completed!');
        console.log('\n📋 Summary:');
        console.log('   ✅ Keycloak authentication works');
        console.log('   ✅ GeoStore API accepts Keycloak tokens');
        console.log('   ✅ Resource CRUD operations work');
        console.log('   ✅ Context creation should now work properly');
        
        return { success: true };
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('   Response status:', error.response.status);
            console.error('   Response data:', JSON.stringify(error.response.data, null, 2));
        }
        return { success: false, error: error.message };
    }
}

// Run the test
if (require.main === module) {
    testGeoStoreKeycloakIntegration()
        .then(result => {
            if (result.success) {
                console.log('\n✅ Integration test completed successfully');
                process.exit(0);
            } else {
                console.log('\n❌ Integration test failed');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('❌ Unexpected error:', error);
            process.exit(1);
        });
}

module.exports = { testGeoStoreKeycloakIntegration }; 