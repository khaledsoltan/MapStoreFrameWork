// web/client/plugins/Example.jsx
import React from 'react';
import { createPlugin } from '../utils/PluginsUtils';
import { connect } from 'react-redux';
import { projectionSelector , mapSelector} from '../../client/selectors/map';
import { changeZoomLevel } from '../actions/map';
import { nearbyReducer } from '../reducers/nearby';
import { toggleControl } from '../actions/controls';
import { incrementCounter, toggleNearby } from '../actions/nearby';
const style = {
    position: "absolute",
    background: "white",
    top: 50,
    left: 50
};


const Component = (probs) =>   
<div style={style}>
   {/* This is the current projection: {probs.projection}
    <button onClick={()=>probs.changeZoomLevel(probs.currentZoom + 1)}>Zoom In</button>
    <button onClick={()=>probs.changeZoomLevel(probs.currentZoom - 1)}>Zoom out</button>
   <div>
   <button onClick={() => probs.incrementCounter(1, "manual")}>Increment</button>   </div>
   <div>
    <p>Counter: {probs.counter}</p>
   </div> */}
   </div>;

const zoomSelector = state => {
   const mapState = mapSelector(state);
   return mapState?.zoom;

}
const mapStateToProps = state =>{
    return {
        counter: state?.nearby?.counter,
        projection: projectionSelector(state),
        currentZoom: zoomSelector(state)
    };  
}

const connectedComponent = connect(mapStateToProps,{
    changeZoomLevel : changeZoomLevel,
    incrementCounter :    incrementCounter

})(Component);

export default createPlugin('nearby', {
    component: connectedComponent,
    reducers: {
        nearby: nearbyReducer
    },
    containers: {
        SidebarMenu: {
            name: 'nearby',
            position: 2100,
            doNotHide: true,
            tooltip: "GeoProcessing.tooltip.siderBarBtn",
            action: toggleControl.bind(null, 'nearby', null),
            priority: 10,
            toggle: true
        }
    },
});