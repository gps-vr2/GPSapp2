'use client';

import dynamic from 'next/dynamic';
import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

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
  onSave: () => Promise<boolean>;
  onCancel: () => void;
  isLoading: boolean;
  onMapMoveEnd?: (lat: number, lng: number) => void;
  isEditMode?: boolean;
}

const BuildingForm: React.FC<BuildingFormProps> = ({
  formData,
  position,
  onFormChange,
  onGpsChange,
  onSave,
  onCancel,
  isLoading,
  onMapMoveEnd,
  isEditMode = false,
}) => {
  const router = useRouter();
  const [mapCenter, setMapCenter] = useState<[number, number]>(position);
  const [pinPosition, setPinPosition] = useState<[number, number]>(position);
  const [locationStatus, setLocationStatus] = useState<'loading' | 'success' | 'error' | 'denied'>('loading');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [mapZoom, setMapZoom] = useState(17);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Get user's current location on component mount
  const getCurrentLocation = useCallback(() => {
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
        const gpsString = `${userLocation[0].toFixed(6)}, ${userLocation[1].toFixed(6)}`;
        onGpsChange(gpsString);
        setLocationStatus('success');
        setIsGettingLocation(false);
      },
      (error) => {
        console.log('Geolocation error:', error);
        
        if (error.code === error.PERMISSION_DENIED) {
          setLocationStatus('denied');
        } else {
          setLocationStatus('error');
        }
        
        setMapCenter(position);
        setPinPosition(position);
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  }, []); // Remove dependencies to prevent infinite loop

  // Initialize location - separate useEffect for initialization
  useEffect(() => {
    let mounted = true;

    const initializeLocation = () => {
      if (!mounted) return;

      if (!isEditMode || !formData.gps) {
        // Get current location for new buildings
        getCurrentLocation();
      } else {
        // Parse existing GPS for edit mode
        const coords = formData.gps.split(',').map(coord => parseFloat(coord.trim()));
        if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
          const existingPosition: [number, number] = [coords[0], coords[1]];
          setMapCenter(existingPosition);
          setPinPosition(existingPosition);
          setLocationStatus('success');
        }
      }
    };

    // Only initialize once when component mounts
    initializeLocation();

    return () => {
      mounted = false;
    };
  }, []); // Empty dependency array - only run once on mount

  // Separate useEffect to handle position prop changes
  useEffect(() => {
    if (position && (!isEditMode || !formData.gps)) {
      setMapCenter(position);
      setPinPosition(position);
      const gpsString = `${position[0].toFixed(6)}, ${position[1].toFixed(6)}`;
      if (formData.gps !== gpsString) {
        onGpsChange(gpsString);
      }
    }
  }, [position[0], position[1]]); // Watch for position changes

  // Enhanced map movement handler - this is the key function for drag updates
  const handleMapMove = useCallback((lat: number, lng: number) => {
    console.log('Map moved to:', lat, lng); // Debug log
    
    const newCenter: [number, number] = [lat, lng];
    setMapCenter(newCenter);
    setPinPosition(newCenter); // Update pin position to match map center
    
    // Update GPS coordinates with proper formatting
    const gpsString = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    console.log('Updating GPS to:', gpsString); // Debug log
    onGpsChange(gpsString);
    
    // Call parent callback if provided
    if (onMapMoveEnd) {
      onMapMoveEnd(lat, lng);
    }
  }, [onGpsChange, onMapMoveEnd]);

  // Handle pin dragging (if your Map component supports draggable markers)
  const handlePinMove = (newPosition: [number, number]) => {
    console.log('Pin moved to:', newPosition); // Debug log
    setPinPosition(newPosition);
    setMapCenter(newPosition); // Sync map center with pin
    const gpsString = `${newPosition[0].toFixed(6)}, ${newPosition[1].toFixed(6)}`;
    onGpsChange(gpsString);
  };

  const getLocationStatusMessage = () => {
    switch (locationStatus) {
      case 'loading':
        return 'Getting your location...';
      case 'success':
        return 'Location found! Drag map to update coordinates.';
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

  // Handle manual GPS input with validation
  const handleGpsInputChange = (value: string) => {
    onGpsChange(value);
    
    const coords = value.split(',').map(coord => parseFloat(coord.trim()));
    if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
      // Validate coordinate ranges
      if (coords[0] >= -90 && coords[0] <= 90 && coords[1] >= -180 && coords[1] <= 180) {
        const newPosition: [number, number] = [coords[0], coords[1]];
        setMapCenter(newPosition);
        setPinPosition(newPosition);
        setLocationStatus('success');
      }
    }
  };

  const handleZoomIn = () => {
    setMapZoom(prev => Math.min(20, prev + 1));
  };

  const handleZoomOut = () => {
    setMapZoom(prev => Math.max(1, prev - 1));
  };

  // Validate form before saving
  const isFormValid = () => {
    return (
      formData.gps.trim() !== '' &&
      formData.language.trim() !== '' &&
      formData.buildingAddress.trim() !== '' &&
      formData.numberOfDoors > 0 &&
      formData.addressInfo.every(addr => addr.trim() !== '') &&
      formData.addressInfo.length === formData.numberOfDoors
    );
  };

  // Enhanced save handler with better success feedback
  const handleSave = async (): Promise<boolean> => {
    // Call the parent's onSave function instead of handling it here
    try {
      setShowSuccessMessage(false); // Reset any existing success message
      const result = await onSave();
      
      if (result) {
        setShowSuccessMessage(true);
        // Navigate back to main page after 1.5 seconds with the new building coordinates
        setTimeout(() => {
          setShowSuccessMessage(false);
          // Navigate to main page with the newly added building coordinates
          // Use replace instead of push to prevent going back to the form
          router.replace(`/?lat=${position[0]}&lng=${position[1]}&newBuilding=true&timestamp=${Date.now()}`);
        }, 1500);
      }
      
      return result;
    } catch (error) {
      console.error('Error in handleSave:', error);
      return false;
    }
  };

  // Success Message Component
  const SuccessMessage = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm mx-4 text-center shadow-xl">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Success!</h3>
        <p className="text-gray-600">Building saved successfully</p>
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div className="bg-green-600 h-1 rounded-full animate-pulse" style={{width: '100%'}}></div>
          </div>
          <p className="text-sm text-gray-500 mt-2">Redirecting to main page...</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="space-y-4">
        {/* GPS Field */}
        <div>
          <label className="block text-sm font-medium mb-1">GPS Coordinates*</label>
          <div className="flex items-center">
            <input
              type="text"
              value={formData.gps}
              onChange={(e) => handleGpsInputChange(e.target.value)}
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Latitude, Longitude"
              required
            />
            <button
              onClick={getCurrentLocation}
              disabled={isGettingLocation}
              className="ml-2 p-2 bg-purple-700 text-white rounded-md hover:bg-purple-600 disabled:bg-gray-400 flex-shrink-0 transition-colors"
              title="Get current location"
            >
              {isGettingLocation ? (
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          </div>
          <p className={`text-xs mt-1 ${getLocationStatusColor()}`}>
            {getLocationStatusMessage()}
          </p>
        </div>

        {/* Enhanced Map with better drag handling */}
        <div className="relative h-64 border rounded-md overflow-hidden shadow-sm">
          <div className="w-full h-full relative">
            <Map
              center={mapCenter}
              zoom={mapZoom}
              draggable={true}
              showMarker={true}
              showViewToggle={true}
              markerPosition={pinPosition}
              onPositionChange={handlePinMove}
              onMapDoubleClick={handlePinMove}
              onMapMoveEnd={handleMapMove} // This is crucial for drag updates
              instructionText="Drag map or move marker to update coordinates"
              height="100%"
            />
            
            {/* Crosshair overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[1000]">
              <Image
                src="/focus.svg"
                alt="crosshair"
                width={50}
                height={50}
                className="w-12 h-12"
                style={{ filter: 'drop-shadow(0 0 3px rgba(0,0,0,0.5))' }}
              />
            </div>
            
            
            {/* Zoom controls */}
            <div className="absolute top-2 right-2 flex flex-col bg-white rounded shadow-md overflow-hidden z-[1001]">
              <button
                onClick={handleZoomIn}
                className="px-2 py-1 text-lg font-bold hover:bg-gray-100 border-b transition-colors"
                title="Zoom in"
              >
                +
              </button>
              <button
                onClick={handleZoomOut}
                className="px-2 py-1 text-lg font-bold hover:bg-gray-100 transition-colors"
                title="Zoom out"
              >
                −
              </button>
            </div>
          </div>
        </div>

        {/* Language Dropdown */}
        <div>
          <label className="block text-sm font-medium mb-1">Language*</label>
          <div className="relative">
            <select
              value={formData.language}
              onChange={(e) => onFormChange('language', e.target.value)}
              className="w-full p-2 border rounded-md appearance-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            >
              <option value="">Select a language</option>
              <option value="English">English</option>
              <option value="Tamil">Tamil</option>
              <option value="Hindi">Hindi</option>
              <option value="Telugu">Telugu</option>
              <option value="Malayalam">Malayalam</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="e.g. 123 Main St, City"
            required
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
              className="flex-1 p-2 border rounded-md bg-gray-50"
            />
            <button
              onClick={() =>
                onFormChange('numberOfDoors', Math.max(0, formData.numberOfDoors - 1))
              }
              className="mx-2 px-3 py-2 border rounded-md hover:bg-gray-50 font-bold transition-colors"
              disabled={formData.numberOfDoors <= 0}
            >
              −
            </button>
            <button
              onClick={() => onFormChange('numberOfDoors', formData.numberOfDoors + 1)}
              className="px-3 py-2 border rounded-md hover:bg-gray-50 font-bold transition-colors"
            >
              +
            </button>
          </div>
        </div>

        {/* Door Info */}
        {formData.numberOfDoors > 0 && (
          <div>
            <label className="block text-sm font-medium mb-1">Door Details*</label>
            {formData.addressInfo.map((address, index) => (
              <input
                key={index}
                type="text"
                value={address}
                onChange={(e) => onFormChange('addressInfo', e.target.value, index)}
                className="w-full p-2 mb-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder={`Address for door ${index + 1}`}
                required
              />
            ))}
          </div>
        )}

        {/* Form Validation Message */}
        {!isFormValid() && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded-md border border-red-200">
            ⚠️ Please fill in all required fields before saving.
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end mt-6 space-x-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50 transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
            disabled={isLoading || !isFormValid()}
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            ) : (
              'Save Building'
            )}
          </button>
        </div>
      </div>

      {/* Success Message Modal */}
      {showSuccessMessage && <SuccessMessage />}
    </>
  );
};

export default BuildingForm;