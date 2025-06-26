/*
 * Copyright 2024, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { get } from 'lodash';
import { userSelector } from '../selectors/security';

/**
 * Permission and privilege management utilities
 * Handles both Keycloak roles and backend permissions
 */

/**
 * Extract roles from Keycloak token
 */
export const extractKeycloakRoles = (user) => {
    const realmRoles = get(user, 'info.realm_access.roles', []);
    const clientRoles = get(user, 'info.resource_access.mapstore-client.roles', []);
    
    return {
        realm: realmRoles,
        client: clientRoles,
        all: [...realmRoles, ...clientRoles]
    };
};

/**
 * Extract permissions from backend user info
 */
export const extractBackendPermissions = (user) => {
    return {
        role: get(user, 'role'),
        groups: get(user, 'groups', []),
        permissions: get(user, 'permissions', []),
        enabled: get(user, 'enabled', false)
    };
};

/**
 * Check if user has specific role
 */
export const hasRole = (user, role) => {
    const roles = extractKeycloakRoles(user);
    return roles.all.includes(role);
};

/**
 * Check if user has any of the specified roles
 */
export const hasAnyRole = (user, roles = []) => {
    const userRoles = extractKeycloakRoles(user);
    return roles.some(role => userRoles.all.includes(role));
};

/**
 * Check if user has all specified roles
 */
export const hasAllRoles = (user, roles = []) => {
    const userRoles = extractKeycloakRoles(user);
    return roles.every(role => userRoles.all.includes(role));
};

/**
 * Check if user has specific permission
 */
export const hasPermission = (user, permission) => {
    const permissions = extractBackendPermissions(user);
    return permissions.permissions.includes(permission);
};

/**
 * Check if user belongs to specific group
 */
export const isInGroup = (user, groupName) => {
    const permissions = extractBackendPermissions(user);
    return permissions.groups.some(group => 
        group.name === groupName || group.id === groupName
    );
};

/**
 * Check if user is admin
 */
export const isAdmin = (user) => {
    return hasAnyRole(user, ['ADMIN', 'admin', 'realm-admin']) || 
           hasPermission(user, 'ADMIN') ||
           get(user, 'role') === 'ADMIN';
};

/**
 * Check if user can edit resources
 */
export const canEditResources = (user) => {
    return isAdmin(user) || 
           hasAnyRole(user, ['USER', 'user']) ||
           hasPermission(user, 'WRITE') ||
           get(user, 'role') === 'USER';
};

/**
 * Check if user can view resources
 */
export const canViewResources = (user) => {
    return isAdmin(user) || 
           canEditResources(user) ||
           hasPermission(user, 'READ');
};

/**
 * Check if user can manage users
 */
export const canManageUsers = (user) => {
    return isAdmin(user) || 
           hasAnyRole(user, ['user-manager', 'realm-admin']) ||
           hasPermission(user, 'MANAGE_USERS');
};

/**
 * Get user's effective permissions
 */
export const getUserPermissions = (user) => {
    const keycloakRoles = extractKeycloakRoles(user);
    const backendPerms = extractBackendPermissions(user);
    
    return {
        // Identity
        username: get(user, 'name') || get(user, 'info.preferred_username'),
        email: get(user, 'info.email'),
        fullName: get(user, 'info.name'),
        
        // Roles
        roles: keycloakRoles,
        backendRole: backendPerms.role,
        
        // Groups
        groups: backendPerms.groups,
        
        // Permissions
        permissions: backendPerms.permissions,
        
        // Capabilities
        isAdmin: isAdmin(user),
        canEdit: canEditResources(user),
        canView: canViewResources(user),
        canManageUsers: canManageUsers(user),
        isEnabled: backendPerms.enabled,
        
        // Token info
        tokenExpiry: get(user, 'info.exp'),
        tokenIssuer: get(user, 'info.iss')
    };
};

/**
 * Create permission-based visibility rules
 */
export const createPermissionRules = (userPermissions) => {
    return {
        // UI Element visibility
        showAdminMenu: userPermissions.isAdmin,
        showUserManagement: userPermissions.canManageUsers,
        showCreateMap: userPermissions.canEdit,
        showEditTools: userPermissions.canEdit,
        showDeleteButton: userPermissions.canEdit,
        showShareButton: userPermissions.canView,
        
        // Feature access
        allowMapCreation: userPermissions.canEdit,
        allowMapEditing: userPermissions.canEdit,
        allowContextCreation: userPermissions.isAdmin,
        allowUserInvitation: userPermissions.canManageUsers,
        
        // Resource access
        canAccessPrivateResources: userPermissions.canView,
        canModifyResources: userPermissions.canEdit,
        canDeleteResources: userPermissions.canEdit || userPermissions.isAdmin
    };
};

/**
 * Hook to use permissions in components
 */
export const usePermissions = () => {
    return (state) => {
        const user = userSelector(state);
        if (!user) return null;
        
        const permissions = getUserPermissions(user);
        const rules = createPermissionRules(permissions);
        
        return {
            user: permissions,
            rules,
            hasRole: (role) => hasRole(user, role),
            hasPermission: (permission) => hasPermission(user, permission),
            isInGroup: (group) => isInGroup(user, group)
        };
    };
};

/**
 * Permission-based route guard
 */
export const createRouteGuard = (requiredRoles = [], requiredPermissions = []) => {
    return (user) => {
        if (!user) return false;
        
        const hasRequiredRoles = requiredRoles.length === 0 || 
                                hasAnyRole(user, requiredRoles);
        
        const hasRequiredPermissions = requiredPermissions.length === 0 ||
                                     requiredPermissions.every(perm => hasPermission(user, perm));
        
        return hasRequiredRoles && hasRequiredPermissions;
    };
};

/**
 * Default role mappings
 */
export const ROLE_MAPPINGS = {
    // Keycloak roles to MapStore roles
    'realm-admin': 'ADMIN',
    'admin': 'ADMIN',
    'user': 'USER',
    'guest': 'GUEST',
    
    // Permission levels
    ADMIN: ['READ', 'WRITE', 'DELETE', 'MANAGE_USERS', 'MANAGE_CONTEXTS'],
    USER: ['READ', 'WRITE'],
    GUEST: ['READ']
};

export default {
    extractKeycloakRoles,
    extractBackendPermissions,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    hasPermission,
    isInGroup,
    isAdmin,
    canEditResources,
    canViewResources,
    canManageUsers,
    getUserPermissions,
    createPermissionRules,
    usePermissions,
    createRouteGuard,
    ROLE_MAPPINGS
}; 