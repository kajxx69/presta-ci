import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Polyline, LayersControl, ScaleControl, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import { clsx } from 'clsx';
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
  type?: 'prestataire' | 'default';
}

const shopIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:38px;height:38px;border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);
    background:linear-gradient(135deg,#4f46e5,#7c3aed);
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 4px 12px rgba(79,70,229,0.45);border:2.5px solid #fff;
  ">
    <svg style="transform:rotate(45deg)" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  </div>`,
  iconSize: [38, 38],
  iconAnchor: [19, 38],
  popupAnchor: [0, -40],
});

const userIcon = L.divIcon({
  className: '',
  html: `<div style="position:relative;width:22px;height:22px;">
    <div style="
      position:absolute;inset:-10px;border-radius:50%;
      background:radial-gradient(circle, rgba(79,70,229,0.35) 0%, rgba(79,70,229,0) 70%);
      animation:presta-pulse 2.2s ease-out infinite;
    "></div>
    <div style="
      position:absolute;inset:0;border-radius:50%;
      background:#4f46e5;border:3px solid #fff;
      box-shadow:0 2px 8px rgba(79,70,229,0.5);
    "></div>
  </div>
  <style>
    @keyframes presta-pulse {
      0% { transform:scale(0.4); opacity:0.9; }
      100% { transform:scale(2.2); opacity:0; }
    }
  </style>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

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
    name: 'Voyager',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    checked: true
  },
  {
    name: 'Standard',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
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
    <div className={clsx('presta-map relative', className)} style={style}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '380px', width: '100%', borderRadius: 20 }}
        scrollWheelZoom={true}
        minZoom={3}
        zoomControl={false}
      >
        <ZoomControl position="bottomright" />
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
          <Marker position={userLocation} icon={userIcon} zIndexOffset={1000}>
            <Popup>
              <div className="font-semibold text-indigo-600">📍 Vous êtes ici</div>
            </Popup>
          </Marker>
        )}
        {markers.map(m => (
          <Marker key={m.id} position={m.position} icon={m.type === 'prestataire' ? shopIcon : undefined} eventHandlers={onMarkerClick ? { click: () => onMarkerClick(m) } : undefined}>
            <Popup>
              <div className="min-w-[160px] -m-1 p-1">
                <div className="font-bold text-gray-900 text-[13px] leading-tight mb-1">{m.title}</div>
                {m.rating !== undefined && (
                  <div className="flex items-center gap-1 text-xs mb-1">
                    <span className="text-amber-400">★</span>
                    <span className="font-semibold text-gray-700">{m.rating.toFixed(1)}</span>
                  </div>
                )}
                {m.subtitle && <div className="text-xs text-gray-500">{m.subtitle}</div>}
              </div>
            </Popup>
          </Marker>
        ))}
        {Array.isArray(route) && route.length > 1 && (
          <Polyline positions={route} pathOptions={{ color: '#4f46e5', weight: 5, opacity: 0.85 }} />
        )}
      </MapContainer>
    </div>
  );
}
