'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import 'leaflet/dist/leaflet.css';

interface Pin {
  id: number;
  position: [number, number]; // Make required to match ClientHomePage
  title: string;
  doors?: string[];
  numberOfDoors?: number;
  language?: string;
  info?: string;
  // Backend format support
  lat?: number;
  long?: number;
  address?: string;
  pinImage?: string;
  pinColor?: number;
  congregationId?: number;
}

interface LeafletHTMLElement extends HTMLElement {
  _leaflet_id?: number;
}

interface MapProps {
  center: [number, number];
  pins?: Pin[];
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
  onPinClick?: (pin: Pin) => void;
  selectedPin?: Pin | null;
  isEditing?: boolean;
  onPositionUpdate?: (lat: number, long: number) => void;
  selectedLanguage?: string;
  congregationId?: number;
  autoFitBounds?: boolean; // New prop to control auto-fitting
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
  selectedLanguage = 'english',
  congregationId = 1,
  autoFitBounds = true, // Default to true for auto-fitting
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const pinMarkersRef = useRef<L.Marker[]>([]);
  const userLocationMarkerRef = useRef<L.Marker | null>(null);
  const isInitializedRef = useRef(false);
  const [currentMapView, setCurrentMapView] = useState<'map' | 'satellite'>(mapView);
  const [currentUserLocation, setCurrentUserLocation] = useState<[number, number] | null>(userLocation || null);

  // Function to calculate bounds that contain all pins
  const calculateBounds = useCallback((pins: Pin[]): L.LatLngBounds | null => {
    if (pins.length === 0) return null;

    const normalizedPins = pins.map(pin => normalizePin(pin));
    let minLat = Number.MAX_VALUE;
    let maxLat = Number.MIN_VALUE;
    let minLng = Number.MAX_VALUE;
    let maxLng = Number.MIN_VALUE;

    normalizedPins.forEach(pin => {
      const [lat, lng] = pin.position;
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    });

    // Include user location in bounds if available
    if (currentUserLocation) {
      const [userLat, userLng] = currentUserLocation;
      minLat = Math.min(minLat, userLat);
      maxLat = Math.max(maxLat, userLat);
      minLng = Math.min(minLng, userLng);
      maxLng = Math.max(maxLng, userLng);
    }

    // Add some padding to the bounds
    const padding = 0.01;
    minLat -= padding;
    maxLat += padding;
    minLng -= padding;
    maxLng += padding;

    return new (window as any).L.LatLngBounds(
      [minLat, minLng],
      [maxLat, maxLng]
    );
  }, [currentUserLocation]);

  // Function to fit map to bounds
  const fitMapToBounds = useCallback((bounds: L.LatLngBounds) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.fitBounds(bounds, {
        padding: [50, 50], // Add some padding around the bounds
        maxZoom: 15 // Limit maximum zoom level
      });
    }
  }, []);

  // Function to calculate pin color based on congregation and language
  const calculatePinColor = (congregationId: number = 1, language: string = 'english'): number => {
    const defaultLanguagePinMap: { [key: string]: number } = {
      'english': 1,
      'tamil': 2,
      'hindi': 3,
      'telugu': 4,
      'malayalam': 5,
    };
    
    let pinColor = 1;
    
    if (congregationId === 1) {
      pinColor = defaultLanguagePinMap[language.toLowerCase()] || 1;
    } else {
      const languageOffset = defaultLanguagePinMap[language.toLowerCase()] || 1;
      pinColor = ((congregationId - 1) * 5) + languageOffset;
      
      if (pinColor > 15) {
        pinColor = ((pinColor - 1) % 15) + 1;
      }
    }
    
    return pinColor;
  };

  // Function to get pin image
  const getPinImage = (pin: Pin, fallbackLanguage?: string, fallbackCongId?: number) => {
    if (pin.pinImage) {
      console.log(`Using pinImage from backend: ${pin.pinImage}`);
      return pin.pinImage;
    }
    
    if (pin.pinColor) {
      console.log(`Using pinColor from backend: ${pin.pinColor}`);
      return `/pins/pin${pin.pinColor}.png`;
    }
    
    const language = pin.language || fallbackLanguage || selectedLanguage || 'english';
    const congId = pin.congregationId || fallbackCongId || congregationId || 1;
    
    console.log(`Calculating pin color for language: ${language}, congregation: ${congId}`);
    
    const pinColor = calculatePinColor(congId, language);
    console.log(`Calculated pin color: ${pinColor}`);
    
    return `/pins/pin${pinColor}.png`;
  };

  // Function to normalize pin data (handle both old and new formats)
  const normalizePin = (pin: Pin): Pin => {
    // If position is already set, use it; otherwise construct from lat/long
    const position: [number, number] = pin.position || [pin.lat || 0, pin.long || 0];
    
    return {
      ...pin,
      position,
      title: pin.title || pin.address || 'Unknown Location',
    };
  };

  const handlePositionChange = useCallback((position: [number, number]) => {
    onPositionChange?.(position);
  }, [onPositionChange]);

  const handleMapDoubleClick = useCallback((position: [number, number]) => {
    onMapDoubleClick?.(position);
  }, [onMapDoubleClick]);

  const handleMapMoveEnd = useCallback(() => {
    if (mapInstanceRef.current && onMapMoveEnd) {
      const center = mapInstanceRef.current.getCenter();
      onMapMoveEnd(center.lat, center.lng);
    }
  }, [onMapMoveEnd]);

  // Initialize map and user location
  useEffect(() => {
    if (!mapRef.current) return;

    // Try to get user location from localStorage if not provided
    if (!currentUserLocation) {
      const savedLocation = localStorage.getItem('userLocation');
      if (savedLocation) {
        try {
          const location = JSON.parse(savedLocation) as [number, number];
          setCurrentUserLocation(location);
        } catch (e) {
          console.error('Failed to parse saved location', e);
        }
      }
    }

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

      map.on('moveend', handleMapMoveEnd);

      map.on('dblclick', (e) => {
        const pos: [number, number] = [e.latlng.lat, e.latlng.lng];
        handleMapDoubleClick(pos);
        handlePositionChange(pos);
        markerRef.current?.setLatLng(e.latlng);
      });

      // Add user location marker if available
      if (currentUserLocation) {
        const userIcon = L.icon({
          iconUrl: '/pins/pin0.png',
          iconSize: [48, 55],
          iconAnchor: [24, 48],
          popupAnchor: [0, -24],
        });

        userLocationMarkerRef.current = L.marker(currentUserLocation, {
          icon: userIcon,
          title: 'Your Location',
          zIndexOffset: 1000 // Ensure it's above other markers
        }).addTo(map)
          .bindPopup('Your Current Location');
      }

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
  }, [center, currentMapView, handleMapDoubleClick, handlePositionChange, handleMapMoveEnd, zoom, currentUserLocation]);

  // Update user location when it changes
  useEffect(() => {
    if (userLocation) {
      setCurrentUserLocation(userLocation);
      // Save to localStorage for persistence
      localStorage.setItem('userLocation', JSON.stringify(userLocation));
    }
  }, [userLocation]);

  // Fit map to bounds when pins change (if autoFitBounds is enabled)
  useEffect(() => {
    if (!mapInstanceRef.current || !isInitializedRef.current || !autoFitBounds) return;

    const bounds = calculateBounds(pins);
    if (bounds) {
      fitMapToBounds(bounds);
    }
  }, [pins, autoFitBounds, calculateBounds, fitMapToBounds]);

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

  // Update user location marker
  useEffect(() => {
    if (!mapInstanceRef.current || !isInitializedRef.current) return;

    const updateUserMarker = async () => {
      const L = await import('leaflet');
      
      // Remove existing marker if it exists
      if (userLocationMarkerRef.current) {
        mapInstanceRef.current!.removeLayer(userLocationMarkerRef.current);
        userLocationMarkerRef.current = null;
      }

      // Add new marker if we have a location
      if (currentUserLocation) {
        const userIcon = L.icon({
          iconUrl: '/pins/pin0.png',
          iconSize: [48, 55],
          iconAnchor: [24, 48],
          popupAnchor: [0, -24],
        });

        userLocationMarkerRef.current = L.marker(currentUserLocation, {
          icon: userIcon,
          title: 'Your Location',
          zIndexOffset: 1000 // Ensure it's above other markers
        }).addTo(mapInstanceRef.current!)
          .bindPopup('Your Current Location');
      }
    };

    updateUserMarker();
  }, [currentUserLocation]);

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
        const pinImageUrl = getPinImage({} as Pin, selectedLanguage, congregationId);

        const icon = L.icon({
          iconUrl: pinImageUrl,
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
  }, [showMarker, showDraggablePin, markerPosition, center, selectedLanguage, congregationId]);

  useEffect(() => {
    if (!mapInstanceRef.current || !isInitializedRef.current) return;

    const updatePins = async () => {
      const L = await import('leaflet');

      pinMarkersRef.current.forEach(marker => {
        mapInstanceRef.current!.removeLayer(marker);
      });
      pinMarkersRef.current = [];

      pins.forEach(pin => {
        const normalizedPin = normalizePin(pin);
        const pinImageUrl = getPinImage(pin);
        
        console.log(`Pin ${pin.id}:`, {
          language: pin.language,
          congregationId: pin.congregationId,
          pinColor: pin.pinColor,
          pinImage: pin.pinImage,
          calculatedImage: pinImageUrl
        });
        
        const pinMarker = L.marker(normalizedPin.position, {
          title: normalizedPin.title,
          icon: L.icon({
            iconUrl: pinImageUrl,
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
              max-width: 280px;
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
                  ">${normalizedPin.title || 'No address'}</strong>
                </div>
                
                <!-- Building Information -->
                <div style="margin-bottom: 15px; font-size: 12px; opacity: 0.9; line-height: 1.4;">
                  ${pin.info ? `<div style="margin-bottom: 4px;">Info: ${pin.info}</div>` : ''}
                  ${pin.numberOfDoors ? `<div style="margin-bottom: 4px;">Doors: ${pin.numberOfDoors}</div>` : ''}
                  ${pin.congregationId ? `<div style="margin-bottom: 4px;">Congregation: ${pin.congregationId}</div>` : ''}
                  ${pin.language ? `<div style="margin-bottom: 4px;">Language: ${pin.language}</div>` : ''}
                  ${pin.pinColor ? `<div style="margin-bottom: 4px;">Pin Color: ${pin.pinColor}</div>` : ''}
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
            `, {
              closeButton: false,
              className: 'custom-popup'
            });

        pinMarkersRef.current.push(pinMarker);
      });
    };

    updatePins();
  }, [pins, selectedLanguage, congregationId]);

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