'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const Map = dynamic(() => import('../../components/Map'), {
  ssr: false,
  loading: () => (
    <div className="h-screen w-full flex items-center justify-center">Loading map...</div>
  ),
});

// Create a separate component for the search params logic
const MapAddContent: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [position, setPosition] = useState<[number, number] | null>(null);
  const [mapView, setMapView] = useState<'map' | 'satellite'>('map');

  useEffect(() => {
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');

    if (latParam && lngParam) {
      const lat = parseFloat(latParam);
      const lng = parseFloat(lngParam);
      setPosition([lat, lng]);
    } else {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setPosition([position.coords.latitude, position.coords.longitude]);
          },
          () => {
            setPosition([13.0827, 80.2707]); // Default to Chennai
          }
        );
      } else {
        setPosition([13.0827, 80.2707]);
      }
    }
  }, [searchParams]);

  const handlePinMove = (newPosition: [number, number]) => setPosition(newPosition);
  const handleMapDoubleClick = (latlng: [number, number]) => setPosition(latlng);
  const handleCancel = () => router.back();
  const handleConfirm = () => {
    if (position) {
      router.push(`/map/confirm?lat=${position[0]}&lng=${position[1]}`);
    }
  };

  if (!position) {
    return <div className="h-screen w-full flex items-center justify-center">Loading...</div>;
  }

  return (
    <>
      <style jsx global>{`
        .leaflet-container {
          z-index: 0 !important;
        }
      `}</style>

      <div className="h-screen w-full relative">
        {/* Header */}
        <div className="flex items-center justify-center p-2 bg-purple-700 shadow-sm z-50 relative">
          <div className="text-lg font-bold  text-white">Add Pin</div>
        </div>

        {/* Map/Satellite Toggle */}
        <div className="flex space-x-1 bg-purple-700 z-50 relative">
          <button
            className={`flex-1 py-2 font-medium border-b-3 ${
              mapView === 'map' ? 'border-white text-white' : 'border-transparent text-white'
            }`}
            onClick={() => setMapView('map')}
          >
            Map
          </button>
          <button
            className={`flex-1 py-2 font-medium border-b-3 ${
              mapView === 'satellite' ? 'border-white text-white' : 'border-transparent text-white'
            }`}
            onClick={() => setMapView('satellite')}
          >
            Satellite
          </button>
        </div>

        {/* Map Display */}
        <div style={{ position: 'relative', zIndex: 1, height: 'calc(100% - 112px)' }}>
          <Map
            center={position}
            zoom={25}
            draggable={true}
            showDraggablePin={true}
            onPositionChange={handlePinMove}
            onMapDoubleClick={handleMapDoubleClick}
            mapView={mapView}
          />
        </div>

        {/* Floating Buttons */}
        <div className="absolute bottom-30 right-6 flex flex-col space-y-6 z-50">
          <button
            onClick={handleConfirm}
            className="w-12 h-12 rounded-full bg-green-100 text-green-800 flex items-center justify-center shadow-lg"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <button
            onClick={handleCancel}
            className="w-12 h-12 rounded-full bg-red-100 text-red-800 flex items-center justify-center shadow-lg"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
};

// Loading component for suspense fallback
const LoadingSpinner: React.FC = () => (
  <div className="h-screen w-full flex items-center justify-center">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-700"></div>
  </div>
);

// Main component with Suspense boundary
const MapAddPage: React.FC = () => {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <MapAddContent />
    </Suspense>
  );
};

export default MapAddPage;