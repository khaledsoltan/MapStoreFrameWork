/**
 * Copyright 2024, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { connect } from 'react-redux';
import { loginSuccess } from '../../actions/security';

/**
 * Arabic Full-Page Login Component
 * Provides a full-page Arabic login interface with Keycloak integration
 */
class LoginPage extends React.Component {
    static propTypes = {
        onLoginSuccess: PropTypes.func,
        onError: PropTypes.func,
        keycloakConfig: PropTypes.object,
        loginSuccess: PropTypes.func
    };

    static defaultProps = {
        onLoginSuccess: () => {},
        onError: () => {},
        keycloakConfig: {
            authServerUrl: 'https://gisidgw.geosystems-me.com:5443/',
            realm: 'GISID',
            clientId: 'mapstore-client',
            clientSecret: 'hy7rf5rEiDRHreQAlt6zMsizLnvK65Ih'
        }
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

    componentDidMount() {
        // Set LTR direction and add Bootstrap CSS
        document.documentElement.setAttribute('lang', 'en');
        document.documentElement.setAttribute('dir', 'ltr');
        
        // Add Bootstrap RTL CSS if not already present
        if (!document.querySelector('link[href*="bootstrap"]')) {
            const link = document.createElement('link');
            link.href = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css';
            link.rel = 'stylesheet';
            document.head.appendChild(link);
        }
        
        // Set body styles for full page
        document.body.style.background = 'url("product/assets/img/body_backgroundimage.svg") no-repeat center center/cover';
        document.body.style.height = '100vh';
        document.body.style.display = 'flex';
        document.body.style.justifyContent = 'center';
        document.body.style.alignItems = 'center';
        document.body.style.margin = '0';
        document.body.style.fontFamily = 'Arial, sans-serif';

        // Set up logout handler for when MapStore logout is triggered
        window.addEventListener('storage', this.handleStorageChange);
    }

    componentWillUnmount() {
        // Reset body styles
        document.body.style.background = '';
        document.body.style.height = '';
        document.body.style.display = '';
        document.body.style.justifyContent = '';
        document.body.style.alignItems = '';
        document.body.style.margin = '';
        document.body.style.fontFamily = '';

        // Clean up event listener
        window.removeEventListener('storage', this.handleStorageChange);
    }

    render() {
        const { loading, error, username, password, oldPassword, newPassword, confirmPassword, isChangePasswordMode } = this.state;

        return (
            <div className="login-page-wrapper" style={{ width: '100%', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
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
                            <img src="product/assets/img/Geo_Site_PRE_01-06.png" alt="GeoSite SADAIA" width="250px" height="auto"/>
                        </div>
                        
                        <form onSubmit={this.handleSubmit} className="d-flex flex-column justify-content-center align-items-center">
                            <div className="w-75">
                                {!isChangePasswordMode ? this.renderLoginForm() : this.renderChangePasswordForm()}
                            </div>
                        </form>
                        
                        <div className="d-flex flex-row justify-content-center mt-4">
                            <label className="w-auto m-0 d-flex align-items-center text-center" style={{ fontSize: '10px', color: '#6c757d' }}>
                                Version 1.0.0.0
                            </label>
                            <div className="border mx-1"></div>
                            <div className="text-center w-auto align-items-center justify-content-between d-flex flex-row">
                                <span className="text-muted text-left text-break mx-1" style={{ fontSize: '8px' }}>
                                    Developed & Operated by Saudi Authority for Data and AI &copy; 2025
                                </span>
                                <img src="product/assets/img/SADAIA.png" alt="SADAIA" style={{ width: 'auto', height: '20px' }} />
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
            </div>
        );
    }

    renderLoginForm = () => {
        const { username, password, loading, error } = this.state;
        
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

    renderChangePasswordForm = () => {
        const { username, oldPassword, newPassword, confirmPassword, loading, error } = this.state;
        
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
    };

    // Event handlers
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

    handleSubmit = async (e) => {
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
        const { keycloakConfig } = this.props;

        if (!username || !password) {
            this.setState({ error: 'يرجى ملء كافة الحقول بشكل صحيح.' });
            return;
        }

        this.setState({ loading: true, error: null });

        try {
            console.log('Authenticating user with Keycloak...');
            const tokenUrl = `${keycloakConfig.authServerUrl}realms/${keycloakConfig.realm}/protocol/openid-connect/token`;
            
            const params = new URLSearchParams();
            params.append('grant_type', 'password');
            params.append('client_id', keycloakConfig.clientId);
            params.append('username', username);
            params.append('password', password);
            
            if (keycloakConfig.clientSecret) {
                params.append('client_secret', keycloakConfig.clientSecret);
            }

            const response = await axios.post(tokenUrl, params, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            if (response.data.access_token) {
                console.log('Login successful:', response.data);
                
                // Get user info
                const userInfo = await this.getUserInfo(response.data.access_token);
                
                // Create user object for MapStore
                const user = {
                    User: userInfo,
                    access_token: response.data.access_token,
                    refresh_token: response.data.refresh_token,
                    expires: response.data.expires_in,
                    authProvider: 'keycloak-direct'
                };
                
                // Save to localStorage
                localStorage.setItem('keycloak_access_token', response.data.access_token);
                localStorage.setItem('keycloak_refresh_token', response.data.refresh_token);
                localStorage.setItem('keycloak_user', JSON.stringify(userInfo));
                
                // Dispatch login success
                this.props.loginSuccess(user);
                
                // Call the success callback
                this.props.onLoginSuccess(user);
                
                // Redirect to main application after successful login
                console.log('Redirecting to maps page...');
                setTimeout(() => {
                    window.location.href = '#/maps';
                }, 1000); // Small delay to ensure login state is saved
            }
        } catch (error) {
            console.error('Login error:', error);
            this.setState({ 
                error: error.response?.data?.error_description || 'فشل في تسجيل الدخول. يرجى التحقق من البيانات والمحاولة مرة أخرى.',
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
            // Implement password change logic here
            // This would typically involve calling a Keycloak admin API or backend service
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

    getUserInfo = async (accessToken) => {
        const { keycloakConfig } = this.props;
        const userInfoUrl = `${keycloakConfig.authServerUrl}realms/${keycloakConfig.realm}/protocol/openid-connect/userinfo`;
        
        const response = await axios.get(userInfoUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        return response.data;
    };

    handleStorageChange = (e) => {
        // If keycloak tokens are cleared, redirect to login
        if (e.key === 'keycloak_access_token' && !e.newValue) {
            window.location.href = '/';
        }
    };
}

const mapDispatchToProps = {
    loginSuccess
};

export default connect(null, mapDispatchToProps)(LoginPage); 