'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { Plus, MapPin } from 'lucide-react';

const MapWithNoSSR = dynamic(() => import('./components/Map'), { ssr: false });

interface Pin {
  id: number;
  position: [number, number];
  title: string;
}

export default function HomePage() {
  const [isMounted, setIsMounted] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapView, setMapView] = useState<'map' | 'satellite'>('map');

  useEffect(() => {
    setIsMounted(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.error("Geolocation error:", error);
        }
      );
    }
  }, []);

  const samplePins: Pin[] = [
   
  ];

  return (
    <main className="relative w-screen h-screen overflow-hidden">
  {/* Header and Toggle */}
  <div className="absolute top-0 inset-x-0 z-20 bg-purple-700 shadow">
    {/* Welcome Text */}
    <div className="flex items-center justify-center px-4 py-3">
      <div className="text-xl font-bold text-white">WELCOME TO GPS-V2R</div>
      <button className="p-2 text-white">
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
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

    {/* Toggle Bar */}
    <div className="flex space-x-1 bg-purple-700 px-4">
      <button
        className={`flex-1 py-2 font-medium border-b-3 ${mapView === 'map' ? 'border-white text-white' : 'border-transparent text-white'}`}
        onClick={() => setMapView('map')}
      >
        Map
      </button>
      <button
        className={`flex-1 py-2 font-medium border-b-3 ${mapView === 'satellite' ? 'border-white text-white' : 'border-transparent text-white'}`}
        onClick={() => setMapView('satellite')}
      >
        Satellite
      </button>
    </div>
  </div>

  {/* Map Display */}
  {isMounted && (
    <div className="absolute inset-0 z-0">
      <MapWithNoSSR
        pins={samplePins}
        center={[13.0827, 80.2707]}
        zoom={25}
        mapView={mapView}
      />
    </div>
  )}

  {/* Floating Buttons */}
  <div className="absolute bottom-24 right-4 z-30 flex flex-col items-center space-y-4">
    {userLocation && (
      <Link href={`/building/new?lat=${userLocation[0]}&lng=${userLocation[1]}`}>
        <button className="w-14 h-14 rounded-full bg-purple-600 text-white shadow-lg flex items-center justify-center hover:bg-purple-800 transition ">
          <Plus size={28} />
        </button>
      </Link>
    )}
    <Link href="/map/add">
      <button className="w-14 h-14 rounded-full bg-purple-600 text-white shadow-lg flex items-center justify-center hover:bg-purple-500 transition">
        <MapPin size={24} />
      </button>
    </Link>
  </div>

  {/* Bottom Label */}
  <div className="  bg-purple-700 absolute bottom-0 inset-x-0 flex justify-center text-white text-sm font-medium py-2">
    <p className ="border-b-5 border-white">24 H</p>
  </div>
</main>
  );}
