/**
 * Copyright 2024, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { KeycloakSessionManager } from './KeycloakSessionUtils';

/**
 * Privilege Manager for handling application permissions based on Keycloak roles and groups
 */
export class PrivilegeManager {
    
    /**
     * Check if current user has a specific privilege
     */
    static hasPrivilege(privilegeName) {
        const user = KeycloakSessionManager.getUser();
        if (!user || !user.privileges) {
            return false;
        }
        
        return user.privileges[privilegeName] === true;
    }
    
    /**
     * Check if current user has admin role
     */
    static isAdmin() {
        const user = KeycloakSessionManager.getUser();
        return user && user.role === 'ADMIN';
    }
    
    /**
     * Check if current user belongs to a specific group
     */
    static hasGroup(groupName) {
        const user = KeycloakSessionManager.getUser();
        if (!user || !user.groups) {
            return false;
        }
        
        return user.groups.includes(groupName) || 
               user.groups.some(group => group.toLowerCase().includes(groupName.toLowerCase()));
    }
    
    /**
     * Check if current user has any of the specified roles
     */
    static hasAnyRole(roles) {
        const user = KeycloakSessionManager.getUser();
        if (!user || !user.groups) {
            return false;
        }
        
        return roles.some(role => 
            user.groups.some(group => 
                group.toLowerCase().includes(role.toLowerCase())
            )
        );
    }
    
    /**
     * Get all privileges for current user
     */
    static getUserPrivileges() {
        const user = KeycloakSessionManager.getUser();
        return user && user.privileges ? user.privileges : {};
    }
    
    /**
     * Application-specific privilege checks
     */
    static canAccessDashboard() {
        return this.hasPrivilege('canAccessDashboard') || this.isAdmin();
    }
    
    static canAccessContext() {
        return this.hasPrivilege('canAccessContext') || this.isAdmin();
    }
    
    static canCreateMaps() {
        return this.hasPrivilege('canCreateMaps') || this.isAdmin();
    }
    
    static canEditMaps() {
        return this.hasPrivilege('canEditMaps') || this.isAdmin();
    }
    
    static canDeleteMaps() {
        return this.hasPrivilege('canDeleteMaps') || this.isAdmin();
    }
    
    static canShareMaps() {
        return this.hasPrivilege('canShareMaps') || this.isAdmin();
    }
    
    static canManageUsers() {
        return this.hasPrivilege('canManageUsers') || this.isAdmin();
    }
    
    static canManageGroups() {
        return this.hasPrivilege('canManageGroups') || this.isAdmin();
    }
    
    static canAccessRulesManager() {
        return this.hasPrivilege('canAccessRulesManager') || this.isAdmin();
    }
    
    static canAccessImporter() {
        return this.hasPrivilege('canAccessImporter') || this.isAdmin();
    }
    
    static canViewProtectedLayers() {
        return this.hasPrivilege('canViewProtectedLayers') || this.isAdmin();
    }
    
    static canExportData() {
        return this.hasPrivilege('canExportData') || this.isAdmin();
    }
    
    static canUploadData() {
        return this.hasPrivilege('canUploadData') || this.isAdmin();
    }
    
    static canAccessAnalytics() {
        return this.hasPrivilege('canAccessAnalytics') || this.isAdmin();
    }
    
    /**
     * Check multiple privileges at once
     */
    static hasAllPrivileges(privilegeNames) {
        return privilegeNames.every(priv => this.hasPrivilege(priv));
    }
    
    static hasAnyPrivilege(privilegeNames) {
        return privilegeNames.some(priv => this.hasPrivilege(priv));
    }
    
    /**
     * Get user information for display
     */
    static getUserInfo() {
        const user = KeycloakSessionManager.getUser();
        const userInfo = KeycloakSessionManager.getUserInfo();
        
        if (!user) {
            return null;
        }
        
        return {
            name: user.name,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            groups: user.groups || [],
            privileges: user.privileges || {},
            isAdmin: user.role === 'ADMIN',
            attributes: user.attributes || {},
            keycloakInfo: userInfo || {}
        };
    }
    
    /**
     * Refresh user privileges from current token
     */
    static async refreshPrivileges() {
        try {
            const updatedUser = await KeycloakSessionManager.refreshUserInfoFromKeycloak();
            if (updatedUser) {
                console.log('User privileges refreshed:', updatedUser.privileges);
                return updatedUser.privileges;
            }
        } catch (error) {
            console.error('Failed to refresh user privileges:', error);
        }
        return this.getUserPrivileges();
    }
    
    /**
     * Check if user session is valid and refresh if needed
     */
    static async validateSession() {
        const accessToken = KeycloakSessionManager.getAccessToken();
        if (!accessToken) {
            return false;
        }
        
        // Check if token is expired
        if (KeycloakSessionManager.isTokenExpired(accessToken)) {
            try {
                await KeycloakSessionManager.refreshAccessToken();
                return true;
            } catch (error) {
                console.error('Session validation failed:', error);
                return false;
            }
        }
        
        return true;
    }
}

export default PrivilegeManager; 