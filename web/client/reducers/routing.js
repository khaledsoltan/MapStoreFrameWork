/*
 * Copyright 2024, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { TOGGLE_ROUTING, SET_ROUTING_PROPERTY, SHOW_ROUTING_ALERT } from '../actions/routing';

/**
 * Manages the state of the routing plugin
 * @param {object} state the previous state
 * @param {object} action the action to handle
 */
export default (state = {
    enabled: false,
    alertMessage: null
}, action) => {
    switch (action.type) {
    case TOGGLE_ROUTING: {
        return {
            ...state,
            enabled: !state.enabled,
            alertMessage: null // Clear any previous alert when toggling
        };
    }
    case SET_ROUTING_PROPERTY: {
        return {
            ...state,
            [action.property]: action.value
        };
    }
    case SHOW_ROUTING_ALERT: {
        return {
            ...state,
            alertMessage: action.message
        };
    }
    default:
        return state;
    }
};