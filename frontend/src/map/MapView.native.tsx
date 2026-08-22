import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Map, Camera, GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';
import type { FeatureCollection } from 'geojson';
import { MapViewProps, STYLE_URL } from './types';
import { hazardFeatureCollection, routeFeature, pointFeatureCollection } from './geojson';
import { colors } from '../theme/tokens';

/**
 * Native counterpart of MapView.web.tsx. Same style URL, same layer ids and
 * paint properties, so the map reads identically on both platforms.
 */
export default function MapView(props: MapViewProps) {
  const hazards = useMemo(
    () => hazardFeatureCollection(props.hazards ?? []) as FeatureCollection,
    [props.hazards],
  );

  const routes = useMemo(
    () =>
      ({
        type: 'FeatureCollection',
        features: (props.routes ?? []).map((r) => routeFeature(r, r.id === props.activeRouteId)),
      }) as FeatureCollection,
    [props.routes, props.activeRouteId],
  );

  const user = useMemo(
    () =>
      pointFeatureCollection(props.userLocation ? [props.userLocation] : []) as FeatureCollection,
    [props.userLocation],
  );

  // Captured once: later prop changes must not re-seat a camera the rider is driving.
  const initialViewState = useMemo(
    () => ({ center: [props.center.lng, props.center.lat] as [number, number], zoom: props.zoom ?? 14 }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Frame a route when asked, otherwise follow the centre.
  const bounds = useMemo(() => {
    if (!props.fitTo || props.fitTo.length < 2) return undefined;
    const lngs = props.fitTo.map((p) => p.lng);
    const lats = props.fitTo.map((p) => p.lat);
    return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)] as [
      number,
      number,
      number,
      number,
    ];
  }, [props.fitTo]);

  return (
    <Map style={StyleSheet.absoluteFill} mapStyle={STYLE_URL} logo={false} attribution={false}>
      {bounds ? (
        <Camera bounds={bounds} padding={props.fitPadding} duration={600} />
      ) : props.follow ? (
        <Camera
          center={[props.center.lng, props.center.lat]}
          zoom={props.zoom ?? 14}
          bearing={props.followBearing ?? 0}
          duration={600}
        />
      ) : (
        // Initial view only — a controlled Camera would fight the rider's pinch.
        // Must be a stable object, or the camera re-seats on every render.
        <Camera initialViewState={initialViewState} />
      )}

      <GeoJSONSource id="routes" data={routes}>
        <Layer
          id="routes-casing"
          type="line"
          layout={{ 'line-join': 'round', 'line-cap': 'round' }}
          paint={{
            'line-color': colors.canvas,
            'line-width': ['case', ['get', 'active'], 10, 6],
            'line-opacity': ['case', ['get', 'active'], 1, 0.5],
          }}
        />
        <Layer
          id="routes-line"
          type="line"
          layout={{ 'line-join': 'round', 'line-cap': 'round' }}
          paint={{
            'line-color': ['case', ['get', 'active'], colors.ink, colors.mute],
            'line-width': ['case', ['get', 'active'], 6, 4],
            'line-opacity': ['case', ['get', 'active'], 1, 0.55],
          }}
        />
      </GeoJSONSource>

      <GeoJSONSource id="user" data={user}>
        <Layer
          id="user-halo"
          type="circle"
          paint={{ 'circle-radius': 18, 'circle-color': colors.ink, 'circle-opacity': 0.12 }}
        />
        <Layer
          id="user-dot"
          type="circle"
          paint={{
            'circle-radius': 8,
            'circle-color': colors.ink,
            'circle-stroke-width': 3,
            'circle-stroke-color': colors.canvas,
          }}
        />
      </GeoJSONSource>

      <GeoJSONSource
        id="hazards"
        data={hazards}
        onPress={(e) => {
          const id = e.nativeEvent.features?.[0]?.properties?.id;
          if (id) props.onHazardPress?.(String(id));
        }}
      >
        <Layer
          id="hazards-halo"
          type="circle"
          paint={{ 'circle-radius': 16, 'circle-color': ['get', 'color'], 'circle-opacity': 0.18 }}
        />
        <Layer
          id="hazards-dot"
          type="circle"
          paint={{
            'circle-radius': 8,
            'circle-color': ['get', 'color'],
            'circle-stroke-width': 3,
            'circle-stroke-color': colors.canvas,
          }}
        />
      </GeoJSONSource>
    </Map>
  );
}
