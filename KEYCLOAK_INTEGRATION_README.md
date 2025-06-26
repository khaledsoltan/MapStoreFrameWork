# MapStore Keycloak Integration Configuration

This document describes the Keycloak integration configuration that has been set up for this MapStore instance.

## Configuration Overview

The integration has been configured to connect MapStore with your Keycloak server:

- **Keycloak Server**: https://gisidgw.geosystems-me.com:5443/
- **Realm**: GISID  
- **Client**: mapstore-client
- **Integration Type**: OpenID Connect with SSO support

## Files Modified

### 1. Frontend Configuration (`web/client/configs/localConfig.json`)

Added `authenticationProviders` section:
```json
"authenticationProviders": [
  {
    "type": "openID",
    "provider": "keycloak",
    "config": {
      "realm": "GISID",
      "auth-server-url": "https://gisidgw.geosystems-me.com:5443/",
      "ssl-required": "external",
      "resource": "mapstore-client",
      "public-client": true,
      "confidential-port": 0
    },
    "sso": {
      "type": "keycloak"
    }
  },
  {
    "type": "basic",
    "provider": "geostore"
  }
]
```

Also added Keycloak server to CORS allowed URLs.

### 2. Backend Configuration (`java/web/src/main/resources/mapstore-ovr.properties`)

Created with Keycloak OAuth2 configuration:
```properties
# Keycloak OAuth2 Configuration
keycloakOAuth2Config.enabled=true
keycloakOAuth2Config.clientId=mapstore-client
keycloakOAuth2Config.clientSecret=hy7rf5rEiDRHreQAlt6zMsizLnvK65Ih
keycloakOAuth2Config.authServerURL=https://gisidgw.geosystems-me.com:5443/
keycloakOAuth2Config.realm=GISID
keycloakOAuth2Config.redirectURI=${mapstore.baseUrl:http://localhost:8080}/mapstore/
keycloakOAuth2Config.autoCreateUser=true
keycloakOAuth2Config.checkTokenEndpointUrl=https://gisidgw.geosystems-me.com:5443/realms/GISID/protocol/openid_connect/userinfo
keycloakOAuth2Config.scopes=openid,profile,email
keycloakOAuth2Config.roleConverter.enabled=true
keycloakOAuth2Config.roleConverter.addEveryOneGroup=true
```

## Deployment Instructions

### 1. Update the Base URL

Before deploying, update the `mapstore.baseUrl` property in `mapstore-ovr.properties` to match your actual deployment URL:

```properties
# For production deployment, change to your actual URL
mapstore.baseUrl=https://your-mapstore-domain.com
```

### 2. Keycloak Client Configuration

Ensure your Keycloak client `mapstore-client` in realm `GISID` is configured with:

- **Client Type**: Public
- **Valid Redirect URIs**: `https://your-mapstore-domain.com/mapstore/*`
- **Web Origins**: `https://your-mapstore-domain.com`
- **Implicit Flow**: Enabled (for SSO)

### 3. Build and Deploy

1. Build the application:
   ```bash
   mvn clean install
   ```

2. Deploy the generated WAR file to your application server (Tomcat, etc.)

3. Ensure the `mapstore-ovr.properties` file is available in:
   - Your application's classpath, OR
   - Your configured data directory

## How It Works

### Authentication Flow

1. **Login Options**: Users will see both Keycloak and GeoStore login options
2. **Keycloak Login**: Redirects to Keycloak server for authentication
3. **SSO Support**: If already logged into Keycloak, automatic login occurs
4. **User Creation**: New users are automatically created in MapStore database
5. **Role Mapping**: Keycloak roles are mapped to MapStore user groups

### Frontend Integration

- Login plugin automatically detects multiple authentication providers
- Users can choose between Keycloak and traditional login
- SSO detection works automatically

### Backend Integration

- Spring Security configuration already includes Keycloak support
- OAuth2 tokens are validated against Keycloak
- User information is synchronized from Keycloak

## Testing the Integration

1. **Build and deploy** the application
2. **Access MapStore** in your browser
3. **Click Login** - you should see authentication options
4. **Choose Keycloak** - should redirect to your Keycloak server
5. **Login with Keycloak credentials** - should return to MapStore logged in
6. **Test SSO** - login to another app in same Keycloak realm, then access MapStore

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure Keycloak server URL is in `useCORS` array
2. **Redirect URI Mismatch**: Verify redirect URIs in Keycloak client match your deployment URL
3. **SSL Issues**: Ensure `ssl-required` setting matches your deployment (external/none/all)
4. **Client Secret**: Ensure the client secret matches between MapStore and Keycloak

### Log Locations

Check these logs for debugging:
- Application server logs (Tomcat catalina.out)
- MapStore application logs
- Keycloak server logs

### Configuration Validation

Verify configuration by checking:
1. `mapstore-ovr.properties` is loaded (check logs)
2. Keycloak client configuration matches
3. Network connectivity to Keycloak server
4. SSL certificates if using HTTPS

## Security Notes

- Client secret is stored in `mapstore-ovr.properties` - secure this file appropriately
- Use HTTPS in production deployments
- Configure proper CORS settings for security
- Review Keycloak security settings and user permissions

## Additional Resources

- [MapStore Keycloak Documentation](https://docs.mapstore.geosolutionsgroup.com/en/latest/developer-guide/integrations/users/keycloak/)
- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [OpenID Connect Specification](https://openid.net/connect/) 