'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const Map = dynamic(() => import('../../components/Map'), {
  ssr: false,
  loading: () => <div className="h-screen w-full flex items-center justify-center">Loading map...</div>
});


const MapConfirmPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mapType, setMapType] = useState<'map' | 'satellite'>('map');
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [showCoordinates, setShowCoordinates] = useState<boolean>(true);
  const [currentPage] = useState<number>(3);
  const totalPages = 5;

  useEffect(() => {
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');

    if (latParam && lngParam) {
      setPosition([parseFloat(latParam), parseFloat(lngParam)]);
    }
  }, [searchParams]);

  const handleCancel = () => {
    router.back();
  };

  const handleConfirm = () => {
    if (position) {
      router.push(`/building/new?lat=${position[0]}&lng=${position[1]}`);
    }
  };

  if (!position) {
    return <div className="h-screen w-full flex items-center justify-center">Loading...</div>;
  }

  return (
    <>
      <style jsx global>{`
        /* Force Leaflet map container below buttons */
        .leaflet-container {
          z-index: 0 !important;
        }
      `}</style>

      <div className="h-screen w-full relative">
        <div className="flex items-center justify-between p-2 bg-purple-700 shadow-sm">
          <div className="flex items-center">
            {/* Left content */}
          </div>
          <div className="text-bold text-lg text-white font-semibold">Map</div>
          <button className="p-2">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>

        <div className="flex space-x-1 bg-purple-700">
         <button
          onClick={() => setMapType('map')}
          className={`flex-1 py-2 font-medium border-b-3 ${
            mapType === 'map' ? 'border-white text-white' : 'border-transparent text-white'
          }`}
        >
          Map
        </button>
        <button
          onClick={() => setMapType('satellite')}
          className={`flex-1 py-2 font-medium border-b-3 ${
            mapType === 'satellite' ? 'border-white text-white' : 'border-transparent text-white'
          }`}
        >
          Satellite
        </button>
        </div>

        {showCoordinates && (
          <div
            className="absolute top-24 left-1/2 transform -translate-x-1/2 bg-white p-3 rounded shadow-md flex items-center"
            style={{ zIndex: 9999 }}
          >
            <div className="mr-6">
              {position[0].toFixed(14)}, {position[1].toFixed(14)}
            </div>
            <button onClick={() => setShowCoordinates(false)} className="text-gray-400">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Map container */}
        <div style={{ position: 'relative', zIndex: 1, height: 'calc(100% - 112px)' }}>
          <Map
            center={position}
            zoom={25}
            draggable={false}
            showMarker={true}
            markerPosition={position}
          />
        </div>

        {/* Buttons container */}
        <div
          className="absolute bottom-16 right-6 flex flex-col space-y-4"
          style={{ zIndex: 9999 }}
        >
          <button
            onClick={handleConfirm}
            className="w-12 h-12 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-lg"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <button
            onClick={handleCancel}
            className="w-12 h-12 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div
          className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black text-white px-4 py-1 rounded-full"
          style={{ zIndex: 9999 }}
        >
          {currentPage} / {totalPages}
        </div>
      </div>
    </>
  );
};

export default MapConfirmPage;
