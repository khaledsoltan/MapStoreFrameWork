/*
 * Copyright 2024, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

// Action types
export const TOGGLE_ROUTING = 'ROUTING:TOGGLE_ROUTING';
export const SET_ROUTING_PROPERTY = 'ROUTING:SET_ROUTING_PROPERTY';
export const SHOW_ROUTING_ALERT = 'ROUTING:SHOW_ROUTING_ALERT';

/**
 * Toggle the routing panel visibility
 * @return {object} action of type `TOGGLE_ROUTING`
 */
export function toggleRouting() {
    return {
        type: TOGGLE_ROUTING
    };
}

/**
 * Sets a property for the routing plugin
 * @param {string} property the property to set
 * @param {any} value the value to set
 * @return {object} action of type `SET_ROUTING_PROPERTY`
 */
export function setRoutingProperty(property, value) {
    return {
        type: SET_ROUTING_PROPERTY,
        property,
        value
    };
}

/**
 * Shows an alert in the routing plugin
 * @param {string} message the message to show
 * @return {object} action of type `SHOW_ROUTING_ALERT`
 */
export function showRoutingAlert(message) {
    return {
        type: SHOW_ROUTING_ALERT,
        message
    };
}