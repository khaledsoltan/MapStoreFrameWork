/**
 * Copyright 2016, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import PropTypes from 'prop-types';

import LoginForm from '../forms/LoginForm';
import KeycloakDirectLogin from '../forms/KeycloakDirectLogin';
import Modal from '../../misc/Modal';
import Message from '../../I18N/Message';
import { getMessageById } from '../../../utils/LocaleUtils';
import '../css/security.css';
import Button from '../../layout/Button';
import google from './assets/google.svg';
import keycloak from './assets/keycloak.svg';
import withTooltip from '../../misc/enhancers/tooltip';
import FlexBox from '../../layout/FlexBox';


const logos = {
    google,
    keycloak
};

const Separator = ({children}) => <div style={{width: "100%", textAlign: "center", padding: 10}}>{children}</div>;
const LoginItem = withTooltip(({provider, onLogin}) => {
    const {title, provider: providerName, imageURL} = provider;
    const logo = imageURL ?? logos[providerName];
    const text = title;
    return <a style={{margin: 20}} onClick={() => onLogin(provider)}>{logo ? <img src={logo} alt={text} style={{minHeight: 50}} /> : text ?? providerName}</a>;
});
/**
 * A Modal window to show password reset form
 */
class LoginModal extends React.Component {
    static propTypes = {
        // props
        providers: PropTypes.array,
        user: PropTypes.object,
        loginError: PropTypes.object,
        show: PropTypes.bool,
        options: PropTypes.object,

        // CALLBACKS
        onLoginSuccess: PropTypes.func,
        openIDLogin: PropTypes.func,
        onSubmit: PropTypes.func,
        onError: PropTypes.func,
        onClose: PropTypes.func,
        closeGlyph: PropTypes.string,
        style: PropTypes.object,
        buttonSize: PropTypes.string,
        includeCloseButton: PropTypes.bool
    };

    static contextTypes = {
        messages: PropTypes.object,
        store: PropTypes.object
    };

    static defaultProps = {
        providers: [{type: "basic", provider: "geostore"}],
        onLoginSuccess: () => {},
        openIDLogin: () => {},
        onSubmit: () => {},
        onError: () => {},
        onClose: () => {},
        options: {},
        closeGlyph: "",
        style: {},
        buttonSize: "large",
        includeCloseButton: true,
        useKeycloakDirect: true // Enable direct Keycloak login
    };

    getForm = () => {
        // Use direct Keycloak login if enabled
        if (this.props.useKeycloakDirect) {
            return (<KeycloakDirectLogin
                ref="keycloakLogin"
                onLoginSuccess={this.handleKeycloakSuccess}
                onError={this.props.onError}
                keycloakConfig={{
                    authServerUrl: 'https://gisidgw.geosystems-me.com:5443/',
                    realm: 'GISID',
                    clientId: 'mapstore-client',
                    clientSecret: 'hy7rf5rEiDRHreQAlt6zMsizLnvK65Ih'
                }}
            />);
        }
        
        const formProviders = this.props.providers.filter(({type}) => type === "basic");
        if (formProviders.length > 0) {
            return (<LoginForm
                role="body"
                ref="loginForm"
                showSubmitButton={false}
                user={this.props.user}
                loginError={this.props.loginError}
                onLoginSuccess={this.props.onLoginSuccess}
                onSubmit={this.props.onSubmit}
                onError={this.props.onError}
            />);
        }
        return null;
    }

    getOpenIDProviders = () => {
        const formProviders = this.props.providers.filter(({type}) => type === "basic");
        const openIdProviders = this.props.providers.filter(({type}) => type === "openID");
        if (openIdProviders.length > 0) {
            return <>
                <Separator><Message msgId={formProviders.length > 0 ? "user.orSignInWith" : "user.signInWith"}/></Separator>
                <div style={{display: "flex", flexDirection: "row", justifyContent: "center"}}>
                    {openIdProviders.map((provider) => <LoginItem key={provider.provider} provider={provider} tooltip={provider?.tooltip ?? provider?.provider} onLogin={this.props.openIDLogin} />)}
                </div>
            </>;
        }
        return null;
    }

    getFooter = () => {
        return ( <FlexBox centerChildrenVertically  gap="sm">
            <FlexBox.Fill />
            {this.props.includeCloseButton ? <Button
                key="closeButton"
                ref="closeButton"
                onClick={this.handleOnHide}><Message msgId="close"/></Button> : <span/>}
            {!this.props.useKeycloakDirect && <Button
                ref="submit"
                value={getMessageById(this.context.messages, "user.signIn")}
                variant="success"
                onClick={this.loginSubmit}
                key="submit">
                <Message msgId="user.signIn"/>
            </Button>}
        </FlexBox>);
    };

    render() {
        return (<Modal {...this.props.options} backdrop="static" show={this.props.show} onHide={this.handleOnHide}>
            <Modal.Header key="passwordChange" closeButton>
                <Modal.Title><Message msgId="user.login"/></Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <>
                    {this.getForm()}
                    {this.getOpenIDProviders()}
                </>
            </Modal.Body>
            <Modal.Footer>
                {this.getFooter()}
            </Modal.Footer>
        </Modal>);
    }

    /**
     * This is called when close button clicked or
     * when user click out(modal overlay). Hide when
     * it is triggered from button otherwise don't hide the
     * modal
     */
    handleOnHide = (event) => {
        if (event) {
            // it is coming from the hide or close button
            this.props.onClose();
        }
    }

    handleKeycloakSuccess = (result) => {
        // Store Keycloak tokens in localStorage for session management
        if (result.tokens) {
            localStorage.setItem('keycloak_access_token', result.tokens.access_token);
            localStorage.setItem('keycloak_refresh_token', result.tokens.refresh_token);
            localStorage.setItem('keycloak_user', JSON.stringify(result.user));
        }
        
        // Dispatch proper Redux action for MapStore login success
        // We need to import and dispatch the actual loginSuccess action
        const { loginSuccess } = require('../../../actions/security');
        
        // Create user details in the format MapStore expects
        const userDetails = {
            User: result.user,
            access_token: result.tokens?.access_token,
            refresh_token: result.tokens?.refresh_token,
            expires: result.tokens?.expires_in,
            authProvider: 'keycloak-client'
        };
        
        console.log('Dispatching loginSuccess with userDetails:', userDetails);
        
        // If we have access to the store context, dispatch directly
        // Otherwise, trigger a custom event that our epic can handle
        if (this.context && this.context.store) {
            this.context.store.dispatch(loginSuccess(userDetails, result.user.name, '', 'keycloak-client'));
        } else {
            // Fallback: dispatch custom event for epic handling
            window.dispatchEvent(new CustomEvent('mapstore-keycloak-login', {
                detail: {
                    userDetails,
                    username: result.user.name,
                    provider: 'keycloak-client'
                }
            }));
        }
        
        // Call original success handler (closes the form)
        this.props.onLoginSuccess(result.user);
        this.props.onClose();
    };

    loginSubmit = () => {
        if (this.props.useKeycloakDirect && this.refs.keycloakLogin) {
            // Keycloak login handles submit internally
            return;
        }
        if (this.refs.loginForm) {
            this.refs.loginForm.submit();
        }
    };
}

export default LoginModal;
