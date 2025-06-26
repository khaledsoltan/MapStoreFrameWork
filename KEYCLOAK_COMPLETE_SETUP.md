# 🔐 Complete Keycloak Integration Setup Guide

This guide provides step-by-step instructions for setting up complete Keycloak integration with MapStore, including OpenID authentication, SSO, and direct user integration.

## 🎯 Overview

This setup provides:
- **OpenID Connect Authentication** via Keycloak
- **Single Sign-On (SSO)** with other applications
- **Direct User Integration** (no local database for users/groups)
- **Role/Group Mapping** from Keycloak to MapStore

## 📋 Prerequisites

- Keycloak server running at: `https://gisidgw.geosystems-me.com:5443/`
- MapStore running at: `http://localhost:8081/mapstore/`
- Admin access to Keycloak
- Realm `GISID` must exist in Keycloak

## 🔧 Step-by-Step Setup

### Step 1: Create THREE Keycloak Clients

You need to create **3 clients** in your **GISID realm**:

#### 1.1 Create `mapstore-server` (Backend OpenID)
```
Client ID: mapstore-server
Client Type: OpenID Connect
Access Type: confidential
Standard Flow Enabled: ON
Direct Access Grants Enabled: ON
Valid Redirect URIs: http://localhost:8081/mapstore/rest/geostore/openid/keycloak/callback
```

**Action**: Copy the **Client Secret** from Credentials tab.

#### 1.2 Create `mapstore-client` (Frontend SSO)
```
Client ID: mapstore-client
Client Type: OpenID Connect  
Access Type: public
Standard Flow Enabled: ON
Implicit Flow Enabled: ON
Valid Redirect URIs: http://localhost:8081/mapstore/*
Web Origins: http://localhost:8081
```

**Action**: Go to Installation tab → Select "Keycloak OIDC JSON" → Copy the JSON.

#### 1.3 Create `mapstore-users` (REST API Access)
```
Client ID: mapstore-users
Client Type: OpenID Connect
Access Type: public
Implicit Flow Enabled: ON
Valid Redirect URIs: http://localhost:8081/*
```

### Step 2: Configure User Permissions

Ensure user `ktaha` has proper permissions:

1. **Users** → **ktaha** → **Role Mappings**
2. **Client Roles** → Select `realm-management`
3. **Available Roles** → Select `realm-admin` → **Add selected**

### Step 3: Update MapStore Configuration

#### 3.1 Update Backend Secret

In `java/web/src/main/resources/mapstore-ovr.properties`, replace:
```properties
keycloakOAuth2Config.clientSecret=YOUR_MAPSTORE_SERVER_CLIENT_SECRET
```
With the actual client secret from `mapstore-server`.

#### 3.2 Update Frontend Config

In `web/client/configs/localConfig.json`, replace the `config` section with the exact JSON from `mapstore-client` Installation tab.

### Step 4: Set System Property

Add this JVM system property for direct user integration:
```bash
-Dsecurity.integration=keycloak-direct
```

**For Tomcat**: Add to `JAVA_OPTS` environment variable:
```bash
export JAVA_OPTS="$JAVA_OPTS -Dsecurity.integration=keycloak-direct"
```

### Step 5: Build and Deploy

1. **Clean build**:
   ```bash
   mvn clean install
   ```

2. **Start application** with the system property

3. **Test** the integration

## 🧪 Testing the Integration

### Test 1: OpenID Authentication
1. Access: `http://localhost:8081/mapstore/`
2. Click **Login**
3. Should redirect to Keycloak login
4. Login with Keycloak credentials
5. Should return to MapStore logged in

### Test 2: SSO (Single Sign-On)
1. Login to another application in GISID realm
2. Access MapStore
3. Should automatically login without credentials

### Test 3: Direct User Integration
1. Users should appear from Keycloak (not local database)
2. Roles/groups should map from Keycloak
3. No local user creation in MapStore database

## 🔍 Troubleshooting

### Common Issues

**Issue**: 302 redirect with no response
- **Solution**: Check if all 3 clients exist in GISID realm
- **Solution**: Verify client secrets match

**Issue**: CORS errors
- **Solution**: Ensure Keycloak server is in `useCORS` list in `localConfig.json`

**Issue**: SSL/HTTPS errors
- **Solution**: Verify `ssl-required` setting matches your deployment

**Issue**: User not found
- **Solution**: Check `ktaha` user has `realm-admin` role

### Log Locations
- Application logs: Check for Keycloak configuration loading
- Keycloak logs: Check for authentication attempts
- Browser Network tab: Check redirect URLs

## 📚 Configuration Files Summary

### Backend (`mapstore-ovr.properties`)
- **mapstore-server**: OpenID backend authentication
- **mapstore-users**: REST API access for user management
- **ktaha credentials**: For Keycloak REST API queries

### Frontend (`localConfig.json`)  
- **mapstore-client**: SSO frontend integration
- **Installation JSON**: Must match Keycloak client exactly

### Spring Security (`geostore-spring-security.xml`)
- **Direct integration beans**: Replace database with Keycloak API
- **User/Group DAOs**: Point to Keycloak instead of database

## 🎯 Expected Behavior

After successful setup:
- **Login**: Redirects to Keycloak, returns to MapStore
- **SSO**: Automatic login if authenticated in Keycloak
- **Users**: Managed entirely in Keycloak
- **Roles**: Mapped from Keycloak roles to MapStore groups
- **No local DB**: User/group data comes from Keycloak API

## 🔒 Security Notes

- Keep client secrets secure
- Use HTTPS in production
- Review Keycloak security settings
- Monitor authentication logs
- Regularly update Keycloak and MapStore

---

**Next**: After completing these steps, your MapStore will have complete Keycloak integration with OpenID + SSO + Direct User Management! 