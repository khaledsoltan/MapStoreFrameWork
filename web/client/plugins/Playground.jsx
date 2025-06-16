/**
 * Copyright 2016, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import L from 'leaflet';
import uuidv1 from 'uuid/v1';
import { addLayer, updateNode } from '../actions/layers';

const CONTROL_NAME = "playground_dialog";
import { connect } from 'react-redux';

import createSampleDialog from '../utils/createSampleDialog';
const Dialog = createSampleDialog(CONTROL_NAME);
import { createPlugin } from '../utils/PluginsUtils';

// Utility to create a circle polygon (buffer) around a point in lon/lat
function createCirclePolygon(center, radiusMeters, numSides = 64) {
    const [lon, lat] = center;
    const coords = [];
    const earthRadius = 6378137; // meters
    const d = radiusMeters / earthRadius;
    const latRad = lat * Math.PI / 180;
    const lonRad = lon * Math.PI / 180;
    for (let i = 0; i <= numSides; i++) {
        const angle = 2 * Math.PI * i / numSides;
        const latOffset = Math.asin(Math.sin(latRad) * Math.cos(d) + Math.cos(latRad) * Math.sin(d) * Math.cos(angle));
        const lonOffset = lonRad + Math.atan2(Math.sin(angle) * Math.sin(d) * Math.cos(latRad), Math.cos(d) - Math.sin(latRad) * Math.sin(latOffset));
        coords.push([
            lonOffset * 180 / Math.PI,
            latOffset * 180 / Math.PI
        ]);
    }
    return {
        type: 'Polygon',
        coordinates: [coords]
    };
}

// Utility to get centroid of a polygon (GeoJSON)
function getPolygonCentroid(polygon) {
    const coords = polygon.coordinates[0];
    let x = 0, y = 0, area = 0;
    for (let i = 0, len = coords.length - 1; i < len; i++) {
        const [x0, y0] = coords[i];
        const [x1, y1] = coords[i + 1];
        const a = x0 * y1 - x1 * y0;
        x += (x0 + x1) * a;
        y += (y0 + y1) * a;
        area += a;
    }
    area *= 0.5;
    if (area === 0) return [coords[0][0], coords[0][1]];
    x /= (6 * area);
    y /= (6 * area);
    return [x, y];
}

// Custom hook to get center from features in Redux state
function useFeatureCenter() {
    const features = useSelector(state => state.draw && state.draw.features);
    if (features && features.length > 0) {
        const f = features[0];
        if (f.geometry && f.geometry.type === 'Point') return f.geometry.coordinates;
        if (f.geometry && f.geometry.type === 'Polygon') return getPolygonCentroid(f.geometry);
        if (f.geometry && f.geometry.type === 'Circle' && f.geometry.center) return f.geometry.center;
        if (f.type === 'Point' && Array.isArray(f.center)) return f.center;
        if (f.type === 'Point' && Array.isArray(f.coordinates)) return f.coordinates;
    }
    return null;
}

// Map POI categories to OSM amenity tags
const POI_CATEGORIES = [
    { key: 'hospital', label: 'Hospitals', icon: 'plus-sign', amenity: 'hospital' },
    { key: 'hotel', label: 'Hotels', icon: 'home', amenity: 'hotel' },
    { key: 'police station', label: 'Police Stations', icon: 'tower', amenity: 'police' },
    { key: 'restaurant', label: 'Restaurants', icon: 'cutlery', amenity: 'restaurant' },
    { key: 'school', label: 'Schools', icon: 'education', amenity: 'school' }
];

const categoryIcons = {
    hospital: L.icon({ iconUrl: 'hospital.png', iconSize: [25, 41], iconAnchor: [12, 41] }),
    hotel: L.icon({ iconUrl: 'hotel.png', iconSize: [25, 41], iconAnchor: [12, 41] }),
    'police station': L.icon({ iconUrl: 'police.png', iconSize: [25, 41], iconAnchor: [12, 41] }),
    restaurant: L.icon({ iconUrl: 'restaurant.png', iconSize: [25, 41], iconAnchor: [12, 41] }),
    school: L.icon({ iconUrl: 'school.png', iconSize: [25, 41], iconAnchor: [12, 41] })
};

const iconMap = {
    'hospital': 'plus-sign.png',
    'hotel': 'home.png',
    'police station': 'tower.png',
    'restaurant': 'cutlery.png',
    'school': 'education.png'
};

const Playground = ({ text, dispatch, tempFeatures, features }) => {
    // Dynamically import the correct DrawSupport for the current map type
    let DrawSupport = null;
    try {
        DrawSupport = require('../components/map/leaflet/DrawSupport.jsx').default;
    } catch (e) {}
    try {
        DrawSupport = DrawSupport || require('../components/map/openlayers/DrawSupport.jsx').default;
    } catch (e) {}

    const [selectedCategory, setSelectedCategory] = useState(POI_CATEGORIES[0].key);
    const [range, setRange] = useState(12);
    const [unit, setUnit] = useState('km');
    const [loading, setLoading] = useState(false);
    const [drawnPoint, setDrawnPoint] = useState(null); // store last drawn point

    // Watch for point draw and update drawnPoint
    useEffect(() => {
        if (tempFeatures && tempFeatures.length === 1 && tempFeatures[0].geometry.type === 'Point') {
            setDrawnPoint(tempFeatures[0].geometry.coordinates);
        }
    }, [tempFeatures]);

    // Update circle on map when slider or unit changes and a point is present
    useEffect(() => {
        if (drawnPoint) {
            const radius = range * (unit === 'km' ? 1000 : 1); // meters
            const circleFeature = [{
                type: 'Feature',
                geometry: {
                    type: 'Circle',
                    center: drawnPoint,
                    radius: radius
                },
                properties: {}
            }];
            dispatch(changeDrawingStatus(
                'replace',
                'Circle',
                'playground',
                circleFeature,
                { stopAfterDrawing: false }
            ));
        }
    }, [drawnPoint, range, unit, dispatch]);

    // When user draws a new point or circle, update drawnPoint or clear it
    const handleDrawClick = (method) => {
        setDrawnPoint(null); // reset on new draw
        dispatch(changeDrawingStatus('start', method, 'playground', [], { stopAfterDrawing: true }));
    };

    // Debug logs
    console.log('Drawn tempFeatures:', tempFeatures);
    console.log('Drawn features:', features);

    const handleNearbySearch = async () => {
        setLoading(true);
        let center = null;
        let radius = null; // meters
        let f = features;
        if (!f || f.length === 0) {
            setLoading(false);
            alert('No features found. Please draw a point or circle on the map.');
            return;
        }
    
        if (features[0].center ) {
            center = features[0].center;
            radius = features[0].radius;
        } else if (features[0].properties ) {
            center = features[0].properties.center;
            radius = features[0].properties.radius;
        } 
        
        if (!center || !radius) {
            setLoading(false);
            alert('Invalid center or radius.');
            return;
        }
        const [lng, lat] = center;
        const selectedCat = POI_CATEGORIES.find(cat => cat.key === selectedCategory);
        const amenity = selectedCat ? selectedCat.amenity : 'restaurant';
        const intRadius = Math.round(radius);
        const query = `
            [out:json];
            node(around:${intRadius},${lat},${lng})["amenity"="${amenity}"];
            out;
        `;
        try {
            const response = await fetch("https://overpass-api.de/api/interpreter", {
                method: "POST",
                body: query,
                headers: {
                    "Content-Type": "text/plain"
                }
            });
            if (!response.ok) {
                setLoading(false);
                alert('Network error: ' + response.status + ' ' + response.statusText);
                return;
            }
            const data = await response.json();
            if (!data.elements) {
                setLoading(false);
                alert('No data returned from Overpass API.');
                return;
            }
            // Convert to GeoJSON features and add category
            const poiFeatures = data.elements
                .filter(el => el.type === "node" && el.lat && el.lon)
                .map(el => ({
                    type: "Feature",
                    geometry: {
                        type: "Point",
                        coordinates: [el.lon, el.lat]
                    },
                    properties: {
                        title: el.tags && (el.tags.name || amenity),
                        address: el.tags && (el.tags["addr:full"] || el.tags["addr:street"] || ""),
                        category: amenity,
                        annotationType: "Point",
                        id: uuidv1(),
                        title: "Sample Hospital",
                        category: "hospital"
                    },
                    style: {
                        iconGlyph: "glass",
                    }
                }));

                dispatch(addLayer({
                    id: "annotations:playground-samples",
                    title: "Sample Markers",
                    type: "vector",
                    features: poiFeatures,
                    style: {},
                    visibility: true,
                    rowViewer: "annotations"
                }));
                console.log("poiFeatures", poiFeatures);
              
            if (!poiFeatures.length) {
                setLoading(false);
                alert('No POIs found for the selected category and area.');
                return;
            }
            // Dispatch static points to DrawSupport

        } catch (e) {
            setLoading(false);
            alert('Error fetching POIs from Overpass API: ' + (e.message || e));
            return;
        }
        setLoading(false);
    };

 

    return (
        <Dialog floating title="Nearby" className="nearby-dialog" style={{marginLeft: 650}}>
            <div style={{ minWidth: 300, background: '#f8fafd', borderRadius: 8, boxShadow: '0 2px 8px #0001', padding: 12, border: '1px solid #bcd', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ marginBottom: 8 }}><b>Features:</b></div>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gridTemplateRows: 'repeat(2, 1fr)',
                    gap: 10,
                    marginBottom: 8,
                    marginRight: 1
                }}>
                    {POI_CATEGORIES.map((cat, idx) => (
                        <button
                            key={cat.key}
                            style={{
                                background: selectedCategory === cat.key ? '#337ab7' : '#e6f0fa',
                                color: selectedCategory === cat.key ? '#fff' : '#337ab7',
                                border: selectedCategory === cat.key ? '2px solid #337ab7' : '2px solid #e6f0fa',
                                borderRadius: 16,
                                padding: '12px 0 4px 0',
                                minWidth: 70,
                                minHeight: 60,
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                boxShadow: selectedCategory === cat.key ? '0 2px 8px #337ab733' : 'none',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                fontSize: 15,
                                width: '100%',
                                gridColumn: idx < 3 ? (idx + 1) : (idx === 3 ? '1 / 3' : '3'),
                                gridRow: idx < 3 ? 1 : 2
                            }}
                            onClick={() => setSelectedCategory(cat.key)}
                        >
                            <Glyphicon glyph={cat.icon} style={{ fontSize: 24, marginBottom: 4 }} />
                            <span>{cat.label}</span>
                        </button>
                    ))}
                </div>
                <div style={{ marginBottom: 8 }}>
                    <b>Select POI Range:</b>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 8, marginTop: 6 }}>
                        <input
                            type="range"
                            min={1}
                            max={50}
                            value={range}
                            onChange={e => {
                                setRange(Number(e.target.value));
                                let radius = unit === 'km'
                                    ? Number(e.target.value) * 1000
                                    : Number(e.target.value);

                                let center = null;
                                let sourceFeatures = features && features.length > 0 ? features : tempFeatures;
                                if (sourceFeatures && sourceFeatures.length > 0) {
                                    const f = sourceFeatures[0];
                                    if (f.geometry && f.geometry.type === 'Point' && Array.isArray(f.geometry.coordinates)) {
                                        center = f.geometry.coordinates;
                                    } else if (f.geometry && f.geometry.type === 'Circle' && Array.isArray(f.geometry.center)) {
                                        center = f.geometry.center;
                                    } else if (Array.isArray(f.center)) {
                                        center = f.center;
                                    } else if (f.properties && Array.isArray(f.properties.center)) {
                                        center = f.properties.center;
                                    }
                                }
                                if (!center) {
                                    alert('No valid feature found. Please draw a point or circle on the map.');
                                    return;
                                }
                                const circlePolygon = createCirclePolygon(center, radius);
                                const dynamicCircle = [{
                                    type: 'Feature',
                                    geometry: circlePolygon,
                                    properties: { label: 'Dynamic Circle', center, radius, unit }
                                }];
                                dispatch(changeDrawingStatus(
                                    'replace',
                                    'Polygon',
                                    'playground',
                                    dynamicCircle,
                                    { stopAfterDrawing: false }
                                ));
                            }}
                            style={{ width: '100%' }}
                        />
                       
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{
                                background: '#337ab7',
                                color: '#fff',
                                borderRadius: 12,
                                padding: '2px 12px',
                                fontWeight: 'bold',
                                fontSize: 15,
                                minWidth: 48,
                                textAlign: 'center',
                                marginLeft: 0
                            }}>{range} {unit.toUpperCase()}</div>
                            <select value={unit} onChange={e => setUnit(e.target.value)} style={{ borderRadius: 6, border: '1px solid #337ab7', color: '#337ab7', fontWeight: 'bold', padding: '2px 6px' }}>
                                <option value="km">KM</option>
                                <option value="m">M</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div style={{ marginBottom: 8 }}>
                    <b>Draw:</b>
                    <div style={{ border: '1px solid #bcd', borderRadius: 8, background: '#fff', padding: 8, marginTop: 6, display: 'flex', gap: 10, justifyContent: 'flex-start' }}>
                        <button
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, padding: 4 }}
                            title="Draw Circle"
                            onClick={() => handleDrawClick('Circle')}
                        >
                            <Glyphicon glyph="1-circle-add" />
                        </button>
                    </div>
                </div>
                <button
                    style={{
                        background: '#337ab7',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        padding: '10px 0',
                        fontWeight: 'bold',
                        fontSize: 16,
                        cursor: 'pointer',
                        boxShadow: '0 1px 4px #337ab733',
                        width: '100%',
                        marginBottom: 8
                    }}
                    onClick={() => {
                        const samplePOIs = [
                            {
                                type: "Feature",
                                geometry: {
                                    type: "Point",
                                    coordinates: [46.6753, 24.7136]
                                },
                                properties: {
                                    annotationType: "Point",
                                    id: uuidv1(),
                                    title: "Sample Restaurant",
                                    category: "restaurant"
                                },
                                style: {
                                    iconGlyph: "glass",
                                }
                            },
                            {
                                type: "Feature",
                                geometry: {
                                    type: "Point",
                                    coordinates: [46.6780, 24.7150]
                                },
                                properties: {
                                    annotationType: "Point",
                                    id: uuidv1(),
                                    title: "Sample Hospital",
                                    category: "hospital"
                                },
                                style: {
                                    iconGlyph: "glass",
                                }
                            }
                        ];
                        dispatch(addLayer({
                            id: "annotations:playground-samples",
                            title: "Sample Markers",
                            type: "vector",
                            features: samplePOIs,
                            style: {},
                            visibility: true,
                            rowViewer: "annotations"
                        }));
                    }}
                >
                    Add Sample Points
                </button>
                {DrawSupport && <DrawSupport drawOwner="playground" />}
                <button
                    style={{ background: '#337ab7', color: '#fff', border: 'none', borderRadius: 4, padding: '10px 0', fontWeight: 'bold', fontSize: 16, cursor: loading ? 'wait' : 'pointer', boxShadow: '0 1px 4px #337ab733', width: '100%', marginTop: 8 }}
                    onClick={handleNearbySearch}
                    disabled={loading}
                >
                    {loading ? 'Searching...' : 'Search'}
                </button>
                            
                <button
                    style={{ background: '#fff', color: '#337ab7', border: '1.5px solid #337ab7', borderRadius: 4, padding: '10px 0', fontWeight: 'bold', fontSize: 16, cursor: 'pointer', boxShadow: '0 1px 4px #337ab733', width: '100%' }}
                    onClick={() => {
                        dispatch(changeDrawingStatus('clean', '', 'playground', [], {}));
                    }}
                >
                    Reset
                </button>
                {/* <button
                    style={{ margin: '8px 0', background: '#eee', color: '#337ab7', border: '1px solid #337ab7', borderRadius: 6, padding: '8px 0', fontWeight: 'bold', fontSize: 15, cursor: 'pointer', width: '100%' }}
                    onClick={() => {
                        const center = [12.4924, 41.8902]; // Rome, Colosseum
                        const radius = range * (unit === 'km' ? 1000 : 1); // meters
                        const circlePolygon = createCirclePolygon(center, radius);
                        const staticCircle = [{
                            type: 'Feature',
                            geometry: circlePolygon,
                            properties: { label: 'Static Circle', center, radius, unit }
                        }];
                        dispatch(changeDrawingStatus(
                            'replace',
                            'Polygon',
                            'playground',
                            staticCircle,
                            { stopAfterDrawing: false }
                        ));
                    }}
                >
                    Add Static Circle (Rome)
                </button>
                <div style={{ marginTop: 18 }}>
                    <h5>Drawn features as JSON (Here):</h5>
                    <pre style={{ maxHeight: 200, overflow: 'auto', background: '#f7f7f7', padding: 8 }}>
                        {JSON.stringify(features, null, 2)}
                    </pre>
                </div> */}
            </div>
        </Dialog>
    );
};

import { Glyphicon } from 'react-bootstrap';
import Message from './locale/Message';

// this is the empty reducer file to work with.
import reducer from '../reducers/playground';

// SAMPLE CONNECTIONS TO THE STATE
const ConnectedPlugin = connect(
    state => ({
        text: state.playground.text,
        tempFeatures: state.draw && state.draw.tempFeatures,
        features: state.draw && state.draw.features
    })
)(Playground);


// control actions/reducer
// it's useful to store simple setting like open closed dialogs and so on here, in order
// to be reset on map load
import { toggleControl } from '../actions/controls';
import Sidebar from 'react-sidebar';
import { changeDrawingStatus, drawingFeatures } from '../actions/draw';
import { changedGeometriesSelector } from '../selectors/draw';

/**
 * PlaygroundPlugin. A dialog window that can be opened from the burger menu.
 * This is a good point to start developing your plugin.
 * - Connect the state to Playground component
 * - Connect actions to dispatch to the Playground component (create an actionCreators file for custom actions)
 * - Edit your reducers/playground.js file to handle the `playground` piece of global redux state.
 * - Add epics...
 */
export default createPlugin("Playground", {
    component: ConnectedPlugin,
    containers: {
        SidebarMenu: {
            name: 'about',
            position: 1500,
            text: <Message msgId="settings"/>,
            icon: <Glyphicon glyph="heart" />,
            action: toggleControl.bind(null, CONTROL_NAME, null),
            priority: 1,
            doNotHide: true
        }
    },
    reducers: {
        playground: reducer // REDUCER will be used to create the `playground` part of global redux state (keys of the "reducers" are pieces of state)
    }
});