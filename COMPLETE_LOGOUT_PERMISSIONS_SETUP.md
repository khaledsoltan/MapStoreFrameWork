# Complete Logout & Permissions Integration Guide

This guide covers the complete setup for MapStore frontend integration with your backend API, including proper logout flow and permission management.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   MapStore      │    │    Keycloak      │    │   Backend API   │
│   Frontend      │    │    Server        │    │ (localhost:9191)│
│ (localhost:8080)│    │ (gisidgw...:5443)│    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │ 1. Login Request      │                       │
         ├──────────────────────▶│                       │
         │                       │                       │
         │ 2. Access Token       │                       │
         │◀──────────────────────┤                       │
         │                       │                       │
         │ 3. API Calls with Token                       │
         ├─────────────────────────────────────────────▶│
         │                       │                       │
         │ 4. Logout Request     │ 5. Backend Logout     │
         ├──────────────────────▶├─────────────────────▶│
         │                       │                       │
         │ 6. Complete Logout    │                       │
         │◀──────────────────────┤                       │
```

## 🔐 Authentication & Authorization Flow

### Login Process
1. User clicks "Login with Keycloak" in MapStore
2. Redirected to Keycloak authentication
3. After successful login, receives access token
4. Token is used for all API calls to backend
5. User permissions loaded from both Keycloak roles and backend

### Logout Process
1. User clicks logout in MapStore
2. Frontend calls backend logout endpoint
3. Backend invalidates session and cleans up data
4. Frontend clears local storage and session data
5. Redirect to Keycloak logout (single logout)
6. User redirected back to MapStore homepage

## 📂 Configuration Files Summary

### 1. Frontend Configuration (`web/client/configs/localConfig.json`)

```json
{
  "geoStoreUrl": "http://localhost:9191/geostore/rest/",
  "proxyUrl": {
    "useCORS": [
      "https://gisidgw.geosystems-me.com:5443",
      "https://gisidgw.geosystems-me.com:5443/realms/GISID/protocol/openid-connect",
      "http://localhost:9191",
      "http://localhost:9191/geostore"
    ]
  },
  "authenticationRules": [
    {
      "urlPattern": ".*geostore.*",
      "method": "bearer"
    },
    {
      "urlPattern": "http://localhost:9191/.*",
      "method": "bearer"
    }
  ],
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
        "postLogoutRedirectUri": "http://localhost:8080/",
        "scopes": ["openid", "profile", "email"],
        "logoutUrl": "https://gisidgw.geosystems-me.com:5443/realms/GISID/protocol/openid-connect/logout",
        "enableSingleLogout": true,
        "backendLogoutUrl": "http://localhost:9191/geostore/rest/users/user/logout"
      }
    }
  ]
}
```

## 🛠️ Implementation Components

### 1. Enhanced Logout Handler
- **File**: `web/client/components/security/LogoutHandler.jsx`
- **Purpose**: Manages complete logout flow including backend and Keycloak logout
- **Features**: Token cleanup, error handling, notifications

### 2. Permission Management Utilities
- **File**: `web/client/utils/PermissionUtils.js`
- **Purpose**: Handle user roles and permissions from both Keycloak and backend
- **Features**: Role checking, permission validation, UI rule generation

### 3. Enhanced Security Actions
- **File**: `web/client/actions/security.js` (modified)
- **Purpose**: Added `completeLogout` action for full logout flow
- **Features**: Backend logout, Keycloak logout, data cleanup

## 🔑 Permission System

### Role Hierarchy
```
ADMIN (realm-admin, admin)
  ├── Can manage users
  ├── Can manage contexts
  ├── Can access all resources
  └── Can perform all actions

USER (user)
  ├── Can create/edit own maps
  ├── Can view shared resources
  └── Can access basic features

GUEST (guest, unauthenticated)
  └── Can only view public resources
```

### Permission Usage Examples

```javascript
import { usePermissions } from '../utils/PermissionUtils';

const MyComponent = () => {
    const permissions = useSelector(usePermissions());
    
    if (!permissions) return <LoginRequired />;
    
    return (
        <div>
            {permissions.rules.showAdminMenu && (
                <AdminMenu />
            )}
            
            {permissions.rules.showCreateMap && (
                <CreateMapButton />
            )}
            
            {permissions.user.isAdmin && (
                <UserManagementPanel />
            )}
        </div>
    );
};
```

## 🚪 Logout Flow Implementation

### Frontend Usage
```javascript
import LogoutHandler from '../components/security/LogoutHandler';
import { completeLogout } from '../actions/security';

// Option 1: Using LogoutHandler component
<LogoutHandler className="logout-btn">
    Logout
</LogoutHandler>

// Option 2: Using action directly
const handleLogout = () => {
    dispatch(completeLogout('http://localhost:8080/'));
};
```

### Backend Implementation Required
Your backend needs to implement these endpoints:

1. **POST /rest/users/user/logout**
   - Invalidate user session
   - Clean up cached data
   - Return success response

2. **GET /rest/users/user/details**
   - Return user information with roles/permissions
   - Include Keycloak roles and backend permissions

## 🔧 CORS Configuration Requirements

### 1. Keycloak CORS Settings
- **Access**: https://gisidgw.geosystems-me.com:5443/admin
- **Client**: mapstore-client
- **Web Origins**: `http://localhost:8080`, `http://localhost:3000`
- **Valid Redirect URIs**: `http://localhost:8080/*`

### 2. Backend CORS Settings
Your backend must allow:
```
Access-Control-Allow-Origin: http://localhost:8080
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With
Access-Control-Allow-Credentials: true
```

## 🧪 Testing & Validation

### 1. Test CORS Configuration
```bash
node test-cors.js
```

### 2. Test Complete Authentication Flow
```bash
# Update credentials in test file first
node test-backend-keycloak-integration.js
```

### 3. Manual Testing Checklist
- [ ] Login with Keycloak works
- [ ] Token is sent to backend API
- [ ] User permissions are loaded correctly
- [ ] UI elements show/hide based on permissions
- [ ] Logout clears all sessions
- [ ] Single logout works with Keycloak
- [ ] No CORS errors in browser console

## 🔍 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Check Keycloak Web Origins configuration
   - Verify backend CORS headers
   - Ensure all URLs are in CORS whitelist

2. **Logout Not Working**
   - Verify backend logout endpoint exists
   - Check token is being sent correctly
   - Confirm Keycloak logout URL is accessible

3. **Permission Issues**
   - Verify user has correct roles in Keycloak
   - Check role mappings in backend
   - Ensure token contains expected claims

### Debug Commands
```bash
# Check Keycloak configuration
curl "https://gisidgw.geosystems-me.com:5443/realms/GISID/.well-known/openid_configuration"

# Test backend health
curl -H "Origin: http://localhost:8080" "http://localhost:9191/geostore/rest/misc/version"

# Test logout endpoint
curl -X POST -H "Authorization: Bearer TOKEN" "http://localhost:9191/geostore/rest/users/user/logout"
```

## 📋 Deployment Checklist

### Production Setup
- [ ] Update URLs from localhost to production domains
- [ ] Configure HTTPS for all communications
- [ ] Set up proper Keycloak realm configuration
- [ ] Configure backend with production Keycloak settings
- [ ] Test complete flow in production environment
- [ ] Set up monitoring and logging
- [ ] Configure session timeout settings
- [ ] Implement proper error handling

### Security Best Practices
- [ ] Use HTTPS in production
- [ ] Secure client secrets
- [ ] Implement token refresh mechanism
- [ ] Set appropriate CORS policies
- [ ] Monitor for security vulnerabilities
- [ ] Implement audit logging
- [ ] Set up session management
- [ ] Configure proper token expiration

## 📚 Reference Documentation

- [Backend CORS Configuration](./backend-cors-config.md)
- [Keycloak CORS Configuration](./keycloak-cors-config.md)  
- [Backend Logout Implementation](./backend-logout-configuration.md)
- [Complete Integration Guide](./BACKEND_API_KEYCLOAK_SETUP.md)

## 🚀 Next Steps

1. **Implement Backend Logout Endpoint** (see backend-logout-configuration.md)
2. **Configure CORS on Backend** (see backend-cors-config.md)
3. **Configure Keycloak Client Settings** (see keycloak-cors-config.md)
4. **Test Complete Integration** (use provided test scripts)
5. **Deploy to Production** (follow deployment checklist)

Remember to replace all localhost URLs with your actual production domains when deploying! 