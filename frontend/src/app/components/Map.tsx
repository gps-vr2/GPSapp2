'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import 'leaflet/dist/leaflet.css';

// Extend HTMLElement to avoid `any` and support Leaflet internal properties
interface LeafletHTMLElement extends HTMLElement {
  _leaflet_id?: number;
}

interface MapProps {
  center: [number, number];
  pins?: { id: number; position: [number, number]; title: string }[];
  zoom: number;
  draggable?: boolean;
  showMarker?: boolean;
  showDraggablePin?: boolean;
  markerPosition?: [number, number];
  instructionText?: string;
  height?: string;
  onPositionChange?: (position: [number, number]) => void;
  onMapDoubleClick?: (position: [number, number]) => void;
  mapView?: 'map' | 'satellite';
  onMapMoveEnd?: (lat: number, lng: number) => void;
  showViewToggle?: boolean;
  userLocation?: [number, number] | null;
}

const Map: React.FC<MapProps> = ({
  center,
  pins = [],
  zoom,
  showMarker = false,
  showDraggablePin = false,
  markerPosition,
  height = '100%',
  onPositionChange,
  onMapDoubleClick,
  mapView = 'map',
  onMapMoveEnd,
  showViewToggle = false,
  userLocation,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const pinMarkersRef = useRef<L.Marker[]>([]);
  const userLocationMarkerRef = useRef<L.Marker | null>(null);
  const isInitializedRef = useRef(false);
  const [currentMapView, setCurrentMapView] = useState<'map' | 'satellite'>(mapView);

  const handlePositionChange = useCallback((position: [number, number]) => {
    onPositionChange?.(position);
  }, [onPositionChange]);

  const handleMapDoubleClick = useCallback((position: [number, number]) => {
    onMapDoubleClick?.(position);
  }, [onMapDoubleClick]);

  useEffect(() => {
    if (!mapRef.current) return;

    // 🧹 Fix "Map container is already initialized"
    if ((mapRef.current as LeafletHTMLElement)._leaflet_id) {
      delete (mapRef.current as LeafletHTMLElement)._leaflet_id;
    }

    const initializeMap = async () => {
      const L = await import('leaflet');
      const map = L.map(mapRef.current!, {
        minZoom: 1,
        maxZoom: 20,
        zoomControl: true,
        scrollWheelZoom: true,
        doubleClickZoom: false,
        touchZoom: true,
        dragging: true,
        zoomSnap: 1,
        zoomDelta: 1,
      }).setView(center, zoom);
      mapInstanceRef.current = map;
      isInitializedRef.current = true;

      // Tile layer
      const getTileLayer = (view: string) =>
        view === 'satellite'
          ? L.tileLayer(
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
              { attribution: 'Tiles © Esri', minZoom: 1, maxZoom: 20 }
            )
          : L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '&copy; Ventu renewable contributors',
              minZoom: 1,
              maxZoom: 20,
            });

      tileLayerRef.current = getTileLayer(currentMapView);
      tileLayerRef.current.addTo(map);

      map.on('moveend', () => {
        const center = map.getCenter();
        onMapMoveEnd?.(center.lat, center.lng);
      });

      map.on('dblclick', (e) => {
        const pos: [number, number] = [e.latlng.lat, e.latlng.lng];
        handleMapDoubleClick(pos);
        handlePositionChange(pos);
        markerRef.current?.setLatLng(e.latlng);
      });

      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    };

    initializeMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.off();
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
        tileLayerRef.current = null;
        pinMarkersRef.current = [];
        userLocationMarkerRef.current = null;
        isInitializedRef.current = false;
      }
    };
  }, []);

  useEffect(() => {
    if (mapInstanceRef.current && isInitializedRef.current) {
      const currentCenter = mapInstanceRef.current.getCenter();
      const currentZoom = mapInstanceRef.current.getZoom();
      if (
        Math.abs(currentCenter.lat - center[0]) > 0.00001 ||
        Math.abs(currentCenter.lng - center[1]) > 0.00001 ||
        currentZoom !== zoom
      ) {
        mapInstanceRef.current.setView(center, zoom, { animate: true });
      }
    }
  }, [center, zoom]);

  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current || !isInitializedRef.current) return;

    const updateTileLayer = async () => {
      const L = await import('leaflet');
      mapInstanceRef.current!.removeLayer(tileLayerRef.current!);

      tileLayerRef.current = currentMapView === 'satellite'
        ? L.tileLayer(
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            { attribution: 'Tiles © Esri', minZoom: 1, maxZoom: 20 }
          )
        : L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; Ventu renewable contributors',
            minZoom: 1,
            maxZoom: 20,
          });

      tileLayerRef.current.addTo(mapInstanceRef.current!);
    };

    updateTileLayer();
  }, [currentMapView]);

  useEffect(() => {
    if (!mapInstanceRef.current || !isInitializedRef.current) return;

    const updateUserMarker = async () => {
      const L = await import('leaflet');
      if (userLocationMarkerRef.current) {
        mapInstanceRef.current!.removeLayer(userLocationMarkerRef.current);
        userLocationMarkerRef.current = null;
      }

      if (userLocation) {
        const userIcon = L.icon({
          iconUrl: '/xy.png',
          iconSize: [48, 55],
          iconAnchor: [24, 48],
          popupAnchor: [0, -24],
        });

        userLocationMarkerRef.current = L.marker(userLocation, {
          icon: userIcon,
          title: 'Your Location',
        })
          .addTo(mapInstanceRef.current!)
          .bindPopup('Your Current Location');
      }
    };

    updateUserMarker();
  }, [userLocation]);

  useEffect(() => {
    if (!mapInstanceRef.current || !isInitializedRef.current) return;

    const updateMarker = async () => {
      const L = await import('leaflet');

      if (markerRef.current) {
        mapInstanceRef.current!.removeLayer(markerRef.current);
        markerRef.current = null;
      }

      if (showMarker || showDraggablePin) {
        const pos = markerPosition || center;

        const icon = L.icon({
          iconUrl: '/xy.png',
          iconSize: [48, 55],
          iconAnchor: [24, 48],
          popupAnchor: [0, -48],
          shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
          shadowSize: [41, 41],
          shadowAnchor: [12, 41],
        });

        markerRef.current = L.marker(pos, {
          icon,
          draggable: false,
        }).addTo(mapInstanceRef.current!);
      }
    };

    updateMarker();
  }, [showMarker, showDraggablePin, markerPosition, center]);

  useEffect(() => {
    if (!mapInstanceRef.current || !isInitializedRef.current) return;

    const updatePins = async () => {
      const L = await import('leaflet');

      pinMarkersRef.current.forEach(marker => {
        mapInstanceRef.current!.removeLayer(marker);
      });
      pinMarkersRef.current = [];

      pins.forEach(pin => {
        const pinMarker = L.marker(pin.position, {
          title: pin.title,
          icon: L.icon({
            iconUrl: '/pin 48px.png',
            iconSize: [48, 48],
            iconAnchor: [24, 48],
            popupAnchor: [0, -48],
            shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
            shadowSize: [41, 41],
            shadowAnchor: [12, 41],
          }),
        })
          .addTo(mapInstanceRef.current!)
          .bindPopup(pin.title);

        pinMarkersRef.current.push(pinMarker);
      });
    };

    updatePins();
  }, [pins]);

  const handleViewToggle = (view: 'map' | 'satellite') => {
    setCurrentMapView(view);
  };

  return (
    <div className="relative w-full" style={{ height }}>
      <div ref={mapRef} className="w-full h-full" />
      {showViewToggle && (
        <div className="absolute top-2 left-2 z-[1000] bg-white rounded-md shadow-md overflow-hidden">
          <button
            onClick={() => handleViewToggle('map')}
            className={`px-3 py-2 text-sm font-medium border-r ${
              currentMapView === 'map'
                ? 'bg-white text-black'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Map
          </button>
          <button
            onClick={() => handleViewToggle('satellite')}
            className={`px-3 py-2 text-sm font-medium ${
              currentMapView === 'satellite'
                ? 'bg-white text-black'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Satellite
          </button>
        </div>
      )}
    </div>
  );
};

export default Map;
