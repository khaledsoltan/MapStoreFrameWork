const axios = require('axios');

// Test Keycloak password grant
async function testKeycloakPasswordGrant() {
    const config = {
        authServerUrl: 'https://gisidgw.geosystems-me.com:5443/',
        realm: 'GISID',
        clientId: 'mapstore-client',
        clientSecret: 'hy7rf5rEiDRHreQAlt6zMsizLnvK65Ih'
    };
    
    // Test credentials (replace with actual test user)
    const username = 'testuser';
    const password = 'testpassword';
    
    try {
        console.log('Testing Keycloak password grant...');
        
        const tokenUrl = `${config.authServerUrl}realms/${config.realm}/protocol/openid-connect/token`;
        
        const params = new URLSearchParams();
        params.append('grant_type', 'password');
        params.append('client_id', config.clientId);
        params.append('username', username);
        params.append('password', password);
        
        if (config.clientSecret) {
            params.append('client_secret', config.clientSecret);
        }
        
        console.log('Request URL:', tokenUrl);
        console.log('Request params:', params.toString());
        
        const response = await axios.post(tokenUrl, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        
        console.log('✅ Success! Token received:');
        console.log('Access Token:', response.data.access_token ? 'PRESENT' : 'MISSING');
        console.log('Refresh Token:', response.data.refresh_token ? 'PRESENT' : 'MISSING');
        console.log('Token Type:', response.data.token_type);
        console.log('Expires In:', response.data.expires_in);
        
        // Test userinfo endpoint
        if (response.data.access_token) {
            console.log('\nTesting userinfo endpoint...');
            const userInfoUrl = `${config.authServerUrl}realms/${config.realm}/protocol/openid-connect/userinfo`;
            
            const userResponse = await axios.get(userInfoUrl, {
                headers: {
                    'Authorization': `Bearer ${response.data.access_token}`
                }
            });
            
            console.log('✅ UserInfo received:');
            console.log(JSON.stringify(userResponse.data, null, 2));
        }
        
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
        
        if (error.response?.status === 401) {
            console.log('🔧 This usually means:');
            console.log('   - Invalid username/password');
            console.log('   - Client not configured for password grant');
            console.log('   - User account disabled');
        } else if (error.response?.status === 400) {
            console.log('🔧 This usually means:');
            console.log('   - Invalid client configuration');
            console.log('   - Password grant not enabled for client');
            console.log('   - Missing required parameters');
        }
    }
}

// Only run if this file is executed directly
if (require.main === module) {
    testKeycloakPasswordGrant();
}

module.exports = { testKeycloakPasswordGrant }; 