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

    constructor(props) {
        super(props);
        this.state = {
            username: '',
            password: '',
            oldPassword: '',
            newPassword: '',
            confirmPassword: '',
            loading: false,
            error: null,
            isChangePasswordMode: false
        };
    }

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

    renderArabicForm = () => {
        const { username, password, oldPassword, newPassword, confirmPassword, loading, error, isChangePasswordMode } = this.state;

        if (isChangePasswordMode) {
            return (
                <>
                    <label htmlFor="username" className="form-label">اسم المستخدم</label>
                    <input 
                        type="text" 
                        className="form-control" 
                        id="username" 
                        placeholder="اسم المستخدم" 
                        value={username}
                        onChange={this.handleUsernameChange}
                        disabled={loading}
                        required 
                    />
                    
                    <label htmlFor="old-password" className="form-label">كلمة المرور الحالية</label>
                    <input 
                        type="password" 
                        className="form-control" 
                        id="old-password" 
                        placeholder="كلمة المرور الحالية" 
                        value={oldPassword}
                        onChange={this.handleOldPasswordChange}
                        disabled={loading}
                        required 
                    />
                    
                    <label htmlFor="new-password" className="form-label">كلمة المرور الجديدة</label>
                    <input 
                        type="password" 
                        className="form-control" 
                        id="new-password" 
                        placeholder="كلمة المرور الجديدة" 
                        value={newPassword}
                        onChange={this.handleNewPasswordChange}
                        disabled={loading}
                        required 
                    />
                    
                    <label htmlFor="confirm-password" className="form-label">تأكيد كلمة المرور</label>
                    <input 
                        type="password" 
                        className="form-control" 
                        id="confirm-password" 
                        placeholder="تأكيد كلمة المرور" 
                        value={confirmPassword}
                        onChange={this.handleConfirmPasswordChange}
                        disabled={loading}
                        required 
                    />

                    <a 
                        href="javascript:void(0);" 
                        className="text-primary" 
                        onClick={this.toggleLoginForm}
                    >
                        تسجيل الدخول
                    </a>
                    
                    <button 
                        className="btn btn-purple w-100 mt-3" 
                        type="submit"
                        disabled={loading || !username || !oldPassword || !newPassword || !confirmPassword}
                    >
                        {loading ? 'جاري تغيير كلمة المرور...' : 'تغيير كلمة المرور'}
                    </button>

                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}
                </>
            );
        }

        return (
            <>
                <label htmlFor="username" className="form-label">اسم المستخدم</label>
                <input 
                    type="text" 
                    className="form-control" 
                    id="username" 
                    placeholder="اسم المستخدم" 
                    value={username}
                    onChange={this.handleUsernameChange}
                    disabled={loading}
                    required 
                />
                
                <label htmlFor="password" className="form-label">كلمة المرور</label>
                <input 
                    type="password" 
                    className="form-control" 
                    id="password" 
                    placeholder="كلمة المرور" 
                    value={password}
                    onChange={this.handlePasswordChange}
                    disabled={loading}
                    required 
                />
                
                <a 
                    href="javascript:void(0);" 
                    className="text-primary" 
                    onClick={this.toggleChangePassword}
                >
                    تغيير كلمة المرور
                </a>

                <button 
                    className="btn btn-purple w-100 mt-2" 
                    type="submit"
                    disabled={loading || !username || !password}
                >
                    {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
                </button>

                {error && (
                    <div className="error-message">
                        {error}
                    </div>
                )}
            </>
        );
    };

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
        return (
            <Modal 
                {...this.props.options} 
                backdrop="static" 
                show={this.props.show} 
                onHide={this.handleOnHide}
                size="xl"
                style={{ 
                    width: '100%', 
                    height: '100%',
                    maxWidth: 'none',
                    margin: 0
                }}
                dialogClassName="full-screen-modal"
            >
                <Modal.Body style={{ 
                    padding: 0, 
                    width: '100%',
                    height: '100vh',
                    background: 'url("product/assets/img/body_backgroundimage.svg") no-repeat center center/cover',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    direction: 'rtl'
                }}>
                    <div className="login-card d-flex" style={{
                        display: 'flex',
                        maxWidth: '1000px',
                        width: '100%',
                        borderRadius: '15px',
                        overflow: 'hidden',
                        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
                    }}>
                        {/* Left Part - Login Form */}
                        <div className="left-part" style={{
                            background: 'white',
                            padding: '10px',
                            flex: 1
                        }}>
                            <div className="logo" style={{
                                display: 'flex',
                                justifyContent: 'center',
                                marginBottom: '5px'
                            }}>
                                <img src="product/assets/img/Geo_Site_PRE_01-06.png" alt="Logo" width="250px" height="auto"/>
                            </div>
                            
                            <form className="d-flex flex-column justify-content-center align-items-center" onSubmit={this.handleFormSubmit}>
                                <div className="w-75">
                                    {this.renderArabicForm()}
                                </div>
                            </form>
                            
                            <div className="d-flex flex-row justify-content-center mt-4">
                                <label className="w-auto m-0 d-flex align-items-center text-center" style={{ fontSize: '10px' }}>
                                    الإصدار 1.0.0.0
                                </label>
                                <div className="border mx-1"></div>
                                <div className="text-center w-auto align-items-center justify-content-between d-flex flex-row">
                                    <span className="text-black text-right text-break mx-1" style={{ fontSize: '8px' }}>
                                        تطوير و تشغيل الهيئة السعودية للبيانات و الذكاء الاصطناعي &copy; 2025
                                    </span>
                                    <img src="product/assets/img/SADAIA.png" alt="" style={{ width: 'auto', height: '20px' }} />
                                </div>
                            </div>
                        </div>
                        
                        {/* Right Part - Branding */}
                        <div className="right-part d-flex flex-column align-items-center" style={{
                            background: 'rgb(102,204,255)',
                            backgroundImage: 'url(product/assets/img/SDAIA_LOGO_WITHOUTTEXT_SVG.svg), linear-gradient(235deg, rgb(78, 107, 171) 0%, rgb(131, 177, 219) 50%, rgb(129, 129, 182) 100%)',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'left bottom',
                            color: 'white',
                            padding: '10px',
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            textAlign: 'center'
                        }}>
                            <div className="d-flex justify-content-between w-100">
                                <img src="product/assets/img/PSD_LOGO.png" alt="Client" width="80px" height="auto" />
                            </div>
                            <div>
                                <h2>البوابة الجيومكانية</h2>
                                <p>تسجيل الدخول</p>
                            </div>
                            <div className="d-flex justify-content-between align-items-end w-100">
                                <img src="product/assets/img/vision2030-w.svg" alt="vision2023" width="100px" height="auto" />
                                <img src="product/assets/img/Sdaia-logo.png" alt="SDAIA_LOGO" width="150px" height="auto" />
                            </div>
                        </div>
                    </div>
                    
                    <style>{`
                        .full-screen-modal {
                            width: 100vw !important;
                            height: 100vh !important;
                            max-width: none !important;
                            margin: 0 !important;
                        }
                        
                        .full-screen-modal .modal-content {
                            width: 100% !important;
                            height: 100% !important;
                            border: none !important;
                            border-radius: 0 !important;
                        }
                        
                        .login-card .form-control {
                            margin-bottom: 5px;
                            padding: 10px;
                            border: 1px solid #ddd;
                            border-radius: 5px;
                            width: 100%;
                        }
                        
                        .login-card .btn-purple {
                            color: #fff !important;
                            background-color: #625d9c !important;
                            border: none;
                            padding: 10px;
                            border-radius: 5px;
                            cursor: pointer;
                            font-weight: bold;
                        }
                        
                        .login-card .btn-purple:hover {
                            background-color: #4e4a75 !important;
                        }
                        
                        .login-card .btn-purple:disabled {
                            background-color: #ccc !important;
                            cursor: not-allowed;
                        }
                        
                        .login-card .error-message {
                            color: red;
                            font-size: 0.9rem;
                            margin-top: 10px;
                            display: block;
                        }
                        
                        .login-card .form-label {
                            font-weight: bold;
                            margin-bottom: 5px;
                            display: block;
                        }
                        
                        .login-card .text-primary {
                            color: #007bff !important;
                            text-decoration: none;
                            cursor: pointer;
                        }
                        
                        .login-card .text-primary:hover {
                            text-decoration: underline;
                        }
                        
                        .login-card .w-100 {
                            width: 100% !important;
                        }
                        
                        .login-card .mt-2 {
                            margin-top: 0.5rem !important;
                        }
                        
                        .login-card .mt-3 {
                            margin-top: 1rem !important;
                        }
                        
                        @media (max-width: 768px) {
                            .login-card {
                                flex-direction: column;
                            }
                            .login-card .right-part {
                                padding: 10px;
                            }
                        }
                    `}</style>
                </Modal.Body>
            </Modal>
        );
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

    // Event handlers for Arabic form
    handleUsernameChange = (e) => {
        this.setState({ username: e.target.value, error: null });
    };

    handlePasswordChange = (e) => {
        this.setState({ password: e.target.value, error: null });
    };

    handleOldPasswordChange = (e) => {
        this.setState({ oldPassword: e.target.value, error: null });
    };

    handleNewPasswordChange = (e) => {
        this.setState({ newPassword: e.target.value, error: null });
    };

    handleConfirmPasswordChange = (e) => {
        this.setState({ confirmPassword: e.target.value, error: null });
    };

    toggleChangePassword = () => {
        this.setState({ 
            isChangePasswordMode: true, 
            error: null,
            oldPassword: '',
            newPassword: '',
            confirmPassword: ''
        });
    };

    toggleLoginForm = () => {
        this.setState({ 
            isChangePasswordMode: false, 
            error: null,
            oldPassword: '',
            newPassword: '',
            confirmPassword: ''
        });
    };

    handleFormSubmit = async (e) => {
        e.preventDefault();
        const { isChangePasswordMode } = this.state;

        if (isChangePasswordMode) {
            this.handleChangePassword();
        } else {
            this.handleLogin();
        }
    };

    handleLogin = async () => {
        const { username, password } = this.state;

        if (!username || !password) {
            this.setState({ error: 'يرجى ملء كافة الحقول بشكل صحيح.' });
            return;
        }

        this.setState({ loading: true, error: null });

        try {
            console.log('Authenticating user with Keycloak...');
            const keycloakConfig = {
                authServerUrl: 'https://gisidgw.geosystems-me.com:5443/',
                realm: 'GISID',
                clientId: 'mapstore-client',
                clientSecret: 'hy7rf5rEiDRHreQAlt6zMsizLnvK65Ih'
            };

            const tokenUrl = `${keycloakConfig.authServerUrl}realms/${keycloakConfig.realm}/protocol/openid-connect/token`;
            
            const params = new URLSearchParams();
            params.append('grant_type', 'password');
            params.append('client_id', keycloakConfig.clientId);
            params.append('username', username);
            params.append('password', password);
            
            if (keycloakConfig.clientSecret) {
                params.append('client_secret', keycloakConfig.clientSecret);
            }

            const response = await fetch(tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params
            });

            const data = await response.json();

            if (response.ok && data.access_token) {
                console.log('Login successful:', data);
                
                // Get user info
                const userInfo = await this.getUserInfo(data.access_token, keycloakConfig);
                
                // Create user object for MapStore
                const user = {
                    User: userInfo,
                    access_token: data.access_token,
                    refresh_token: data.refresh_token,
                    expires: data.expires_in,
                    authProvider: 'keycloak-direct'
                };
                
                // Store tokens
                localStorage.setItem('keycloak_access_token', data.access_token);
                localStorage.setItem('keycloak_refresh_token', data.refresh_token);
                localStorage.setItem('keycloak_user', JSON.stringify(userInfo));
                
                // Handle success
                this.handleKeycloakSuccess({
                    user: userInfo,
                    tokens: data,
                    provider: 'keycloak-direct'
                });
            } else {
                throw new Error(data.error_description || 'فشل في تسجيل الدخول');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.setState({ 
                error: error.message || 'فشل في تسجيل الدخول. يرجى التحقق من البيانات والمحاولة مرة أخرى.',
                loading: false 
            });
        }
    };

    handleChangePassword = async () => {
        const { username, oldPassword, newPassword, confirmPassword } = this.state;

        if (!username || !oldPassword || !newPassword || !confirmPassword) {
            this.setState({ error: 'يرجى ملء كافة الحقول بشكل صحيح.' });
            return;
        }

        if (newPassword === oldPassword) {
            this.setState({ error: 'كلمة المرور الجديدة يجب أن تكون مختلفة عن القديمة.' });
            return;
        }

        if (newPassword !== confirmPassword) {
            this.setState({ error: 'تأكيد كلمة المرور غير صحيح.' });
            return;
        }

        this.setState({ loading: true, error: null });

        try {
            // Password change functionality would be implemented here
            console.log('Password change not implemented yet');
            this.setState({ 
                error: 'تغيير كلمة المرور غير متاح حالياً. يرجى الاتصال بالمسؤول.',
                loading: false 
            });
        } catch (error) {
            console.error('Password change error:', error);
            this.setState({ 
                error: 'فشل في تغيير كلمة المرور. يرجى المحاولة مرة أخرى.',
                loading: false 
            });
        }
    };

    getUserInfo = async (accessToken, keycloakConfig) => {
        const userInfoUrl = `${keycloakConfig.authServerUrl}realms/${keycloakConfig.realm}/protocol/openid-connect/userinfo`;
        
        const response = await fetch(userInfoUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        return response.json();
    };
}

export default LoginModal;
