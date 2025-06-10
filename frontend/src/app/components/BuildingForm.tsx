'use client';

import dynamic from 'next/dynamic';
import React, { useState, useEffect } from 'react';

// Load the Map component client-side only
const Map = dynamic(() => import('./Map'), { ssr: false });

interface BuildingFormProps {
  formData: {
    gps: string;
    language: string;
    numberOfDoors: number;
    addressInfo: string[];
    buildingAddress: string;
  };
  position: [number, number];
  onFormChange: (field: string, value: string | number, index?: number) => void;
  onGpsChange: (gps: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isLoading: boolean;
  onMapMoveEnd?: (lat: number, lng: number) => void; // Add this prop
}

const BuildingForm: React.FC<BuildingFormProps> = ({
  formData,
  position,
  onFormChange,
  onGpsChange,
  onSave,
  onCancel,
  isLoading,
  onMapMoveEnd, // Add this prop
}) => {
  const [mapCenter, setMapCenter] = useState<[number, number]>(position);
  const [pinPosition, setPinPosition] = useState<[number, number]>(position);
  const [locationStatus, setLocationStatus] = useState<'loading' | 'success' | 'error' | 'denied'>('loading');
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Get user's current location on component mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('error');
      setMapCenter(position);
      setPinPosition(position);
      return;
    }

    setIsGettingLocation(true);
    setLocationStatus('loading');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLocation: [number, number] = [
          pos.coords.latitude,
          pos.coords.longitude,
        ];
        setMapCenter(userLocation);
        setPinPosition(userLocation);
        const gpsString = `${userLocation[0].toFixed(6)},${userLocation[1].toFixed(6)}`;
        onGpsChange(gpsString);
        setLocationStatus('success');
        setIsGettingLocation(false);
      },
      (error) => {
        console.log('Geolocation error:', error);
        
        // Set status based on error type
        if (error.code === error.PERMISSION_DENIED) {
          setLocationStatus('denied');
        } else {
          setLocationStatus('error');
        }
        
        // Fall back to the provided position
        setMapCenter(position);
        setPinPosition(position);
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  const handlePinMove = (newPosition: [number, number]) => {
    setPinPosition(newPosition);
    const gpsString = `${newPosition[0].toFixed(6)},${newPosition[1].toFixed(6)}`;
    onGpsChange(gpsString);
  };

  const handleMapMove = (lat: number, lng: number) => {
    setMapCenter([lat, lng]);
    // Update GPS coordinates based on crosshair position (map center)
    if (onMapMoveEnd) {
      onMapMoveEnd(lat, lng);
    }
  };

  const getLocationStatusMessage = () => {
    switch (locationStatus) {
      case 'loading':
        return 'Getting your location...';
      case 'success':
        return 'Location found!';
      case 'denied':
        return 'Location access denied. Please enable location access or enter GPS coordinates manually.';
      case 'error':
        return 'Could not get your location. Please enter GPS coordinates manually.';
      default:
        return '';
    }
  };

  const getLocationStatusColor = () => {
    switch (locationStatus) {
      case 'loading':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'denied':
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-4">
      {/* GPS Field */}
      <div>
        <label className="block text-sm font-medium mb-1">GPS*</label>
        <div className="flex items-center">
          <input
            type="text"
            value={formData.gps}
            onChange={(e) => onGpsChange(e.target.value)}
            className="w-full p-2 border rounded-md"
            placeholder="Latitude, Longitude"
          />
          <button
            onClick={getCurrentLocation}
            disabled={isGettingLocation}
            className="ml-2 p-2 bg-purple-700 text-white rounded-md hover:bg-purple-600 disabled:bg-gray-400"
            title="Get current location"
          >
            {isGettingLocation ? (
              <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            )}
          </button>
        </div>
        {/* Location Status Message */}
        {locationStatus !== 'success' && (
          <p className={`text-xs mt-1 ${getLocationStatusColor()}`}>
            {getLocationStatusMessage()}
          </p>
        )}
      </div>

      {/* Map with Crosshair and pin */}
      <div className="relative h-64 border rounded-md overflow-hidden shadow-sm">
        <Map
          center={mapCenter}
          zoom={17}
          draggable={true}
          showDraggablePin={true}
          showViewToggle={true}
          markerPosition={pinPosition}
          onPositionChange={handlePinMove}
          onMapDoubleClick={handlePinMove}
          onMapMoveEnd={handleMapMove}
          instructionText="Move map or double-click to update location"
          height="100%"
        />
        <img
          src="/focus.svg"
          alt="crosshair"
          className="pointer-events-none w-40 h-40 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999]"
        />
        <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
          Move map to update GPS coordinates
        </div>
      </div>

      {/* Language Dropdown */}
      <div>
        <label className="block text-sm font-medium mb-1">Language*</label>
        <div className="relative">
          <select
            value={formData.language}
            onChange={(e) => onFormChange('language', e.target.value)}
            className="w-full p-2 border rounded-md appearance-none"
          >
            <option value="English">English</option>
            <option value="Tamil">Tamil</option>
            <option value="Hindi">Hindi</option>
            <option value="Telugu">Telugu</option>
            <option value="Malayalam">Malayalam</option>
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
            <svg
              className="w-4 h-4 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Building Address */}
      <div>
        <label className="block text-sm font-medium mb-1">Building Address*</label>
        <input
          type="text"
          value={formData.buildingAddress}
          onChange={(e) => onFormChange('buildingAddress', e.target.value)}
          className="w-full p-2 border rounded-md"
          placeholder="e.g. 123 Main St, City"
        />
      </div>

      {/* Number of Doors */}
      <div>
        <label className="block text-sm font-medium mb-1">Number of Doors*</label>
        <div className="flex items-center">
          <input
            type="text"
            value={formData.numberOfDoors}
            readOnly
            className="flex-1 p-2 border rounded-md"
          />
          <button
            onClick={() =>
              onFormChange('numberOfDoors', Math.max(0, formData.numberOfDoors - 1))
            }
            className="mx-2 px-2 py-1 border rounded-md hover:bg-gray-50"
          >
            −
          </button>
          <button
            onClick={() => onFormChange('numberOfDoors', formData.numberOfDoors + 1)}
            className="px-2 py-1 border rounded-md hover:bg-gray-50"
          >
            +
          </button>
        </div>
      </div>

      {/* Door Info */}
      <div>
        <label className="block text-sm font-medium mb-1">Door details*</label>
        {formData.addressInfo.map((address, index) => (
          <input
            key={index}
            type="text"
            value={address}
            onChange={(e) => onFormChange('addressInfo', e.target.value, index)}
            className="w-full p-2 mb-2 border rounded-md"
            placeholder={`e.g. Address for door ${index + 1}`}
          />
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end mt-6">
        <button
          onClick={onCancel}
          className="px-4 py-2 mr-2 bg-gray-200 rounded-md hover:bg-gray-300"
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          className="px-4 py-2 bg-green-100 text-green-800 rounded-md hover:bg-green-200"
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
};

export default BuildingForm;