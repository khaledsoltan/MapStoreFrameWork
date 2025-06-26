# MapStore Frontend + Backend API Keycloak Integration

This guide explains how to configure MapStore frontend to work with your existing backend API that's integrated with Keycloak.

## Configuration Overview

- **Backend API**: `http://localhost:9191/geostore` (already integrated with Keycloak)
- **Keycloak Server**: `https://gisidgw.geosystems-me.com:5443`
- **Realm**: `GISID`
- **Client ID**: `mapstore-client`
- **Client Secret**: `hy7rf5rEiDRHreQAlt6zMsizLnvK65Ih`

## Frontend Configuration

The MapStore frontend has been configured with the following changes in `web/client/configs/localConfig.json`:

### 1. Backend API URL
```json
{
  "geoStoreUrl": "http://localhost:9191/geostore/rest/"
}
```

### 2. CORS Configuration
```json
{
  "proxyUrl": {
    "useCORS": [
      "https://gisidgw.geosystems-me.com:5443",
      "http://localhost:9191"
    ]
  }
}
```

### 3. Authentication Rules
```json
{
  "authenticationRules": [
    {
      "urlPattern": ".*geostore.*",
      "method": "bearer"
    },
    {
      "urlPattern": "http://localhost:9191/.*",
      "method": "bearer"
    }
  ]
}
```

### 4. Keycloak Authentication Provider
```json
{
  "authenticationProviders": [
    {
      "type": "keycloak",
      "provider": "keycloak",
      "title": "Login with Keycloak",
      "showInLoginForm": true,
      "config": {
        "authServerUrl": "https://gisidgw.geosystems-me.com:5443/",
        "realm": "GISID",
        "clientId": "mapstore-client",
        "clientSecret": "hy7rf5rEiDRHreQAlt6zMsizLnvK65Ih",
        "redirectUri": "http://localhost:8080/",
        "scopes": ["openid", "profile", "email"]
      }
    }
  ]
}
```

## Authentication Flow

1. **User Login**: User clicks "Login with Keycloak" in MapStore UI
2. **Keycloak Authentication**: User is redirected to Keycloak login page
3. **Token Retrieval**: After successful login, Keycloak returns access token
4. **API Communication**: MapStore uses the Bearer token for all API calls to your backend
5. **Backend Validation**: Your backend validates the token with Keycloak and returns data

## Testing the Integration

### Prerequisites
1. Ensure your backend API is running on `http://localhost:9191`
2. Ensure Keycloak server is accessible at `https://gisidgw.geosystems-me.com:5443`
3. Have test user credentials ready

### Test Script
Run the provided test script to verify the integration:

```bash
# Install dependencies if needed
npm install axios

# Run the test (update TEST_USER credentials in the script first)
node test-backend-keycloak-integration.js
```

### Manual Testing
1. Start MapStore frontend:
   ```bash
   npm start
   ```

2. Open browser and navigate to `http://localhost:8080`

3. Click "Login with Keycloak" button

4. Complete authentication on Keycloak

5. Verify that MapStore can load resources from your backend API

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure your backend API allows CORS from `http://localhost:8080`
   - Check that Keycloak allows the redirect URI

2. **Token Validation Errors**
   - Verify that your backend is properly validating Keycloak tokens
   - Check that the realm and client configuration match

3. **Network Connectivity**
   - Ensure all services are running and accessible
   - Check firewall/proxy settings

### Debug Tips

1. **Check Browser Network Tab**
   - Look for failed requests to backend API
   - Verify that Authorization headers are being sent

2. **Backend Logs**
   - Check your backend API logs for authentication errors
   - Verify token validation is working

3. **Keycloak Admin Console**
   - Check client configuration in Keycloak admin
   - Verify user has appropriate roles/permissions

## API Endpoints

Your backend should expose these endpoints (examples):

- `GET /rest/users/user/details` - Get current user information
- `GET /rest/resources` - Get user's resources/maps
- `GET /rest/misc/version` - Health check endpoint

All endpoints should accept Bearer token authentication:
```
Authorization: Bearer <access_token>
```

## Security Considerations

1. **Client Secret**: Keep the client secret secure in production
2. **HTTPS**: Use HTTPS in production for all communications
3. **Token Refresh**: Implement token refresh logic for long-running sessions
4. **CORS**: Configure CORS properly to allow only trusted origins

## Next Steps

1. Test the integration with your actual user credentials
2. Implement proper error handling for authentication failures
3. Configure token refresh mechanism if needed
4. Set up production environment with HTTPS 