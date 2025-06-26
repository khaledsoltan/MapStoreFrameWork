# Keycloak Token Refresh Integration

## Overview

This document explains how the Keycloak token refresh integration works in MapStore to resolve the `403 Forbidden` error when MapStore tries to use the GeoStore refresh endpoint with Keycloak tokens.

## Problem

The original issue was that MapStore was trying to refresh Keycloak tokens using its default GeoStore session refresh endpoint:

```
Request URL: http://localhost:8081/rest/geostore/session/refreshToken
Status Code: 403 Forbidden
Error: "Refresh token was not provided or session is already expired"
```

This happened because MapStore's security system wasn't aware of Keycloak's token management mechanism and was trying to use the wrong refresh endpoint.

## Solution Architecture

The solution implements a layered approach that integrates Keycloak token management with MapStore's existing security system:

### 1. Enhanced Keycloak Session Management (`KeycloakSessionUtils.js`)

**New Methods Added:**
- `isTokenNearExpiry(token, bufferSeconds)` - Checks if token expires within specified time
- `refreshUserInfoFromKeycloak(accessToken)` - Gets fresh user data from Keycloak userinfo endpoint
- Enhanced `refreshAccessToken()` - Properly handles token refresh with user info updates

### 2. Keycloak Security Utils (`KeycloakSecurityUtils.js`) - **NEW FILE**

This utility class provides a bridge between Keycloak token management and MapStore's security system:

```javascript
class KeycloakSecurityUtils {
    static isKeycloakUser() // Detects if current user is Keycloak-authenticated
    static getToken()       // Returns Keycloak token for Keycloak users
    static getRefreshToken() // Returns Keycloak refresh token
    static refreshToken()   // Refreshes using Keycloak endpoint
    static verifySession()  // Verifies session using Keycloak
    static getUserDetails() // Gets user details from Keycloak userinfo
}
```

### 3. Keycloak Security Epics (`keycloakSecurity.js`) - **NEW FILE**

Custom Redux epics that handle Keycloak-specific token management:

- **`keycloakRefreshTokenEpic`** - Intercepts `REFRESH_ACCESS_TOKEN` actions for Keycloak users
- **`keycloakSessionVerificationEpic`** - Verifies Keycloak sessions on app start
- **`keycloakPeriodicRefreshEpic`** - Proactive token refresh before expiration
- **`keycloakSessionExpirationEpic`** - Automatic logout when tokens expire
- **`keycloakUserInfoRefreshEpic`** - Periodic user info updates from Keycloak

### 4. Enhanced Security Actions (`security.js`)

Modified the core security actions to use Keycloak-specific methods:

```javascript
export function refreshAccessToken() {
    return (dispatch) => {
        if (KeycloakSecurityUtils.isKeycloakUser()) {
            // Use Keycloak refresh mechanism
            KeycloakSecurityUtils.refreshToken()...
        } else {
            // Use default MapStore refresh mechanism
            AuthenticationAPI.refreshToken()...
        }
    };
}
```

### 5. Enhanced Security Utils (`SecurityUtils.js`)

Modified token getters to prioritize Keycloak tokens:

```javascript
export function getToken() {
    try {
        const keycloakUtils = getKeycloakSecurityUtils();
        if (keycloakUtils && keycloakUtils.isKeycloakUser()) {
            return keycloakUtils.getToken();
        }
    } catch (error) {
        // Fallback to default
    }
    return getSecurityInfo()?.token;
}
```

## How It Works

### 1. User Detection
When any security operation is performed, the system first checks if the current user is authenticated via Keycloak by examining user attributes:

```javascript
static isKeycloakUser() {
    const user = getUser();
    return user && user.attributes && 
           (user.attributes.authenticated_via === 'password' || 
            user.attributes.realm);
}
```

### 2. Token Refresh Flow

**For Keycloak Users:**
1. Epic intercepts `REFRESH_ACCESS_TOKEN` action
2. Uses `KeycloakSecurityUtils.refreshToken()` instead of GeoStore API
3. Makes request to Keycloak token endpoint: `https://gisidgw.geosystems-me.com:5443/realms/GISID/protocol/openid-connect/token`
4. Updates user info from Keycloak userinfo endpoint
5. Dispatches `loginSuccess` with updated tokens and user data

**For Regular Users:**
1. Falls back to default MapStore refresh mechanism
2. Uses GeoStore API as normal

### 3. Proactive Token Management

The system includes several proactive mechanisms:

- **Periodic Refresh**: Checks token expiration every 5 minutes (configurable)
- **Near-Expiry Refresh**: Refreshes tokens 2 minutes before expiration
- **Session Validation**: Verifies session on app start and periodically
- **Automatic Logout**: Logs out when both access and refresh tokens expire

### 4. Configuration

Added to `localConfig.json`:
```json
{
  "tokenRefreshInterval": 120000,  // 2 minutes
  "authenticationProviders": [
    {
      "type": "keycloak-direct",
      "provider": "keycloak",
      // ... keycloak config
    }
  ]
}
```

## Epic Integration

The new epics are integrated into the main application (`product/main.jsx`):

```javascript
import { 
    keycloakRefreshTokenEpic, 
    keycloakSessionVerificationEpic, 
    keycloakPeriodicRefreshEpic,
    keycloakSessionExpirationEpic,
    keycloakUserInfoRefreshEpic 
} from '../epics/keycloakSecurity';

const appEpics = {
    // ... existing epics
    keycloakRefreshTokenEpic,
    keycloakSessionVerificationEpic,
    keycloakPeriodicRefreshEpic,
    keycloakSessionExpirationEpic,
    keycloakUserInfoRefreshEpic
};
```

## Benefits

1. **Eliminates 403 Errors**: No more calls to GeoStore refresh endpoint for Keycloak users
2. **Proper Token Management**: Uses correct Keycloak endpoints for token operations
3. **Seamless Integration**: Existing MapStore code continues to work without changes
4. **Enhanced Security**: Proper session management with automatic logout on expiration
5. **Real-time Updates**: User info and privileges updated from Keycloak regularly
6. **Backward Compatibility**: Standard MapStore authentication still works for non-Keycloak users

## Testing

Use the provided test script to verify functionality:

```bash
node test-keycloak-refresh.js
```

This script tests:
- Username/password authentication
- Token parsing and claims extraction
- Userinfo endpoint access
- Token refresh mechanism
- Token expiration logic
- MapStore endpoint isolation

## Troubleshooting

### Common Issues

1. **Still getting 403 errors**
   - Check that user attributes include `authenticated_via` or `realm`
   - Verify Keycloak configuration in `localConfig.json`
   - Check browser console for Keycloak detection logs

2. **Tokens not refreshing**
   - Verify refresh token is not expired
   - Check Keycloak server connectivity
   - Review token refresh interval configuration

3. **User info not updating**
   - Check Keycloak userinfo endpoint accessibility
   - Verify token permissions for userinfo access
   - Review user info refresh epic logs

### Debug Logs

The integration includes comprehensive logging:

```javascript
console.log('Keycloak refresh token requested');
console.log('Keycloak token refreshed successfully');
console.log('User details refreshed:', userDetails);
```

Look for these logs in the browser console to trace token refresh operations.

## Security Considerations

1. **Token Storage**: Tokens are stored in localStorage/sessionStorage as before
2. **Automatic Cleanup**: Tokens are cleared on logout and expiration
3. **Secure Communication**: All Keycloak communication uses HTTPS
4. **Privilege Updates**: User privileges are refreshed from Keycloak regularly
5. **Session Validation**: Periodic session validation prevents stale sessions

## Future Enhancements

1. **Token Encryption**: Encrypt tokens in browser storage
2. **Background Refresh**: Implement background token refresh using Web Workers
3. **Multiple Realms**: Support for multiple Keycloak realms
4. **SSO Integration**: Enhanced SSO support with automatic login
5. **Audit Logging**: Comprehensive audit logging for security events 