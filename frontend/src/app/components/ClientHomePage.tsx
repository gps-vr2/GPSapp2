'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import 'leaflet/dist/leaflet.css';
import { Plus, Save, X, Trash2, MapPin, RefreshCw } from 'lucide-react';

const MapWithNoSSR = dynamic(() => import('../components/Map'), { ssr: false });

// Unified Pin interface that will be used throughout the application
interface Pin {
  id: number;
  position: [number, number];
  title: string;
  doors?: string[];
  numberOfDoors?: number;
  language?: string;
  info?: string;
  lat?: number;
  long?: number;
  address?: string;
  pinImage?: string; // Add pinImage to Pin interface
  pinColor?: number; // Add pinColor to Pin interface
  congregationId?: number;
}

// Building interface for API responses - ENSURE these match your backend API EXACTLY
interface Building {
  id: number;
  lat: number;
  long: number;
  address: string;
  numberOfDoors?: string; // Assuming it comes as a string, parse if needed
  language?: string;
  info?: string;
  congregationId?: number;
  pinColor?: number; // <<-- IMPORTANT: This must come from your backend
  pinImage?: string; // <<-- IMPORTANT: This must come from your backend
}

// Editing interface
interface EditingBuilding {
  id: number;
  lat: number;
  long: number;
  address: string;
  doors: string[];
  language: string;
  // If you want to edit pinColor/pinImage, you'd add them here too
}

export default function HomePage() {
  const searchParams = useSearchParams();
  const [isMounted, setIsMounted] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [recentPins, setRecentPins] = useState<Pin[]>([] );
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<EditingBuilding | null>(null);
  const [newDoor, setNewDoor] = useState('');
  const [mapCenter, setMapCenter] = useState<[number, number]>([12.8923, 80.1889]);
  const [mapZoom, setMapZoom] = useState(12);
  const [showNewBuildingNotification, setShowNewBuildingNotification] = useState(false);
  const [highlightPinId, setHighlightPinId] = useState<number | undefined>(undefined);
  const [mapKey, setMapKey] = useState(0);
  const [shouldAutoFit, setShouldAutoFit] = useState(true);
  
  // Ref to track if we've already processed the URL parameters
  const hasProcessedUrlParams = useRef(false);

  const processUrlParameters = useCallback((pins: Pin[]) => {
    if (hasProcessedUrlParams.current) return;
    
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const isNewBuilding = searchParams.get('newBuilding') === 'true';
    const centerLat = searchParams.get('centerLat');
    const centerLng = searchParams.get('centerLng');
    const showNew = searchParams.get('showNew') === 'true';

    // Check for new building parameters
    if ((lat && lng && isNewBuilding) || (centerLat && centerLng && showNew)) {
      const targetLat = parseFloat(lat || centerLat || '0');
      const targetLng = parseFloat(lng || centerLng || '0');
      
      if (!isNaN(targetLat) && !isNaN(targetLng)) {
        console.log('Centering map on new building:', targetLat, targetLng);
        
        // Disable auto-fit and set specific center/zoom
        setShouldAutoFit(false);
        setMapCenter([targetLat, targetLng]);
        setMapZoom(18); // Higher zoom for better focus on the new building
        
        // Show notification for new building
        if (isNewBuilding || showNew) {
          setShowNewBuildingNotification(true);
          setTimeout(() => {
            setShowNewBuildingNotification(false);
          }, 3000);
        }
        
        // Try to find and highlight the new building
        setTimeout(() => {
          const newPin = pins.find(pin => 
            Math.abs(pin.position[0] - targetLat) < 0.0001 && 
            Math.abs(pin.position[1] - targetLng) < 0.0001
          );
          
          if (newPin) {
            setSelectedPin(newPin);
            setHighlightPinId(newPin.id);
            console.log('Found and selected new building:', newPin);
          }
        }, 1000);
        
        hasProcessedUrlParams.current = true;
        
        // Clean up URL parameters after processing
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [searchParams]);

  const fetchRecentBuildings = useCallback(async () => {
    try {
      console.log("[ClientHomePage] Attempting to fetch buildings from API...");
      const res = await fetch(`https://gp-sapp2-8ycr.vercel.app/api/door`);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[ClientHomePage] API fetch failed with status: ${res.status}, response: ${errorText}`);
        throw new Error(`Failed to fetch buildings: ${res.statusText}`);
      }
      
      const data: Building[] = await res.json();
      console.log("[ClientHomePage] Raw backend data received:", JSON.stringify(data, null, 2));

      if (data && Array.isArray(data)) {
        const pins: Pin[] = data.map((building: Building) => ({
          id: building.id,
          position: [building.lat, building.long] as [number, number],
          title: building.address || 'No address',
          doors: building.info ? building.info.split(', ').filter(Boolean) : [],
          numberOfDoors: building.numberOfDoors ? parseInt(building.numberOfDoors) : undefined,
          language: building.language || 'English',
          info: building.info,
          pinColor: building.pinColor, 
          pinImage: building.pinImage, 
          congregationId: building.congregationId,
        }));
        setRecentPins(pins);
        
        // Process URL parameters after buildings are loaded
        processUrlParameters(pins);
      }
    } catch (err: unknown) {
      console.error("[ClientHomePage] Error fetching buildings (network/parse error):", err);
      // You might want to display an error message to the user here
      const errorMessage = err instanceof Error ? err.message : 'Network error';
      alert(`Error loading buildings: ${errorMessage}`);
    }
  }, [processUrlParameters]);

  // Type the callback explicitly to match the Pin interface
  const handlePinClick = useCallback((pin: Pin) => {
    console.log('Pin clicked:', pin);
    setSelectedPin(pin);
    // Optionally set isEditing to true and populate editingBuilding here
    setIsEditing(true);
    setEditingBuilding({
      id: pin.id,
      lat: pin.position[0],
      long: pin.position[1],
      address: pin.address || '',
      doors: pin.doors || (pin.info ? pin.info.split(', ').filter(Boolean) : []),
      language: pin.language || 'English',
    });
    setNewDoor(''); // Clear new door input
  }, []);



  const cancelEditing = () => {
    setIsEditing(false);
    setEditingBuilding(null);
    setSelectedPin(null);
    setNewDoor('');
  };

  const saveChanges = async () => {
    if (!editingBuilding) {
      console.warn("[ClientHomePage] No building selected for editing.");
      return;
    }

    const putUrl = `https://gp-sapp2-8ycr.vercel.app/api/door/${editingBuilding.id}`;
    const putBody = JSON.stringify({
      lat: editingBuilding.lat,
      long: editingBuilding.long,
      address: editingBuilding.address,
      info: editingBuilding.doors.join(', '),
      numberOfDoors: editingBuilding.doors.length,
      language: editingBuilding.language,
      congregationId: selectedPin?.congregationId || 2898201, // Ensure it's passed for pin logic
    });
    

    console.log(`[ClientHomePage] Sending PUT request to: ${putUrl}`);
    console.log("[ClientHomePage] PUT request body:", putBody);

    try {
      const response = await fetch(putUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: putBody,
      });

      if (response.ok) {
        console.log(`[ClientHomePage] PUT request successful for ID: ${editingBuilding.id}`);
        // Re-fetch the specific building to get its updated pinImage/pinColor
        // This is important because the backend might recalculate or store this.
        console.log(`[ClientHomePage] Re-fetching building with ID: ${editingBuilding.id} after save.`);
        const updatedBuildingRes = await fetch(`https://gp-sapp2-8ycr.vercel.app/api/door/${editingBuilding.id}`);
        
        if (!updatedBuildingRes.ok) {
          const errorText = await updatedBuildingRes.text();
          console.error(`[ClientHomePage] Failed to re-fetch updated building data: ${updatedBuildingRes.status}, response: ${errorText}`);
          throw new Error(`Failed to re-fetch updated building data: ${updatedBuildingRes.statusText}`);
        }
        
        const updatedBuildingData: Building = await updatedBuildingRes.json();
        console.log("[ClientHomePage] Re-fetched updated building data:", JSON.stringify(updatedBuildingData, null, 2));

        const updatedPin: Pin = {
          id: updatedBuildingData.id,
          position: [updatedBuildingData.lat, updatedBuildingData.long] as [number, number],
          title: updatedBuildingData.address || 'No address',
          doors: updatedBuildingData.info ? updatedBuildingData.info.split(', ').filter(Boolean) : [],
          numberOfDoors: updatedBuildingData.numberOfDoors ? parseInt(updatedBuildingData.numberOfDoors) : undefined,
          language: updatedBuildingData.language || 'English',
          info: updatedBuildingData.info,
          pinColor: updatedBuildingData.pinColor, 
          pinImage: updatedBuildingData.pinImage, 
          congregationId: updatedBuildingData.congregationId,
        };

        setShouldAutoFit(false);
        setRecentPins(prevPins => 
          prevPins.map(pin => 
            pin.id === editingBuilding.id ? updatedPin : pin
          )
        );
        
        setTimeout(() => {
          setMapCenter([editingBuilding.lat, editingBuilding.long]);
          setMapZoom(Math.max(mapZoom, 16)); 
          setHighlightPinId(editingBuilding.id);
          setSelectedPin(updatedPin);
          setMapKey(prev => prev + 1); 
        }, 100);
        
        cancelEditing();
        alert('Building updated successfully!');
      } else {
        const errorBody = await response.text();
        console.error(`[ClientHomePage] Failed to update building: ${response.status} - ${errorBody}`);
        alert(`Failed to update building: ${response.statusText || 'Unknown error'}`);
      }
    } catch (error: unknown) {
      console.error('[ClientHomePage] Error updating building (network or processing):', error);
      const errorMessage = error instanceof Error ? error.message : 'Network issue';
      alert(`Error updating building: ${errorMessage}`);
    }
  };

  const updatePosition = (lat: number, long: number) => {
    if (editingBuilding) {
      setEditingBuilding(prev => prev ? { ...prev, lat, long } : null);
    }
  };

  const updateAddress = (address: string) => {
    if (editingBuilding) {
      setEditingBuilding(prev => prev ? { ...prev, address } : null);
    }
  };

  const addDoor = () => {
    if (newDoor.trim() && editingBuilding) {
      setEditingBuilding(prev => prev ? {
        ...prev,
        doors: [...prev.doors, newDoor.trim()]
      } : null);
      setNewDoor('');
    }
  };

  const removeDoor = (index: number) => {
    if (editingBuilding) {
      setEditingBuilding(prev => prev ? {
        ...prev,
        doors: prev.doors.filter((_, i) => i !== index)
      } : null);
    }
  };

  const updateDoor = (index: number, newValue: string) => {
    if (editingBuilding) {
      setEditingBuilding(prev => prev ? {
        ...prev,
        doors: prev.doors.map((door, i) => i === index ? newValue : door)
      } : null);
    }
  };

  const handleRefresh = () => {
    console.log("[ClientHomePage] Refreshing buildings...");
    setHighlightPinId(undefined);
    setSelectedPin(null);
    setShouldAutoFit(true); 
    setMapKey(prev => prev + 1); 
    fetchRecentBuildings();
  };

  useEffect(() => {
    setIsMounted(true);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.error("[ClientHomePage] Geolocation error:", error);
        }
      );
    }

    fetchRecentBuildings();
  }, [fetchRecentBuildings]);

  return (
    <main className="relative w-screen min-h-[100svh] overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 inset-x-0 z-20 bg-purple-600 shadow">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left side - Buildings count */}
          <div className="flex items-center">
            <span className="text-white text-sm font-medium">
              {recentPins.length} Buildings
            </span>
          </div>
          
          {/* Center - Title */}
          <div className="flex-1 flex justify-center">
            <div className="text-x0 font-bold text-white text-shadow">WELCOME TO GPS-V2R</div>
          </div>
          
          {/* Right side - Empty space for balance */}
          <div className="w-[60px]"></div>
        </div>
      </div>

      {/* New Building Notification */}
      {showNewBuildingNotification && (
        <div className="absolute top-16 left-4 right-4 z-50 flex justify-center">
          <div className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 animate-pulse">
            <MapPin size={16} />
            <span className="font-medium">New building added successfully!</span>
          </div>
        </div>
      )}

      {/* Map Display */}
      {isMounted && (
        <div className="absolute top-11 bottom-11 left-0 right-0 z-0">
          <MapWithNoSSR
            key={`map-${mapKey}-${shouldAutoFit}`}
            pins={recentPins}
            center={mapCenter}
            zoom={mapZoom}
            showViewToggle={true}
            userLocation={userLocation}
            onPinClick={handlePinClick}
            selectedPin={selectedPin}
            isEditing={isEditing}
            onPositionUpdate={updatePosition}
            highlightPinId={highlightPinId}
            autoFitBounds={shouldAutoFit}
          />
        </div>
      )}

      {/* Bottom Bar */}
      <div className="absolute bottom-0 inset-x-0 z-20 bg-purple-600 shadow">
        <div className="flex items-center justify-center px-4 py-3">
          {/* Center - 24hr label and refresh button */}
          <div className="flex items-center space-x-3">
            <span className="text-white text-sm font-medium">
              24hr
            </span>
            <button
              className="p-2 hover:bg-purple-700 rounded-lg transition-colors"
              onClick={handleRefresh}
              aria-label="Refresh Buildings"
            >
              <RefreshCw className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditing && selectedPin && ( 
        <div className="absolute inset-0 z-40 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Edit Building</h2>
                <button onClick={cancelEditing} className="text-gray-500 hover:text-gray-700">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* Position */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position (Lat, Long)
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    step="any"
                    value={editingBuilding?.lat || ''} 
                    onChange={(e) => updatePosition(parseFloat(e.target.value) || 0, editingBuilding?.long || 0)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Latitude"
                  />
                  <input
                    type="number"
                    step="any"
                    value={editingBuilding?.long || ''} 
                    onChange={(e) => updatePosition(editingBuilding?.lat || 0, parseFloat(e.target.value) || 0)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Longitude"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Tip: Click and drag the pin on the map to update position
                </p>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  value={editingBuilding?.address || ''} 
                  onChange={(e) => updateAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter street address"
                />
              </div>

              {/* Language */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Language
                </label>
                <select
                  value={editingBuilding?.language || 'English'} 
                  onChange={(e) => setEditingBuilding(prev => prev ? { ...prev, language: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="English">English</option>
                  <option value="Tamil">Tamil</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Doors */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Doors/Units
                </label>
                
                {/* Existing Doors */}
                <div className="space-y-2 mb-3">
                  {editingBuilding?.doors.map((door, index) => ( 
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={door}
                        onChange={(e) => updateDoor(index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="e.g., 1/f, 2/f, 3/f"
                      />
                      <button
                        onClick={() => removeDoor(index)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add New Door */}
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newDoor}
                    onChange={(e) => setNewDoor(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addDoor()}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Add new door (e.g., 4/f)"
                  />
                  <button
                    onClick={addDoor}
                    disabled={!newDoor.trim()}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 border-t flex justify-end space-x-2">
              <button
                onClick={cancelEditing}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveChanges}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center space-x-2"
              >
                <Save size={16} />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Add Button */}
      <div className="absolute bottom-16 right-4 z-30 flex flex-col items-center space-y-4">
        {userLocation && (
          <Link href={`/building/new?lat=${userLocation[0]}&lng=${userLocation[1]}`}>
            <button className="w-14 h-14 rounded-full bg-purple-600 text-white shadow-lg flex items-center justify-center hover:bg-purple-800 transition">
              <Plus size={28} />
            </button>
          </Link>
        )}
      </div>
    </main>
  );
}