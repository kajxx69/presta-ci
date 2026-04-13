import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker, useMapEvents, Polyline, LayersControl, ScaleControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';


delete (L.Icon.Default as any).prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export interface MapMarker {
  id: number;
  position: [number, number]; // [lat, lng]
  title: string;
  subtitle?: string;
  rating?: number;
}

interface MapViewProps {
  center: [number, number];
  zoom?: number;
  markers: MapMarker[];
  className?: string;
  style?: React.CSSProperties;
  userLocation?: [number, number];
  onMapClick?: (coords: { lat: number; lng: number }) => void;
  selectedPosition?: [number, number];
  onMarkerClick?: (marker: MapMarker) => void;
  route?: [number, number][]; // polyline as [lat, lng]
}

function FitBounds({ markers, userLocation }: { markers: MapMarker[]; userLocation?: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    const points: [number, number][] = [
      ...markers.map(m => m.position),
      ...(userLocation ? [userLocation] : []),
    ];
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], Math.max(map.getZoom(), 13));
      return;
    }
    const bounds = L.latLngBounds(points.map(p => L.latLng(p[0], p[1])));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, markers, userLocation]);
  return null;
}

function ClickHandler({ onMapClick }: { onMapClick?: (coords: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click(e) {
      if (onMapClick) onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

const baseLayers = [
  {
    name: 'Standard',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    checked: true
  },
  {
    name: 'Voyager',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://carto.com/">CARTO</a>',
  },
  {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri',
  }
];

export default function MapView({ center, zoom = 12, markers, className, style, userLocation, onMapClick, selectedPosition, onMarkerClick, route }: MapViewProps) {

  return (
    <div className={className} style={style}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '340px', width: '100%', borderRadius: 16, boxShadow: '0 6px 24px rgba(0,0,0,0.08)' }}
        scrollWheelZoom={true}
        minZoom={3}
      >
        <ScaleControl position="bottomleft" />
        <ClickHandler onMapClick={onMapClick} />
        <LayersControl position="topright">
          {baseLayers.map(layer => (
            <LayersControl.BaseLayer key={layer.name} name={layer.name} checked={layer.checked}>
              <TileLayer attribution={layer.attribution} url={layer.url} />
            </LayersControl.BaseLayer>
          ))}
        </LayersControl>
        <FitBounds markers={markers} userLocation={userLocation} />
        {selectedPosition && (
          <Marker position={selectedPosition}>
            <Popup>Emplacement sélectionné</Popup>
          </Marker>
        )}
        {userLocation && (
          <>
            <CircleMarker center={userLocation} radius={8} pathOptions={{ color: '#2563EB', fillColor: '#60A5FA', fillOpacity: 0.7 }} />
            <Marker position={userLocation}>
              <Popup>
                <div>
                  <div className="font-semibold">Vous êtes ici</div>
                </div>
              </Popup>
            </Marker>
          </>
        )}
        {markers.map(m => (
          <Marker key={m.id} position={m.position} eventHandlers={onMarkerClick ? { click: () => onMarkerClick(m) } : undefined}>
            <Popup>
              <div className="space-y-1">
                <div className="font-semibold">{m.title}</div>
                {m.rating !== undefined && (
                  <div className="flex items-center text-sm">
                    <span className="text-yellow-500 mr-1">★</span>
                    <span>{m.rating.toFixed(1)}</span>
                  </div>
                )}
                {m.subtitle && <div className="text-sm text-gray-600">{m.subtitle}</div>}
              </div>
            </Popup>
          </Marker>
        ))}
        {Array.isArray(route) && route.length > 1 && (
          <Polyline positions={route} pathOptions={{ color: '#2563EB', weight: 5, opacity: 0.85 }} />
        )}
      </MapContainer>
    </div>
  );
}
