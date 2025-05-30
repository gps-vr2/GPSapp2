import React, { useEffect, useRef, useCallback } from 'react';
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
}

const Map: React.FC<MapProps> = ({
  center,
  pins = [],
  zoom,
  draggable = false,
  showMarker = false,
  showDraggablePin = false,
  markerPosition,
  instructionText,
  height = '100%',
  onPositionChange,
  onMapDoubleClick,
  mapView = 'map',
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const pinMarkersRef = useRef<L.Marker[]>([]);

  // Memoize handlers to prevent unnecessary re-renders
  const handlePositionChange = useCallback((position: [number, number]) => {
    onPositionChange?.(position);
  }, [onPositionChange]);

  const handleMapDoubleClick = useCallback((position: [number, number]) => {
    onMapDoubleClick?.(position);
  }, [onMapDoubleClick]);

  useEffect(() => {
    if (!mapRef.current) return;

    const initializeMap = async () => {
      const L = await import('leaflet');
      
      if (mapInstanceRef.current) return;

      const map = L.map(mapRef.current!).setView(center, zoom);
      mapInstanceRef.current = map;

      // Choose base layer
      const getTileLayer = () =>
        mapView === 'satellite'
          ? L.tileLayer(
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
              { attribution: 'Tiles © Esri' }
            )
          : L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            });

      tileLayerRef.current = getTileLayer();
      tileLayerRef.current.addTo(map);

      // Draggable marker or static marker
      const actualMarkerPos = showMarker ? markerPosition || center : center;

      if (showMarker || showDraggablePin) {
        const markerIcon = showDraggablePin
          ? L.divIcon({
              html: `<div style="background-color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border: 2px solid #e54e4e;">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="#e54e4e">
                        <path d="M12 0c-4.4 0-8 3.6-8 8 0 5.4 7 14.6 7.3 15 0.2 0.2 0.5 0.3 0.7 0.3s0.5-0.1 0.7-0.3c0.3-0.4 7.3-9.6 7.3-15 0-4.4-3.6-8-8-8zM12 12c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z"></path>
                      </svg>
                    </div>`,
              className: '',
              iconSize: [30, 30],
              iconAnchor: [15, 30],
            })
          : L.icon({
              iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
              shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
              shadowSize: [41, 41],
            });

        const marker = L.marker(actualMarkerPos, {
          icon: markerIcon,
          draggable: showDraggablePin,
        }).addTo(map);

        markerRef.current = marker;

        if (showDraggablePin && handlePositionChange) {
          marker.on('dragend', () => {
            const pos = marker.getLatLng();
            handlePositionChange([pos.lat, pos.lng]);
          });
        }
      }

      // Add pins
      pins.forEach((pin) => {
        const pinMarker = L.marker(pin.position, {
          title: pin.title,
          icon: L.icon({
            iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
            shadowSize: [41, 41],
          }),
        })
          .addTo(map)
          .bindPopup(pin.title);

        pinMarkersRef.current.push(pinMarker);
      });

      // Double-click to move marker
      if (draggable && (handlePositionChange || handleMapDoubleClick)) {
        map.doubleClickZoom.disable();

        map.on('dblclick', (e) => {
          const { lat, lng } = e.latlng;
          handleMapDoubleClick?.([lat, lng]);
          handlePositionChange?.([lat, lng]);

          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
          }
        });
      }
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
      }
    };
  }, [center, zoom, draggable, showMarker, showDraggablePin, markerPosition, pins, handlePositionChange, handleMapDoubleClick, mapView]);

  // Update view on center or zoom change
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(center, zoom);
    }
  }, [center, zoom]);

  // Update tile layer on mapView change
  useEffect(() => {
    if (mapInstanceRef.current && tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);

      import('leaflet').then((L) => {
        tileLayerRef.current =
          mapView === 'satellite'
            ? L.tileLayer(
                'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                { attribution: 'Tiles © Esri' }
              )
            : L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution:
                  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
              });

        tileLayerRef.current!.addTo(mapInstanceRef.current!);
      });
    }
  }, [mapView]);

  return (
    <div className="relative w-full" style={{ height }}>
      <div ref={mapRef} className="w-full h-full"></div>
      {instructionText && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="bg-white bg-opacity-70 px-2 py-1 rounded text-red-600 font-bold">
            {instructionText}
          </div>
        </div>
      )}
    </div>
  );
};

export default Map;