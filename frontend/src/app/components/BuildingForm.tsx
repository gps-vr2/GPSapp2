'use client';

import dynamic from 'next/dynamic';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

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
  buildingId?: number;
  selectedLanguage?: string;
  congregationId?: number;
  territoryId?: number;
  
}

const BuildingForm: React.FC<BuildingFormProps> = ({
  formData,
  position,
  onFormChange,
  onGpsChange,
  onCancel,
  isLoading,
  onMapMoveEnd,
  isEditMode = false,
  buildingId,
  congregationId = 2898201,
  territoryId = 1,
}) => {
  const router = useRouter();
  const [mapCenter, setMapCenter] = useState<[number, number]>(position);
  const [pinPosition, setPinPosition] = useState<[number, number]>(position);
  const [locationStatus, setLocationStatus] = useState<'loading' | 'success' | 'error' | 'denied'>('loading');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [mapZoom, setMapZoom] = useState(17);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  
  const currentGpsRef = useRef(formData.gps);
  const isEditModeRef = useRef(isEditMode);
  const positionRef = useRef(position);

  useEffect(() => {
    currentGpsRef.current = formData.gps;
    isEditModeRef.current = isEditMode;
    positionRef.current = position;
  });

  const handleGpsUpdate = useCallback((gpsString: string) => {
    if (currentGpsRef.current !== gpsString) {
      onGpsChange(gpsString);
    }
  }, [onGpsChange]);

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus('error');
      setMapCenter(positionRef.current);
      setPinPosition(positionRef.current);
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
        handleGpsUpdate(gpsString);
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
        
        setMapCenter(positionRef.current);
        setPinPosition(positionRef.current);
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  }, [handleGpsUpdate]);

  useEffect(() => {
    if (isInitialized) return;

    let mounted = true;

    const initializeLocation = () => {
      if (!mounted) return;

      if (!isEditModeRef.current || !currentGpsRef.current) {
        getCurrentLocation();
      } else {
        const coords = currentGpsRef.current.split(',').map(coord => parseFloat(coord.trim()));
        if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
          const existingPosition: [number, number] = [coords[0], coords[1]];
          setMapCenter(existingPosition);
          setPinPosition(existingPosition);
          setLocationStatus('success');
        }
      }
      setIsInitialized(true);
    };

    initializeLocation();

    return () => {
      mounted = false;
    };
  }, [getCurrentLocation, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    
    const lat = position[0];
    const lng = position[1];
    
    if ((!isEditMode || !formData.gps) && (lat !== mapCenter[0] || lng !== mapCenter[1])) {
      setMapCenter([lat, lng]);
      setPinPosition([lat, lng]);
      const gpsString = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      if (formData.gps !== gpsString) {
        handleGpsUpdate(gpsString);
      }
    }
  }, [position, isEditMode, formData.gps, mapCenter, handleGpsUpdate, isInitialized]);

  const handleMapMove = useCallback((lat: number, lng: number) => {
    const newCenter: [number, number] = [lat, lng];
    setMapCenter(newCenter);
    setPinPosition(newCenter);
    
    const gpsString = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    handleGpsUpdate(gpsString);
    
    if (onMapMoveEnd) {
      onMapMoveEnd(lat, lng);
    }
  }, [handleGpsUpdate, onMapMoveEnd]);

  const handlePinMove = useCallback((newPosition: [number, number]) => {
    setPinPosition(newPosition);
    setMapCenter(newPosition);
    const gpsString = `${newPosition[0].toFixed(6)}, ${newPosition[1].toFixed(6)}`;
    handleGpsUpdate(gpsString);
  }, [handleGpsUpdate]);

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

  const handleGpsInputChange = useCallback((value: string) => {
    onFormChange('gps', value);
    
    const coords = value.split(',').map(coord => parseFloat(coord.trim()));
    if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
      if (coords[0] >= -90 && coords[0] <= 90 && coords[1] >= -180 && coords[1] <= 180) {
        const newPosition: [number, number] = [coords[0], coords[1]];
        setMapCenter(newPosition);
        setPinPosition(newPosition);
        setLocationStatus('success');
      } else {
        setLocationStatus('error');
      }
    } else {
      setLocationStatus('error');
    }
  }, [onFormChange]);

  const handleZoomIn = useCallback(() => {
    setMapZoom(prev => Math.min(20, prev + 1));
  }, []);

  const handleZoomOut = useCallback(() => {
    setMapZoom(prev => Math.max(1, prev - 1));
  }, []);

  const isFormValid = useCallback(() => {
    const gpsCoords = formData.gps.split(',').map(coord => parseFloat(coord.trim()));
    const isGpsValid = gpsCoords.length === 2 && !isNaN(gpsCoords[0]) && !isNaN(gpsCoords[1]) &&
                       gpsCoords[0] >= -90 && gpsCoords[0] <= 90 &&
                       gpsCoords[1] >= -180 && gpsCoords[1] <= 180;

    return (
      isGpsValid &&
      formData.language.trim() !== '' &&
      formData.buildingAddress.trim() !== '' &&
      formData.numberOfDoors > 0 &&
      formData.addressInfo.length === formData.numberOfDoors &&
      formData.addressInfo.every(addr => addr.trim() !== '')
    );
  }, [formData]);

  const handleSave = useCallback(async () => {
    if (!isFormValid()) {
      console.warn("Form is not valid. Cannot save.");
      return false;
    }

    try {
      const gpsCoords = formData.gps.split(',').map(coord => parseFloat(coord.trim()));
      const [lat, long] = gpsCoords;

      const payload = {
        lat: lat,
        long: long,
        language: formData.language,
        numberOfDoors: formData.numberOfDoors,
        info: formData.addressInfo.join(', '),
        address: formData.buildingAddress,
        territory_id: territoryId,
        congregationId: congregationId
      };

      // Use the correct endpoint based on edit mode
      const url = isEditMode && buildingId
      ? `https://gp-sapp2-8ycr.vercel.app/api/door/${buildingId}`
      : 'https://gp-sapp2-8ycr.vercel.app/api/door';

      const method = isEditMode && buildingId ? 'PUT' : 'POST';

      console.log(`${method} request to: ${url}`);
      console.log('Payload:', payload);

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Backend error:', errorText);
        throw new Error(`Server responded with ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('Backend response:', result);

      setShowSuccessMessage(true);
      setTimeout(() => {
        setShowSuccessMessage(false);
        router.replace(`/?lat=${lat}&lng=${long}&${isEditMode ? 'updated' : 'newBuilding'}=true&timestamp=${Date.now()}`);
      }, 3000);

      return true;
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} building:`, error);
      alert(`Error ${isEditMode ? 'updating' : 'creating'} building: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }, [formData, territoryId, congregationId, router, isFormValid, isEditMode, buildingId]);

  return (
    <div className="space-y-4">
      {/* Success Message Pop-up */}
      {showSuccessMessage && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="relative p-6 rounded-lg shadow-2xl text-white text-center animate-fade-in-down
                      bg-gradient-to-br from-purple-600 via-blue-500 to-green-400
                        transform transition-all duration-500 ease-out scale-100 opacity-100">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-2xl font-bold mb-2">Success!</h3>
            <p className="text-lg">
              {isEditMode ? 'Building updated successfully!' : 'Building created successfully!'}
            </p>
          </div>
        </div>
      )}

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
            onMapMoveEnd={handleMapMove}
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
              {isEditMode ? 'Updating...' : 'Saving...'}
            </span>
          ) : (
            isEditMode ? 'Update Building' : 'Save Building'
          )}
        </button>
      </div>
    </div>
  );
};

export default BuildingForm;