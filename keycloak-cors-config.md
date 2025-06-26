# Keycloak CORS Configuration

To allow MapStore frontend to authenticate with Keycloak, you need to configure CORS settings in Keycloak Admin Console.

## Access Keycloak Admin Console

1. Go to: https://gisidgw.geosystems-me.com:5443/admin
2. Login with admin credentials
3. Select the **GISID** realm

## Configure Client CORS Settings

### For mapstore-client:

1. Go to **Clients** → **mapstore-client**
2. In the **Settings** tab, scroll down to **Access settings**:
   
   ```
   Valid redirect URIs: 
   - http://localhost:8080/*
   - http://localhost:3000/*
   
   Valid post logout redirect URIs:
   - http://localhost:8080/*
   - http://localhost:3000/*
   
   Web origins:
   - http://localhost:8080
   - http://localhost:3000
   - +
   ```

3. Set **Access Type**: `public` (for frontend client)
4. Enable **Standard Flow Enabled**: `ON`
5. Enable **Direct Access Grants Enabled**: `ON` (for testing)
6. Save the configuration

## Configure Realm CORS Settings

1. Go to **Realm Settings** → **Security Defenses**
2. Configure **CORS**:
   ```
   CORS Allowed Origins: 
   - http://localhost:8080
   - http://localhost:3000
   
   CORS Allowed Methods:
   - GET
   - POST
   - PUT
   - DELETE
   - OPTIONS
   
   CORS Allowed Headers:
   - Authorization
   - Content-Type
   - X-Requested-With
   - Accept
   
   CORS Max Age: 86400
   ```

## Test Keycloak CORS

Test if Keycloak CORS is working:

```bash
# Test OpenID Connect discovery endpoint
curl -X GET \
  -H "Origin: http://localhost:8080" \
  -v \
  "https://gisidgw.geosystems-me.com:5443/realms/GISID/.well-known/openid_configuration"

# Test token endpoint (OPTIONS preflight)
curl -X OPTIONS \
  -H "Origin: http://localhost:8080" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  -v \
  "https://gisidgw.geosystems-me.com:5443/realms/GISID/protocol/openid-connect/token"
```

Expected response headers:
```
access-control-allow-origin: http://localhost:8080
access-control-allow-credentials: true
access-control-allow-methods: GET,POST,OPTIONS
access-control-max-age: 86400
```

## Client Configuration Summary

Make sure you have these clients configured in Keycloak:

### mapstore-client (Frontend)
- **Access Type**: Public
- **Standard Flow**: Enabled
- **Valid Redirect URIs**: http://localhost:8080/*
- **Web Origins**: http://localhost:8080

### mapstore-server (Backend - if needed)
- **Access Type**: Confidential  
- **Service Accounts**: Enabled
- **Client Secret**: hy7rf5rEiDRHreQAlt6zMsizLnvK65Ih 