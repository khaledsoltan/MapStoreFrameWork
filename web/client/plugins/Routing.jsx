/*
 * Copyright 2024, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import './routing/routing.css';

import React from 'react';
import { connect } from 'react-redux';
import { Glyphicon } from 'react-bootstrap';
import { createPlugin } from '../utils/PluginsUtils';
import { toggleRouting, showRoutingAlert } from '../actions/routing';
import routing from '../reducers/routing';
import Message from './locale/Message';
import RoutingPanel from '../components/routing/RoutingPanel';
import Button from '../components/misc/Button';

/**
 * Routing Plugin. Provides a button to open a routing panel in the map.
 * When clicked, it shows a panel with routing information and a button to trigger an alert.
 *
 * @class Routing
 * @memberof plugins
 * @static
 *
 * @prop {string} cfg.style CSS to apply to the button
 * @prop {string} cfg.className the class name for the button
 */

// Button component for the toolbar and sidebar menu
const RoutingToggleButton = connect(
    (state) => ({
        active: state.routing && state.routing.enabled || false
    }),
    {
        onClick: toggleRouting
    }
)(Button);

// Panel component that shows when routing is enabled
const RoutingButton = connect((state) => ({
    enabled: state.routing && state.routing.enabled || false,
    alertMessage: state.routing && state.routing.alertMessage
}), {
    onToggleRouting: toggleRouting,
    onShowAlert: showRoutingAlert
})(RoutingPanel);

export default createPlugin('Routing', {
    component: RoutingButton,
    containers: {
        Toolbar: {
            name: 'routing',
            position: 10,
            tool: true,
            icon: <Glyphicon glyph="road"/>,
            help: <Message msgId="routing.help"/>,
            priority: 1,
            tooltip: "routing.title",
            // Add the button component for the toolbar
            Component: RoutingToggleButton
        },
        SidebarMenu: {
            name: 'routing',
            position: 5,
            tool: true,
            icon: <Glyphicon glyph="road"/>,
            title: 'routing.title',
            priority: 2,
            tooltip: "routing.title",
            // Add the button component for the sidebar menu
            Component: RoutingToggleButton
        }
    },
    reducers: { routing }
});