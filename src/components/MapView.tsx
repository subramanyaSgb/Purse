import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Leaflet's default marker icon URLs are baked into the bundle by url() at
// build time and break when a bundler doesn't expose them. Configure the
// classic CDN URLs so the marker shows up without us bundling pngs.
const DEFAULT_ICON = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export type MapViewProps = {
  lat: number;
  lng: number;
  /** When provided, dragging the marker / tapping the map fires this. */
  onChange?: (lat: number, lng: number) => void;
  height?: string;
  zoom?: number;
};

function FlyToProp({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], zoom, { duration: 0.4 });
  }, [map, lat, lng, zoom]);
  return null;
}

function ClickToPick({ onChange }: { onChange?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onChange?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/**
 * Small Leaflet wrapper used by Manage Places (drag the pin to fix typos)
 * and the upcoming PlacePicker in Phase 4.
 *
 * `onChange` makes the marker draggable AND lets the user tap on the map
 * to pick a new spot. Omit it for read-only display.
 */
export function MapView({ lat, lng, onChange, height = '240px', zoom = 14 }: MapViewProps) {
  const markerRef = useRef<L.Marker | null>(null);
  const draggable = !!onChange;

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const m = markerRef.current;
        if (!m || !onChange) return;
        const { lat: latNew, lng: lngNew } = m.getLatLng();
        onChange(latNew, lngNew);
      },
    }),
    [onChange],
  );

  return (
    <div style={{ height }} className="overflow-hidden rounded-md border">
      <MapContainer
        center={[lat, lng]}
        zoom={zoom}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
        attributionControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker
          position={[lat, lng]}
          draggable={draggable}
          icon={DEFAULT_ICON}
          eventHandlers={eventHandlers}
          ref={(m) => {
            markerRef.current = m;
          }}
        />
        <FlyToProp lat={lat} lng={lng} zoom={zoom} />
        {onChange ? <ClickToPick onChange={onChange} /> : null}
      </MapContainer>
    </div>
  );
}
