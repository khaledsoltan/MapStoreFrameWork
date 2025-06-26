# 🎯 Embedded Keycloak Login Setup Guide

This guide configures Keycloak login to appear **within MapStore's login form** instead of redirecting to Keycloak.

## 🎨 User Experience

- Users see MapStore's login page with **two options**:
  1. **"Login with Keycloak"** - authenticates via Keycloak
  2. **"Standard Login"** - traditional username/password

## 🔧 Configuration Steps

### Step 1: Create Keycloak Clients

Create **2 clients** in GISID realm:

#### Client 1: mapstore-server
```
Client ID: mapstore-server
Access Type: confidential
Standard Flow Enabled: ON
Direct Access Grants Enabled: ON
Valid Redirect URIs: http://localhost:8081/mapstore/rest/geostore/openid/keycloak/callback
Web Origins: http://localhost:8081
```

#### Client 2: mapstore-client  
```
Client ID: mapstore-client
Access Type: public
Standard Flow Enabled: ON
Direct Access Grants Enabled: ON
Implicit Flow Enabled: ON
Valid Redirect URIs: http://localhost:8081/mapstore/*
Web Origins: http://localhost:8081
```

### Step 2: Configure CORS

In **both clients** → **Advanced Settings**:
```
Web Origins: http://localhost:8081
```

### Step 3: Set System Property

Add JVM parameter:
```bash
-Dsecurity.integration=keycloak-direct
```

### Step 4: Build and Deploy

```bash
mvn clean install
# Restart with system property
```

## 🎯 Login Flow

1. **User clicks Login** → MapStore login form appears
2. **Two options shown**:
   - "Login with Keycloak" button
   - Traditional username/password fields
3. **Keycloak option** → Authenticates via Keycloak API
4. **Success** → User logged into MapStore

## ✅ Expected Result

- **Embedded login experience**
- **Same MapStore design**
- **Choice between Keycloak and traditional login**
- **No redirect to external Keycloak page**

## 🔍 Troubleshooting

**Issue**: Still redirects to Keycloak
- **Solution**: Check CORS settings in Keycloak clients
- **Solution**: Verify Direct Access Grants enabled

**Issue**: Login buttons not showing
- **Solution**: Check `showInLoginForm: true` in config
- **Solution**: Verify authenticationProviders configuration

**Issue**: CORS errors
- **Solution**: Add Web Origins in Keycloak clients
- **Solution**: Check enable-cors settings

## 🎨 Customization

You can customize the login form by:
- Changing `title` in authenticationProviders
- Adding custom `imageURL` for logos
- Modifying button styles via CSS
- Adding additional authentication providers

---

This configuration provides embedded Keycloak authentication within MapStore's native login interface! 