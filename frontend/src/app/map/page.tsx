'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import FloatingButtons from '../components/FloatingButtons';
import Map from '../components/Map';

const MapPage: React.FC = () => {
  const router = useRouter();
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);
 
  const [mapType, setMapType] = useState<'map' | 'satellite'>('map');

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPosition([pos.coords.latitude, pos.coords.longitude]);
          setLoading(false);
        },
        () => {
          setPosition([13.0827, 80.2707]); // Chennai fallback
          setLoading(false);
        }
      );
    } else {
      setPosition([13.0827, 80.2707]);
      setLoading(false);
    }
  }, []);

  const handleAddPin = () => {
    if (position) {
      router.push(`/map/add?lat=${position[0]}&lng=${position[1]}`);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="h-screen w-full relative">
      <div className="flex items-center justify-between p-2 bg-purple-700 shadow-sm">
        <div className="text-lg font-semibold">Map</div>
        <button className="p-2">Refresh</button>
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

      {position && (
        <Map
          center={position}
          zoom={16}
          draggable={true}
          onPositionChange={setPosition}
          mapView={mapType}
        />
      )}

      <FloatingButtons onAddClick={handleAddPin} />

    
    </div>
  );
};

export default MapPage;
