/**
 * Copyright 2024, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Panel, Row, Col, Badge, Alert, Button } from 'react-bootstrap';
import Message from '../I18N/Message';
import PrivilegeManager from '../../utils/PrivilegeManager';
import { KeycloakSessionManager } from '../../utils/KeycloakSessionUtils';

/**
 * Comprehensive User Information Panel for Keycloak users
 * Shows all user details, privileges, groups, roles, and session information
 */
class UserInfoPanel extends Component {
    static propTypes = {
        user: PropTypes.object,
        showRefreshButton: PropTypes.bool,
        onRefresh: PropTypes.func
    };

    static defaultProps = {
        showRefreshButton: true,
        onRefresh: () => {}
    };

    state = {
        refreshing: false,
        lastRefresh: null
    };

    refreshUserInfo = async () => {
        this.setState({ refreshing: true });
        try {
            await PrivilegeManager.refreshPrivileges();
            this.setState({ lastRefresh: new Date() });
            this.props.onRefresh();
        } catch (error) {
            console.error('Failed to refresh user info:', error);
        } finally {
            this.setState({ refreshing: false });
        }
    };

    renderBasicInfo = () => {
        const { user } = this.props;
        if (!user) return null;

        return (
            <Panel header={<strong>Basic Information</strong>} bsStyle="info">
                <Row>
                    <Col sm={6}>
                        <strong>Name:</strong> {user.name}
                    </Col>
                    <Col sm={6}>
                        <strong>Email:</strong> {user.email}
                    </Col>
                </Row>
                <Row>
                    <Col sm={6}>
                        <strong>First Name:</strong> {user.firstName}
                    </Col>
                    <Col sm={6}>
                        <strong>Last Name:</strong> {user.lastName}
                    </Col>
                </Row>
                <Row>
                    <Col sm={6}>
                        <strong>User ID:</strong> <code>{user.id}</code>
                    </Col>
                    <Col sm={6}>
                        <strong>Role:</strong> <Badge bsStyle={user.role === 'ADMIN' ? 'danger' : 'success'}>{user.role}</Badge>
                    </Col>
                </Row>
            </Panel>
        );
    };

    renderGroups = () => {
        const { user } = this.props;
        if (!user || !user.groups || user.groups.length === 0) {
            return (
                <Panel header={<strong>Groups & Roles</strong>} bsStyle="warning">
                    <Alert bsStyle="warning">No groups or roles assigned</Alert>
                </Panel>
            );
        }

        return (
            <Panel header={<strong>Groups & Roles</strong>} bsStyle="success">
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {user.groups.map((group, idx) => {
                        const isRealmRole = group.startsWith('realm:');
                        const isClientRole = group.includes(':') && !isRealmRole;
                        const bsStyle = isRealmRole ? 'primary' : isClientRole ? 'info' : 'success';
                        
                        return (
                            <Badge 
                                key={`${group}-${idx}`} 
                                bsStyle={bsStyle} 
                                style={{ margin: '2px', fontSize: '0.9em' }}
                            >
                                {group}
                            </Badge>
                        );
                    })}
                </div>
            </Panel>
        );
    };

    renderPrivileges = () => {
        const { user } = this.props;
        if (!user || !user.privileges) {
            return (
                <Panel header={<strong>Application Privileges</strong>} bsStyle="warning">
                    <Alert bsStyle="warning">No privileges defined</Alert>
                </Panel>
            );
        }

        const privilegeGroups = {
            'Map Operations': ['canCreateMaps', 'canEditMaps', 'canDeleteMaps', 'canShareMaps'],
            'Application Access': ['canAccessDashboard', 'canAccessContext', 'canAccessAnalytics'],
            'Data Management': ['canViewProtectedLayers', 'canExportData', 'canUploadData', 'canAccessImporter'],
            'Administration': ['canManageUsers', 'canManageGroups', 'canAccessRulesManager']
        };

        return (
            <Panel header={<strong>Application Privileges</strong>} bsStyle="success">
                <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                    {Object.keys(privilegeGroups).map(groupName => {
                        const groupPrivs = privilegeGroups[groupName];
                        const enabledPrivs = groupPrivs.filter(priv => user.privileges[priv]);
                        
                        if (enabledPrivs.length === 0) return null;
                        
                        return (
                            <div key={groupName} style={{ marginBottom: '10px' }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '5px', color: '#337ab7' }}>
                                    {groupName}:
                                </div>
                                <div style={{ marginLeft: '15px' }}>
                                    {enabledPrivs.map(priv => (
                                        <Badge key={priv} bsStyle="success" style={{ margin: '1px', fontSize: '0.8em' }}>
                                            {this.formatPrivilegeName(priv)}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Panel>
        );
    };

    renderKeycloakInfo = () => {
        const { user } = this.props;
        if (!user || !user.attributes) return null;

        const attrs = user.attributes;
        
        return (
            <Panel header={<strong>Keycloak Session Information</strong>} bsStyle="info">
                <Row>
                    <Col sm={6}>
                        <strong>Realm:</strong> <Badge bsStyle="primary">{attrs.realm}</Badge>
                    </Col>
                    <Col sm={6}>
                        <strong>Client ID:</strong> <code>{attrs.client_id}</code>
                    </Col>
                </Row>
                <Row>
                    <Col sm={6}>
                        <strong>Auth Method:</strong> <Badge bsStyle="info">{attrs.authenticated_via}</Badge>
                    </Col>
                    <Col sm={6}>
                        <strong>Scope:</strong> <code style={{ fontSize: '0.9em' }}>{attrs.scope}</code>
                    </Col>
                </Row>
                {attrs.token_updated && (
                    <Row>
                        <Col sm={12}>
                            <strong>Last Token Update:</strong> {new Date(attrs.token_updated).toLocaleString()}
                        </Col>
                    </Row>
                )}
            </Panel>
        );
    };

    renderSessionStatus = () => {
        const accessToken = KeycloakSessionManager.getAccessToken();
        const isExpired = accessToken ? KeycloakSessionManager.isTokenExpired(accessToken) : true;
        const claims = accessToken ? KeycloakSessionManager.getTokenClaims(accessToken) : null;

        return (
            <Panel header={<strong>Session Status</strong>} bsStyle={isExpired ? 'danger' : 'success'}>
                <Row>
                    <Col sm={6}>
                        <strong>Status:</strong> <Badge bsStyle={isExpired ? 'danger' : 'success'}>
                            {isExpired ? 'EXPIRED' : 'ACTIVE'}
                        </Badge>
                    </Col>
                    <Col sm={6}>
                        <strong>Has Token:</strong> <Badge bsStyle={accessToken ? 'success' : 'danger'}>
                            {accessToken ? 'YES' : 'NO'}
                        </Badge>
                    </Col>
                </Row>
                {claims && (
                    <>
                        <Row>
                            <Col sm={6}>
                                <strong>Token Issued:</strong> {new Date(claims.iat * 1000).toLocaleString()}
                            </Col>
                            <Col sm={6}>
                                <strong>Token Expires:</strong> {new Date(claims.exp * 1000).toLocaleString()}
                            </Col>
                        </Row>
                        <Row>
                            <Col sm={12}>
                                <strong>Issuer:</strong> <code>{claims.iss}</code>
                            </Col>
                        </Row>
                    </>
                )}
                {this.state.lastRefresh && (
                    <Row>
                        <Col sm={12}>
                            <strong>Last Refreshed:</strong> {this.state.lastRefresh.toLocaleString()}
                        </Col>
                    </Row>
                )}
            </Panel>
        );
    };

    formatPrivilegeName = (privilegeName) => {
        return privilegeName
            .replace(/^can/, '')
            .replace(/([A-Z])/g, ' $1')
            .trim();
    };

    render() {
        const { user, showRefreshButton } = this.props;
        const { refreshing } = this.state;

        if (!user) {
            return (
                <Alert bsStyle="warning">
                    <strong>No user information available</strong>
                    <br />Please log in to view your account details.
                </Alert>
            );
        }

        return (
            <div style={{ padding: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 style={{ margin: 0 }}>Account Information</h3>
                    {showRefreshButton && (
                        <Button 
                            bsStyle="primary" 
                            onClick={this.refreshUserInfo}
                            disabled={refreshing}
                        >
                            {refreshing ? 'Refreshing...' : 'Refresh Info'}
                        </Button>
                    )}
                </div>

                {this.renderBasicInfo()}
                {this.renderGroups()}
                {this.renderPrivileges()}
                {this.renderKeycloakInfo()}
                {this.renderSessionStatus()}
            </div>
        );
    }
}

export default UserInfoPanel; 