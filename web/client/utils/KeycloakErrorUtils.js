/**
 * Copyright 2024, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Utility class to classify Keycloak-related errors and determine appropriate actions
 */
export class KeycloakErrorUtils {
    
    /**
     * Determine if an error indicates a truly expired session that requires logout
     * @param {Error} error - The error to classify
     * @returns {boolean} - True if session is truly expired and logout is required
     */
    static isSessionExpiredError(error) {
        // Check HTTP status codes that indicate session expiration
        const expiredStatusCodes = [401, 403];
        if (error.response?.status && expiredStatusCodes.includes(error.response.status)) {
            // Additional checks for specific error messages
            const errorData = error.response.data;
            if (typeof errorData === 'string') {
                const expiredKeywords = ['expired', 'invalid_token', 'token_expired', 'session_expired'];
                return expiredKeywords.some(keyword => 
                    errorData.toLowerCase().includes(keyword)
                );
            }
            
            // If it's a 401/403 with no specific message, assume it's an auth issue
            return true;
        }
        
        // Check error messages for expiration indicators
        if (error.message) {
            const expiredMessages = [
                'token expired',
                'session expired', 
                'invalid token',
                'token_expired',
                'session_expired',
                'refresh token expired',
                'invalid_grant'
            ];
            
            const errorMessage = error.message.toLowerCase();
            return expiredMessages.some(msg => errorMessage.includes(msg));
        }
        
        return false;
    }
    
    /**
     * Determine if an error is a temporary network or server issue
     * @param {Error} error - The error to classify
     * @returns {boolean} - True if error appears to be temporary
     */
    static isTemporaryError(error) {
        // Network errors
        if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND' || 
            error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            return true;
        }
        
        // Server errors that might be temporary
        const temporaryStatusCodes = [500, 502, 503, 504];
        if (error.response?.status && temporaryStatusCodes.includes(error.response.status)) {
            return true;
        }
        
        // Check for network-related error messages
        if (error.message) {
            const networkErrorMessages = [
                'network error',
                'timeout',
                'connection refused',
                'connection reset',
                'service unavailable',
                'bad gateway',
                'gateway timeout'
            ];
            
            const errorMessage = error.message.toLowerCase();
            return networkErrorMessages.some(msg => errorMessage.includes(msg));
        }
        
        return false;
    }
    
    /**
     * Determine if an error should trigger a retry
     * @param {Error} error - The error to classify
     * @returns {boolean} - True if the operation should be retried
     */
    static shouldRetry(error) {
        // Don't retry if session is expired
        if (this.isSessionExpiredError(error)) {
            return false;
        }
        
        // Retry temporary errors
        if (this.isTemporaryError(error)) {
            return true;
        }
        
        // Retry rate limiting errors (429)
        if (error.response?.status === 429) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Determine if an error should trigger logout
     * @param {Error} error - The error to classify
     * @returns {boolean} - True if user should be logged out
     */
    static shouldLogout(error) {
        return this.isSessionExpiredError(error) && !this.isTemporaryError(error);
    }
    
    /**
     * Get a user-friendly error message
     * @param {Error} error - The error to classify
     * @returns {string} - User-friendly error message
     */
    static getUserFriendlyMessage(error) {
        if (this.isSessionExpiredError(error)) {
            return 'Your session has expired. Please log in again.';
        }
        
        if (this.isTemporaryError(error)) {
            return 'A temporary error occurred. Please try again.';
        }
        
        if (error.response?.status === 429) {
            return 'Too many requests. Please wait a moment and try again.';
        }
        
        return error.message || 'An unexpected error occurred.';
    }
    
    /**
     * Log error with appropriate level based on classification
     * @param {Error} error - The error to log
     * @param {string} context - Context where the error occurred
     */
    static logError(error, context = '') {
        const prefix = context ? `[${context}] ` : '';
        
        if (this.isSessionExpiredError(error)) {
            console.warn(`${prefix}Session expired error:`, error);
        } else if (this.isTemporaryError(error)) {
            console.info(`${prefix}Temporary error (will retry):`, error);
        } else {
            console.error(`${prefix}Unexpected error:`, error);
        }
    }
}

export default KeycloakErrorUtils; 