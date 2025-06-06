'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import 'leaflet/dist/leaflet.css';

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
  userLocation?: [number, number] | null; // New prop for user location
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
  userLocation, // New prop
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const pinMarkersRef = useRef<L.Marker[]>([]);
  const userLocationMarkerRef = useRef<L.Marker | null>(null); // New ref for user location marker
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

    // Clean up existing map if it exists
    if (mapInstanceRef.current) {
      mapInstanceRef.current.off();
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
      tileLayerRef.current = null;
      pinMarkersRef.current = [];
      userLocationMarkerRef.current = null; // Reset user location marker
      isInitializedRef.current = false;
    }

    const initializeMap = async () => {
      const L = await import('leaflet');
      const map = L.map(mapRef.current!, {
        minZoom: 1, // Allow full zoom out
        maxZoom: 20, // Allow high zoom in
      }).setView(center, zoom);
      mapInstanceRef.current = map;
      isInitializedRef.current = true;

      const getTileLayer = (view: string) => {
        return view === 'satellite'
          ? L.tileLayer(
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
              { 
                attribution: 'Tiles © Esri',
                minZoom: 1,
                maxZoom: 20
              }
            )
          : L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '&copy; OpenStreetMap contributors',
              minZoom: 1,
              maxZoom: 20
            });
      };

      tileLayerRef.current = getTileLayer(currentMapView);
      tileLayerRef.current.addTo(map);

      // Live coordinate update on map move
      if (onMapMoveEnd) {
        map.on('moveend', () => {
          const center = map.getCenter();
          onMapMoveEnd(center.lat, center.lng);
        });
      }

      // Double-click to move marker to clicked location
      map.doubleClickZoom.disable();
      map.on('dblclick', (e) => {
        const clickedPos = [e.latlng.lat, e.latlng.lng] as [number, number];
        handleMapDoubleClick?.(clickedPos);
        handlePositionChange?.(clickedPos);
        if (markerRef.current) {
          markerRef.current.setLatLng(e.latlng);
        }
      });

      // Ensure rendering
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

  // Handle center and zoom changes separately
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

  // Handle map view changes
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current || !isInitializedRef.current) return;

    const updateTileLayer = async () => {
      const L = await import('leaflet');
      mapInstanceRef.current!.removeLayer(tileLayerRef.current!);
      tileLayerRef.current = currentMapView === 'satellite'
        ? L.tileLayer(
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            { 
              attribution: 'Tiles © Esri',
              minZoom: 1,
              maxZoom: 20
            }
          )
        : L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            minZoom: 1,
            maxZoom: 20
          });

      tileLayerRef.current.addTo(mapInstanceRef.current!);
    };

    updateTileLayer();
  }, [currentMapView]);

  // Handle callbacks changes
  useEffect(() => {
    if (!mapInstanceRef.current || !isInitializedRef.current) return;

    const map = mapInstanceRef.current;
    
    // Remove existing event listeners
    map.off('moveend');
    map.off('dblclick');

    // Add new event listeners
    if (onMapMoveEnd) {
      map.on('moveend', () => {
        
        const center = map.getCenter();
        onMapMoveEnd(center.lat, center.lng);
      });
    }

    map.on('dblclick', (e) => {
      const clickedPos = [e.latlng.lat, e.latlng.lng] as [number, number];
      handleMapDoubleClick?.(clickedPos);
      handlePositionChange?.(clickedPos);
      if (markerRef.current) {
        markerRef.current.setLatLng(e.latlng);
      }
    });
  }, [onMapMoveEnd, handleMapDoubleClick, handlePositionChange]);

  // Handle user location marker
  useEffect(() => {
    if (!mapInstanceRef.current || !isInitializedRef.current) return;

    const updateUserLocationMarker = async () => {
      const L = await import('leaflet');

      // Remove existing user location marker
      if (userLocationMarkerRef.current) {
        mapInstanceRef.current!.removeLayer(userLocationMarkerRef.current);
        userLocationMarkerRef.current = null;
      }

      // Add user location marker if userLocation is provided
      if (userLocation) {
        const userLocationIcon = L.icon({
          iconUrl: '/xy.png',           // Using xy.png as requested
          iconSize: [48, 48],           // Adjust size as needed
          iconAnchor: [24, 24],         // Center anchor for user location
          popupAnchor: [0, -24],        // Display popup above the marker
        });

        const userMarker = L.marker(userLocation, {
          icon: userLocationIcon,
          title: 'Your Location',
        }).addTo(mapInstanceRef.current!)
          .bindPopup('Your Current Location');

        userLocationMarkerRef.current = userMarker;
      }
    };

    updateUserLocationMarker();
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
        const actualMarkerPos = markerPosition || center;

        const markerIcon =  L.icon({
              iconUrl: '/pin 48px.png',           // Make sure it's served from the public folder
    iconSize: [48, 48],                 // Since image is square, match original or slightly smaller
    iconAnchor: [24, 48],               // Bottom-center anchor for correct pin placement
    popupAnchor: [0, -48],              // Display popup directly above
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    shadowSize: [41, 41],
    shadowAnchor: [12, 41],
            });

        const marker = L.marker(actualMarkerPos, {
          icon: markerIcon,
          draggable: false, // Disable dragging, only double-click moves pin
        }).addTo(mapInstanceRef.current!);

        markerRef.current = marker;

        // Remove drag functionality since we only want double-click
        // Pin stays in place when map is moved
      }
    };

    updateMarker();
  }, [showMarker, showDraggablePin, markerPosition, center, handlePositionChange]);

  useEffect(() => {
    if (!mapInstanceRef.current || !isInitializedRef.current) return;

    const updatePins = async () => {
      const L = await import('leaflet');
      
      // Clear existing pins
      pinMarkersRef.current.forEach((marker) => {
        mapInstanceRef.current!.removeLayer(marker);
      });
      pinMarkersRef.current = [];

      // Add new pins
      if (pins.length > 0) {
        pins.forEach((pin) => {
          const pinMarker = L.marker(pin.position, {
              title: pin.title,
  icon: L.icon({
    iconUrl: '/pin 48px.png',           // Make sure it's served from the public folder
    iconSize: [48, 48],                 // Since image is square, match original or slightly smaller
    iconAnchor: [24, 48],               // Bottom-center anchor for correct pin placement
    popupAnchor: [0, -48],              // Display popup directly above
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    shadowSize: [41, 41],
    shadowAnchor: [12, 41],
            }),
          })
            .addTo(mapInstanceRef.current!)
            .bindPopup(pin.title);
          
          pinMarkersRef.current.push(pinMarker);
        });
      }
    };

    updatePins();
  }, [pins]);

  const handleViewToggle = (view: 'map' | 'satellite') => {
    setCurrentMapView(view);
  };

  return (
    <div className="relative w-full" style={{ height }}>
      <div ref={mapRef} className="w-full h-full" />
      
      {/* Map/Satellite Toggle */}
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