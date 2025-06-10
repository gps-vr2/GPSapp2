'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { Plus } from 'lucide-react';

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

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this building?')) return;
    try {
      const getRes = await fetch(`https://gp-sapp2-8ycr.vercel.app/api/door/${id}`);
      if (!getRes.ok) throw new Error('Failed to fetch building');
      const building = await getRes.json();

      await fetch(`https://gp-sapp2-8ycr.vercel.app/api/deleted-buildings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...building,
          deleted_at: new Date().toISOString(),
          deleted_by: 'user',
          original_id: id
        })
      });

      const delRes = await fetch(`https://gp-sapp2-8ycr.vercel.app/api/door/${id}`, {
        method: 'DELETE'
      });

      if (!delRes.ok) throw new Error('Failed to delete building');

      fetchRecentBuildings();
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete building.');
    }
  };

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
      <div className="absolute top-0 inset-x-0 z-20 bg-purple-600 shadow">
        <div className="flex items-center justify-center px-4 py-3">
          <div className="text-xl font-bold text-white text-shadow">WELCOME TO GPS-V2R</div>
        </div>
      </div>

      {isMounted && (
        <div className="absolute top-11 bottom-40 left-0 right-0 z-0">
          <MapWithNoSSR
            pins={recentPins}
            center={[12.8923, 80.1889]}
            zoom={12}
            showViewToggle={true}
            userLocation={userLocation}
          />
        </div>
      )}

      <div className="absolute bottom-24 right-4 z-30 flex flex-col items-center space-y-4">
        {userLocation && (
          <Link href={`/building/new?lat=${userLocation[0]}&lng=${userLocation[1]}`}>
            <button className="w-14 h-14 rounded-full bg-purple-600 text-white shadow-lg flex items-center justify-center hover:bg-purple-800 transition">
              <Plus size={28} />
            </button>
          </Link>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-white max-h-[35%] overflow-y-auto shadow-inner z-10 p-3">
        <h2 className="text-sm font-bold text-gray-700 mb-2">Recent Buildings</h2>
        {recentPins.length === 0 ? (
          <p className="text-gray-400 text-sm">No buildings found</p>
        ) : (
          <div className="space-y-2">
            {recentPins.map((pin) => (
              <div key={pin.id} className="border p-2 rounded flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-800">{pin.title || 'No address'}</div>
                  <div className="text-xs text-gray-500">GPS: {pin.position[0].toFixed(6)}, {pin.position[1].toFixed(6)}</div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/building/edit?id=${pin.id}`}>
                    <button className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">
                      Edit
                    </button>
                  </Link>
                  <button
                    onClick={() => handleDelete(pin.id)}
                    className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
