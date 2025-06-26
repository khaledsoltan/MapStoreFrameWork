/*
 * Copyright 2016, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';

import PropTypes from 'prop-types';
import { Grid, Row, Col, Alert, Glyphicon } from 'react-bootstrap';
import ResizableModal from '../../../components/misc/ResizableModal';
import Portal from '../../../components/misc/Portal';
import { getUserAttributes } from '../../../utils/SecurityUtils';
import Message from '../../../components/I18N/Message';
import { isArray, isObject, isString } from 'lodash';
import UserInfoPanel from '../UserInfoPanel';

/**
 * A Modal window to show password reset form
  * @prop {bool} hideGroupUserInfo It is a flag from Login plugin (cfg.toolsCfg[0].hideGroupUserInfo): to show/hide user group in user details info, by default `false`
 */
class UserDetails extends React.Component {
    static propTypes = {
        // props
        user: PropTypes.object,
        show: PropTypes.bool,
        options: PropTypes.object,
        onClose: PropTypes.func,
        includeCloseButton: PropTypes.bool,
        hideGroupUserInfo: PropTypes.bool
    };

    static defaultProps = {
        user: {
            name: "Guest"
        },
        onClose: () => {},
        options: {},
        includeCloseButton: true,
        hideGroupUserInfo: false
    };

    getUserInfo = () => {
        let mainUserInfo = {
            name: v => <strong>{v}</strong>,
            role: v => <strong style={{color: v === 'ADMIN' ? '#ff4d4f' : '#52c41a'}}>{this.capitalCase(v)}</strong>,
            email: v => <strong>{v}</strong>,
            firstName: v => <strong>{v}</strong>,
            lastName: v => <strong>{v}</strong>,
            id: v => <strong style={{fontFamily: 'monospace', fontSize: '0.9em'}}>{v}</strong>,
            company: v => <strong>{v}</strong>,
            notes: v => <strong>{v}</strong>
        };

        if (!this.props.hideGroupUserInfo) {
            mainUserInfo.groups = groups => {
                // Handle both MapStore groups format and Keycloak groups format
                let gr = null;
                
                if (isArray(groups)) {
                    // Keycloak groups are simple array of strings
                    gr = groups.map(group => ({ groupName: group }));
                } else if (groups.group && isArray(groups.group)) {
                    // MapStore groups format
                    gr = [...groups.group];
                } else if (groups.group && isObject(groups.group)) {
                    // Single group object
                    gr = [{...groups.group}];
                }
                
                return gr && gr.map((group, idx) => {
                    const groupName = group.groupName || group;
                    const isRealmRole = groupName.startsWith('realm:');
                    const isClientRole = groupName.includes(':') && !isRealmRole;
                    const badgeStyle = {
                        backgroundColor: isRealmRole ? '#722ed1' : isClientRole ? '#1890ff' : '#52c41a',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '0.8em',
                        margin: '2px',
                        display: 'inline-block'
                    };
                    return groupName && <div className="user-group-info" key={`${groupName}-${idx}`} style={{marginBottom: '4px'}}><span style={badgeStyle}>{groupName}</span></div> || null;
                }).filter(v => v) || null;
            };
        }
        
        // Add Keycloak-specific fields if user has Keycloak attributes
        if (this.props.user && this.props.user.attributes) {
            const attrs = this.props.user.attributes;
            if (attrs.keycloak_id || attrs.authenticated_via) {
                mainUserInfo.authProvider = v => <strong style={{color: '#1890ff'}}>{v}</strong>;
                mainUserInfo.realm = v => <strong style={{color: '#722ed1'}}>{v}</strong>;
                mainUserInfo.clientId = v => <strong style={{fontFamily: 'monospace', fontSize: '0.9em'}}>{v}</strong>;
                mainUserInfo.scope = v => <span style={{fontSize: '0.9em', fontFamily: 'monospace', color: '#666'}}>{v}</span>;
                mainUserInfo.authenticatedVia = v => <strong style={{color: '#52c41a'}}>{v}</strong>;
                mainUserInfo.tokenUpdated = v => <span style={{fontSize: '0.85em', color: '#999'}}>{new Date(v).toLocaleString()}</span>;
            }
        }
        
        // Add privileges display if available
        if (this.props.user && this.props.user.privileges) {
            mainUserInfo.privileges = privileges => this.renderPrivileges(privileges);
        }
        
        return mainUserInfo;
    }
    
    renderPrivileges = (privileges) => {
        if (!privileges || typeof privileges !== 'object') {
            return <span style={{color: '#999', fontStyle: 'italic'}}>No privileges defined</span>;
        }
        
        const privilegeGroups = {
            'Map Operations': ['canCreateMaps', 'canEditMaps', 'canDeleteMaps', 'canShareMaps'],
            'Application Access': ['canAccessDashboard', 'canAccessContext', 'canAccessAnalytics'],
            'Data Management': ['canViewProtectedLayers', 'canExportData', 'canUploadData', 'canAccessImporter'],
            'Administration': ['canManageUsers', 'canManageGroups', 'canAccessRulesManager']
        };
        
        return (
            <div style={{maxHeight: '200px', overflowY: 'auto'}}>
                {Object.keys(privilegeGroups).map(groupName => {
                    const groupPrivs = privilegeGroups[groupName];
                    const hasAnyPrivilege = groupPrivs.some(priv => privileges[priv]);
                    
                    if (!hasAnyPrivilege) return null;
                    
                    return (
                        <div key={groupName} style={{marginBottom: '8px'}}>
                            <div style={{fontWeight: 'bold', fontSize: '0.9em', color: '#333', marginBottom: '4px'}}>
                                {groupName}:
                            </div>
                            <div style={{marginLeft: '10px'}}>
                                {groupPrivs.map(priv => {
                                    if (!privileges[priv]) return null;
                                    return (
                                        <span key={priv} style={{
                                            backgroundColor: '#52c41a',
                                            color: 'white',
                                            padding: '1px 6px',
                                            borderRadius: '8px',
                                            fontSize: '0.75em',
                                            margin: '1px',
                                            display: 'inline-block'
                                        }}>
                                            {this.formatPrivilegeName(priv)}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }
    
    formatPrivilegeName = (privilegeName) => {
        return privilegeName
            .replace(/^can/, '')
            .replace(/([A-Z])/g, ' $1')
            .trim();
    }

    renderAttributes = () => {
        if (this.props.user && this.props.user.attribute) {
            const userAttributes = getUserAttributes(this.props.user);
            if (userAttributes && userAttributes.length > 0) {
                const userInfo = this.getUserInfo();
                const attributesObj = userAttributes.reduce((a, b) => b.name !== 'UUID' ? {...a, [b.name]: b.value } : {...a}, {});
                
                // Include Keycloak attributes if available
                let keycloakParams = {};
                if (this.props.user.attributes) {
                    const attrs = this.props.user.attributes;
                    keycloakParams = {
                        authProvider: attrs.authProvider || 'N/A',
                        realm: attrs.realm || 'N/A',
                        clientId: attrs.client_id || 'N/A',
                        scope: attrs.scope || 'N/A',
                        authenticatedVia: attrs.authenticated_via || 'N/A',
                        tokenUpdated: attrs.token_updated || 'N/A'
                    };
                    
                    // Add privileges if available
                    if (this.props.user.privileges) {
                        keycloakParams.privileges = this.props.user.privileges;
                    }
                }
                
                const params = {...this.props.user, ...attributesObj, ...keycloakParams};
                const generalAttributes = Object.keys(userInfo)
                    .map(key => {
                        const info = params[key] && userInfo[key](params[key]);
                        return info && <Row key={key}><Col sm={6} xs={12}>{<Message msgId={'user.details' + this.capitalCase(key)}/>}:</Col><Col sm={6} xs={12}>{info}</Col></Row>;
                    }
                    ).filter(value => value);
                if (generalAttributes && generalAttributes.length > 0) {
                    return <div className="ms-user-details-table"><Grid fluid>{generalAttributes}</Grid></div>;
                }
            }
        }
        return <Alert type="info"><Message msgId="user.noAttributesMessage" /></Alert>;
    };

    render() {
        // Check if user has Keycloak attributes for enhanced display
        const hasKeycloakInfo = this.props.user && this.props.user.attributes && 
                               (this.props.user.attributes.keycloak_id || this.props.user.attributes.authenticated_via);

        return (
            <Portal>
                <ResizableModal
                    title={<span><Glyphicon glyph="user"/>&nbsp;<Message msgId="user.details" /></span>}
                    clickOutEnabled={false}
                    size={hasKeycloakInfo ? "lg" : "sm"}
                    {...this.props.options}
                    show={this.props.show}
                    onClose={this.props.onClose}
                    buttons={this.props.includeCloseButton ? [{
                        text: <Message msgId="close"/>,
                        onClick: this.props.onClose,
                        bsStyle: 'primary'
                    }] : [] }>
                    {hasKeycloakInfo ? (
                        <UserInfoPanel 
                            user={this.props.user} 
                            showRefreshButton={true}
                            onRefresh={() => {
                                // Force a re-render by triggering state update
                                this.forceUpdate();
                            }}
                        />
                    ) : (
                        this.renderAttributes()
                    )}
                </ResizableModal>
            </Portal>
        );
    }

    capitalCase = str => {
        if (isString(str)) {
            const lowerCase = str.toLowerCase();
            return lowerCase.charAt(0).toUpperCase() + lowerCase.slice(1);
        }
        return '';
    }
}

export default UserDetails;
