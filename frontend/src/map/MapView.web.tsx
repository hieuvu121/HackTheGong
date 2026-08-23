import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
// v5 (not v6): v5 ships a UMD bundle with an inlined worker. v6 is ESM-only
// with a separate module worker that Metro cannot emit, which silently breaks
// tile loading. Do not upgrade without re-verifying tiles actually render.
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapViewProps, STYLE_URL } from './types';
import { routeFeature, pointFeatureCollection, circleFeatureCollection } from './geojson';
import { HazardPin } from '../components/HazardPin';
import { hazardPinState } from '../lib/pins';
import { isHazardActiveAt } from '../lib/time';
import { Hazard, KIND_LABEL } from '../data/types';
import { colors } from '../theme/tokens';

export default function MapView(props: MapViewProps) {
  const el = useRef<HTMLDivElement | null>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const cb = useRef(props.onHazardPress);
  cb.current = props.onHazardPress;

  // Hazard pins are real React views anchored by maplibre-gl Markers, not
  // circle layers — a layer cannot host an animated glyph. Markers are created
  // imperatively, then HazardPin is portalled into each marker's element so
  // both platforms render the exact same component.
  const markers = useRef(new Map<string, maplibregl.Marker>());
  const [slots, setSlots] = useState<{ hazard: Hazard; el: HTMLElement }[]>([]);

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

      m.addSource('gate', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addLayer({
        id: 'gate-fill',
        type: 'fill',
        source: 'gate',
        paint: { 'fill-color': colors.ink, 'fill-opacity': 0.06 },
      });
      m.addLayer({
        id: 'gate-outline',
        type: 'line',
        source: 'gate',
        paint: { 'line-color': colors.ink, 'line-width': 2, 'line-dasharray': [2, 2] },
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
    });

    // RN Web lays the flex parent out after mount, so the map can initialise
    // against a zero-size container and then never request tiles. Watching the
    // container and calling resize() is what makes tiles actually load.
    const ro = new ResizeObserver(() => m.resize());
    ro.observe(el.current);

    const live = markers.current;
    return () => {
      ro.disconnect();
      live.forEach((marker) => marker.remove());
      live.clear();
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
      const rs = m.getSource('routes') as maplibregl.GeoJSONSource | undefined;
      rs?.setData({
        type: 'FeatureCollection',
        features: (props.routes ?? []).map((r) => routeFeature(r, r.id === props.activeRouteId)),
      } as never);

      const us = m.getSource('user') as maplibregl.GeoJSONSource | undefined;
      us?.setData(
        pointFeatureCollection(props.userLocation ? [props.userLocation] : []) as never,
      );

      const gs = m.getSource('gate') as maplibregl.GeoJSONSource | undefined;
      gs?.setData(
        (props.gateCircle
          ? circleFeatureCollection(props.gateCircle.center, props.gateCircle.radiusM)
          : { type: 'FeatureCollection', features: [] }) as never,
      );
    };

    if (m.isStyleLoaded()) apply();
    else m.once('load', apply);
  }, [props.routes, props.activeRouteId, props.userLocation, props.gateCircle]);

  // Reconcile one marker per hazard, reusing the element so the ping animation
  // is not restarted every time the hazard list is recomputed.
  useEffect(() => {
    const m = map.current;
    if (!m) return;

    const live = markers.current;
    const seen = new Set<string>();
    const next: { hazard: Hazard; el: HTMLElement }[] = [];

    for (const h of props.hazards ?? []) {
      seen.add(h.id);
      let marker = live.get(h.id);
      if (marker) {
        marker.setLngLat([h.coord.lng, h.coord.lat]);
      } else {
        marker = new maplibregl.Marker({ element: document.createElement('div') })
          .setLngLat([h.coord.lng, h.coord.lat])
          .addTo(m);
        live.set(h.id, marker);
      }
      next.push({ hazard: h, el: marker.getElement() });
    }

    for (const [id, marker] of live) {
      if (!seen.has(id)) {
        marker.remove();
        live.delete(id);
      }
    }

    setSlots(next);
  }, [props.hazards]);

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
    // constructor) — re-applying them here would undo the rider's pinch. The
    // locate button is the one exception, and it says so by bumping the nonce.
    if (!props.follow && !props.recenterNonce) return;

    m.easeTo({
      center: [props.center.lng, props.center.lat],
      zoom: props.zoom ?? 14,
      bearing: props.followBearing ?? 0,
      duration: props.follow ? 100 : 600,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    props.center.lng,
    props.center.lat,
    props.zoom,
    props.followBearing,
    props.follow,
    props.recenterNonce,
    fitKey,
  ]);

  return (
    <>
      <div ref={el} style={{ position: 'absolute', inset: 0, ...(props.style as object) }} />
      {slots.map(({ hazard, el: host }) =>
        createPortal(
          <HazardPin
            level={hazard.dangerLevel}
            state={hazardPinState(hazard)}
            label={`${KIND_LABEL[hazard.kind]} on ${hazard.streetName}`}
            onPress={() => cb.current?.(hazard.id)}
          />,
          host,
          hazard.id,
        ),
      )}
    </>
  );
}
