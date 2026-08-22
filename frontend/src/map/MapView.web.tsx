import React, { useEffect, useRef } from 'react';
// v5 (not v6): v5 ships a UMD bundle with an inlined worker. v6 is ESM-only
// with a separate module worker that Metro cannot emit, which silently breaks
// tile loading. Do not upgrade without re-verifying tiles actually render.
import maplibregl, { MapLayerMouseEvent } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapViewProps, STYLE_URL } from './types';
import { hazardFeatureCollection, routeFeature, pointFeatureCollection } from './geojson';
import { colors } from '../theme/tokens';

export default function MapView(props: MapViewProps) {
  const el = useRef<HTMLDivElement | null>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const cb = useRef(props.onHazardPress);
  cb.current = props.onHazardPress;

  useEffect(() => {
    if (!el.current || map.current) return;

    const m = new maplibregl.Map({
      container: el.current,
      style: STYLE_URL,
      center: [props.center.lng, props.center.lat],
      zoom: props.zoom ?? 14,
      attributionControl: false,
    });
    map.current = m;

    // MapLibre swallows tile/style failures unless you listen for them.
    m.on('error', (e) => console.error('[maplibre]', e.error?.message ?? e));
    if (__DEV__) (globalThis as Record<string, unknown>).__map = m;

    m.on('load', () => {
      // Routes render beneath hazards so pins stay tappable.
      m.addSource('routes', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      m.addLayer({
        id: 'routes-casing',
        type: 'line',
        source: 'routes',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': colors.canvas,
          'line-width': ['case', ['get', 'active'], 10, 6],
          'line-opacity': ['case', ['get', 'active'], 1, 0.5],
        },
      });
      m.addLayer({
        id: 'routes-line',
        type: 'line',
        source: 'routes',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': ['case', ['get', 'active'], colors.ink, colors.mute],
          'line-width': ['case', ['get', 'active'], 6, 4],
          'line-opacity': ['case', ['get', 'active'], 1, 0.55],
        },
      });

      m.addSource('user', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addLayer({
        id: 'user-halo',
        type: 'circle',
        source: 'user',
        paint: { 'circle-radius': 18, 'circle-color': colors.ink, 'circle-opacity': 0.12 },
      });
      m.addLayer({
        id: 'user-dot',
        type: 'circle',
        source: 'user',
        paint: {
          'circle-radius': 8,
          'circle-color': colors.ink,
          'circle-stroke-width': 3,
          'circle-stroke-color': colors.canvas,
        },
      });

      m.addSource('hazards', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      m.addLayer({
        id: 'hazards-halo',
        type: 'circle',
        source: 'hazards',
        paint: { 'circle-radius': 16, 'circle-color': ['get', 'color'], 'circle-opacity': 0.18 },
      });
      m.addLayer({
        id: 'hazards-dot',
        type: 'circle',
        source: 'hazards',
        paint: {
          'circle-radius': 8,
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 3,
          'circle-stroke-color': colors.canvas,
        },
      });

      m.on('click', 'hazards-dot', (e: MapLayerMouseEvent) => {
        const id = e.features?.[0]?.properties?.id;
        if (id) cb.current?.(String(id));
      });
      m.on('mouseenter', 'hazards-dot', () => {
        m.getCanvas().style.cursor = 'pointer';
      });
      m.on('mouseleave', 'hazards-dot', () => {
        m.getCanvas().style.cursor = '';
      });
    });

    // RN Web lays the flex parent out after mount, so the map can initialise
    // against a zero-size container and then never request tiles. Watching the
    // container and calling resize() is what makes tiles actually load.
    const ro = new ResizeObserver(() => m.resize());
    ro.observe(el.current);

    return () => {
      ro.disconnect();
      m.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push data updates
  useEffect(() => {
    const m = map.current;
    if (!m) return;

    const apply = () => {
      const hs = m.getSource('hazards') as maplibregl.GeoJSONSource | undefined;
      hs?.setData(hazardFeatureCollection(props.hazards ?? []) as never);

      const rs = m.getSource('routes') as maplibregl.GeoJSONSource | undefined;
      rs?.setData({
        type: 'FeatureCollection',
        features: (props.routes ?? []).map((r) => routeFeature(r, r.id === props.activeRouteId)),
      } as never);

      const us = m.getSource('user') as maplibregl.GeoJSONSource | undefined;
      us?.setData(
        pointFeatureCollection(props.userLocation ? [props.userLocation] : []) as never,
      );
    };

    if (m.isStyleLoaded()) apply();
    else m.once('load', apply);
  }, [props.hazards, props.routes, props.activeRouteId, props.userLocation]);

  // Follow the camera, or frame a route
  const fitKey = props.fitTo
    ? `${props.fitTo.length}:${props.fitTo[0]?.lng},${props.fitTo[props.fitTo.length - 1]?.lat}`
    : '';

  useEffect(() => {
    const m = map.current;
    if (!m) return;

    if (props.fitTo && props.fitTo.length > 1) {
      const b = new maplibregl.LngLatBounds();
      for (const p of props.fitTo) b.extend([p.lng, p.lat]);
      m.fitBounds(b, {
        padding: props.fitPadding ?? { top: 60, bottom: 60, left: 40, right: 40 },
        duration: 600,
        maxZoom: 15,
      });
      return;
    }

    // Without follow, center/zoom are the initial view (set in the
    // constructor) — re-applying them here would undo the rider's pinch.
    if (!props.follow) return;

    m.easeTo({
      center: [props.center.lng, props.center.lat],
      zoom: props.zoom ?? 14,
      bearing: props.followBearing ?? 0,
      duration: 600,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.center.lng, props.center.lat, props.zoom, props.followBearing, props.follow, fitKey]);

  return <div ref={el} style={{ position: 'absolute', inset: 0, ...(props.style as object) }} />;
}
