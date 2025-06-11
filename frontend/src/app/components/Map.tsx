'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import 'leaflet/dist/leaflet.css';

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

    if ((mapRef.current as LeafletHTMLElement)._leaflet_id) {
      delete (mapRef.current as LeafletHTMLElement)._leaflet_id;
    }

    const initializeMap = async () => {
      const L = await import('leaflet');
      const map = L.map(mapRef.current!, {
        minZoom: 1,
        maxZoom: 20,
        zoomControl: false,
        scrollWheelZoom: true,
        doubleClickZoom: false,
        touchZoom: true,
        dragging: true,
        zoomSnap: 1,
        zoomDelta: 1,
      }).setView(center, zoom);
      mapInstanceRef.current = map;
      isInitializedRef.current = true;

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
          .bindPopup(`
            <div style="
              position: relative;
              background: linear-gradient(135deg, 
                rgba(147, 51, 234, 1) 0%, 
                rgba(79, 70, 229, 1) 35%, 
                rgba(59, 130, 246, 1) 70%, 
                rgba(16, 185, 129, 1) 100%
              );
              backdrop-filter: blur(20px);
              border: 1px solid rgba(255, 255, 255, 0.1);
              border-radius: 24px;
              padding: 20px;
              box-shadow: 
                0 25px 50px rgba(0, 0, 0, 0.6),
                0 15px 35px rgba(147, 51, 234, 0.4),
                0 0 40px rgba(79, 70, 229, 0.3),
                inset 0 2px 0 rgba(255, 255, 255, 0.1),
                inset 0 -2px 0 rgba(0, 0, 0, 0.2);
              font-family: 'Inter', 'Segoe UI', sans-serif;
              color: white;
              max-width: 240px;
              min-height: 90px;
              font-size: 13px;
              overflow: hidden;
              animation: popIn 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55);
              margin: 0;
            ">
              
              <!-- Custom close button -->
              <button onclick="this.closest('.leaflet-popup').style.display='none'" style="
                position: absolute;
                top: 8px;
                right: 8px;
                background: rgba(255, 255, 255, 0.2);
                border: 1px solid rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                width: 24px;
                height: 24px;
                color: white;
                font-size: 14px;
                font-weight: bold;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                z-index: 20;
                backdrop-filter: blur(10px);
              " 
              onmouseover="this.style.background='rgba(255, 255, 255, 0.3)'"
              onmouseout="this.style.background='rgba(255, 255, 255, 0.2)'">×</button>
              
              <!-- Animated bubbles -->
              <div style="
                position: absolute;
                width: 8px;
                height: 8px;
                background: rgba(255, 255, 255, 0.4);
                border-radius: 50%;
                top: 80%;
                left: 10%;
                animation: bubble1 4s ease-in-out infinite;
                pointer-events: none;
              "></div>
              <div style="
                position: absolute;
                width: 12px;
                height: 12px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                top: 70%;
                left: 80%;
                animation: bubble2 5s ease-in-out infinite 0.5s;
                pointer-events: none;
              "></div>
              <div style="
                position: absolute;
                width: 6px;
                height: 6px;
                background: rgba(255, 255, 255, 0.5);
                border-radius: 50%;
                top: 90%;
                left: 50%;
                animation: bubble3 3.5s ease-in-out infinite 1s;
                pointer-events: none;
              "></div>
              <div style="
                position: absolute;
                width: 10px;
                height: 10px;
                background: rgba(255, 255, 255, 0.35);
                border-radius: 50%;
                top: 85%;
                left: 25%;
                animation: bubble4 4.5s ease-in-out infinite 1.5s;
                pointer-events: none;
              "></div>
              <div style="
                position: absolute;
                width: 7px;
                height: 7px;
                background: rgba(255, 255, 255, 0.4);
                border-radius: 50%;
                top: 75%;
                left: 70%;
                animation: bubble5 3.8s ease-in-out infinite 2s;
                pointer-events: none;
              "></div>
              <div style="
                position: absolute;
                width: 9px;
                height: 9px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                top: 95%;
                left: 15%;
                animation: bubble6 4.2s ease-in-out infinite 0.8s;
                pointer-events: none;
              "></div>
              
              <!-- Content -->
              <div style="position: relative; z-index: 10;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 14px;">
                  <div style="
                    padding: 8px; 
                    background: linear-gradient(45deg, rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0.15));
                    border-radius: 14px;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                  ">
                    🏢
                  </div>
                  <strong style="
                    font-size: 15px; 
                    line-height: 1.3;
                    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
                    font-weight: 600;
                  ">${pin.title || 'No address'}</strong>
                </div>
                <a href="/building/edit?id=${pin.id}"
                  style="
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    background: linear-gradient(135deg, 
                      rgba(255, 255, 255, 0.25) 0%, 
                      rgba(255, 255, 255, 0.1) 100%);
                    padding: 10px 18px;
                    border-radius: 16px;
                    color: white;
                    font-weight: 600;
                    font-size: 12px;
                    text-decoration: none;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                    position: relative;
                    overflow: hidden;
                  "
                  onmouseover="
                    this.style.background='linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.2) 100%)';
                    this.style.transform='translateY(-2px)';
                    this.style.boxShadow='0 8px 25px rgba(0, 0, 0, 0.3)';
                  "
                  onmouseout="
                    this.style.background='linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.1) 100%)';
                    this.style.transform='translateY(0)';
                    this.style.boxShadow='0 4px 15px rgba(0, 0, 0, 0.2)';
                  "
                >
                  ✏️ Edit
                </a>
              </div>
              
              <style>
                /* Hide default Leaflet popup styles */
                .leaflet-popup-content-wrapper {
                  background: transparent !important;
                  border-radius: 0 !important;
                  box-shadow: none !important;
                  padding: 0 !important;
                  margin: 0 !important;
                }
                
                .leaflet-popup-content {
                  margin: 0 !important;
                  padding: 0 !important;
                }
                
                .leaflet-popup-close-button {
                  display: none !important;
                }
                
                .leaflet-popup-tip-container {
                  display: none !important;
                }
                
                @keyframes popIn {
                  0% { 
                    opacity: 0; 
                    transform: translateY(30px) scale(0.8); 
                  }
                  100% { 
                    opacity: 1; 
                    transform: translateY(0) scale(1); 
                  }
                }
                
                @keyframes bubble1 {
                  0% { 
                    transform: translateY(0) scale(1);
                    opacity: 0;
                  }
                  10% {
                    opacity: 1;
                  }
                  90% {
                    opacity: 1;
                  }
                  100% { 
                    transform: translateY(-120px) scale(0.3);
                    opacity: 0;
                  }
                }
                
                @keyframes bubble2 {
                  0% { 
                    transform: translateY(0) scale(1);
                    opacity: 0;
                  }
                  10% {
                    opacity: 1;
                  }
                  90% {
                    opacity: 1;
                  }
                  100% { 
                    transform: translateY(-100px) scale(0.2);
                    opacity: 0;
                  }
                }
                
                @keyframes bubble3 {
                  0% { 
                    transform: translateY(0) scale(1);
                    opacity: 0;
                  }
                  10% {
                    opacity: 1;
                  }
                  90% {
                    opacity: 1;
                  }
                  100% { 
                    transform: translateY(-130px) scale(0.1);
                    opacity: 0;
                  }
                }
                
                @keyframes bubble4 {
                  0% { 
                    transform: translateY(0) scale(1);
                    opacity: 0;
                  }
                  10% {
                    opacity: 1;
                  }
                  90% {
                    opacity: 1;
                  }
                  100% { 
                    transform: translateY(-110px) scale(0.4);
                    opacity: 0;
                  }
                }
                
                @keyframes bubble5 {
                  0% { 
                    transform: translateY(0) scale(1);
                    opacity: 0;
                  }
                  10% {
                    opacity: 1;
                  }
                  90% {
                    opacity: 1;
                  }
                  100% { 
                    transform: translateY(-95px) scale(0.2);
                    opacity: 0;
                  }
                }
                
                @keyframes bubble6 {
                  0% { 
                    transform: translateY(0) scale(1);
                    opacity: 0;
                  }
                  10% {
                    opacity: 1;
                  }
                  90% {
                    opacity: 1;
                  }
                  100% { 
                    transform: translateY(-115px) scale(0.3);
                    opacity: 0;
                  }
                }
              </style>
            </div>
          `, {
            closeButton: false,
            className: 'custom-popup'
          });

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