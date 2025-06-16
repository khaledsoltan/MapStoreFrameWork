/*
 * Copyright 2024, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Alert, Button, Glyphicon, Panel } from 'react-bootstrap';
import Message from '../../components/I18N/Message';
import './routing.css';

/**
 * RoutingPanel component for the routing plugin
 * @class
 * @memberof components.routing
 * @prop {boolean} enabled whether the routing panel is enabled
 * @prop {function} onToggleRouting callback to toggle the routing panel
 * @prop {function} onShowAlert callback to show an alert message
 * @prop {string} alertMessage the alert message to display
 */
class RoutingPanel extends React.Component {
    static propTypes = {
        enabled: PropTypes.bool,
        onToggleRouting: PropTypes.func,
        onShowAlert: PropTypes.func,
        alertMessage: PropTypes.string
    };

    static defaultProps = {
        enabled: false,
        onToggleRouting: () => {},
        onShowAlert: () => {}
    };

    renderHeader() {
        return (
            <div className="routing-panel-header">
                <span><Message msgId="routing.title" /></span>
                <Button 
                    className="square-button no-border"
                    onClick={this.props.onToggleRouting}>
                    <Glyphicon glyph="1-close" />
                </Button>
            </div>
        );
    }

    render() {
        if (!this.props.enabled) {
            return null;
        }

        return (
            <Panel 
                className="routing-panel" 
                header={this.renderHeader()}
            >
                <div className="routing-panel-body">
                    <p><Message msgId="routing.description" /></p>
                    
                    {this.props.alertMessage && (
                        <Alert bsStyle="info">
                            {this.props.alertMessage}
                        </Alert>
                    )}
                    
                    <Button 
                        bsStyle="primary"
                        onClick={() => this.props.onShowAlert("This is a routing alert message!")}
                    >
                        <Glyphicon glyph="info-sign" />{' '}
                        <Message msgId="routing.showAlert" />
                    </Button>
                </div>
            </Panel>
        );
    }
}

export default RoutingPanel;