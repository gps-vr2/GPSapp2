'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { Plus} from 'lucide-react';

const MapWithNoSSR = dynamic(() => import('./components/Map'), { ssr: false });

interface Pin {
  id: number;
  position: [number, number];
  title: string;
}

interface Building {
  id: number;
  lat: number;
  long: number;
  address: string;
}

interface APIResponse {
  building?: Building;
  buildings?: Building[];
}

export default function HomePage() {
  const [isMounted, setIsMounted] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [recentPins, setRecentPins] = useState<Pin[]>([]);

  const fetchRecentBuildings = useCallback(async () => {
    try {
      const res = await fetch(`https://gp-sapp2-8ycr.vercel.app/api/door`);
      const data: APIResponse = await res.json();
      let buildingsArray: Building[] = [];

      if (data.building) {
        buildingsArray = [data.building];
      } else if (data.buildings) {
        buildingsArray = data.buildings;
      }

      if (buildingsArray.length > 0) {
        const pins = buildingsArray.map((building: Building) => ({
          id: building.id,
          position: [building.lat, building.long] as [number, number],
          title: building.address,
        }));
        setRecentPins(pins);
      }
    } catch (err) {
      console.error("Failed to load recent buildings:", err);
    }
  }, []);

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

    fetchRecentBuildings();
  }, [fetchRecentBuildings]);

  return (
    <main className="relative w-screen min-h-[100svh] overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 inset-x-0 z-20 bg-purple-600 shadow">
        <div className="flex items-center justify-center px-4 py-3">
          <div className="text-xl font-bold text-white text-shadow">WELCOME TO GPS-V2R</div>
          
        </div>
      </div>

      {/* Map Display */}
      {isMounted && (
       <div className="absolute top-11 bottom-10 left-0 right-0 z-0">

          <MapWithNoSSR
            pins={recentPins}
            center={[12.8923, 80.1889]}
            zoom={12}
            showViewToggle={true}
            userLocation={userLocation}
          />
        </div>
      )}

      {/* Floating Buttons */}
      <div className="absolute bottom-24 right-4 z-30 flex flex-col items-center space-y-4">
        {userLocation && (
          <Link href={`/building/new?lat=${userLocation[0]}&lng=${userLocation[1]}`}>
            <button className="w-14 h-14 rounded-full bg-purple-600 text-white shadow-lg flex items-center justify-center hover:bg-purple-800 transition">
              <Plus size={28} />
            </button>
          </Link>
        )}
       {/*} <Link href="/map/add">
          <button className="w-14 h-14 rounded-full bg-purple-600 text-white shadow-lg flex items-center justify-center hover:bg-purple-500 transition">
            <MapPin size={24} />
          </button>
        </Link>*/}
      </div>

      {/* Bottom Label */}
     <div className="bg-purple-600 absolute bottom-0 inset-x-0 flex items-center justify-center gap-4 px-6 py-3 text-white text-sm font-medium shadow-md">
  <p className="border-b-4 border-white pb-1">24 H</p>
  <button
    className="p-2 hover:text-gray-300 transition"
    onClick={fetchRecentBuildings}
    aria-label="Refresh Pins"
  >
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


    </main>
  );
}