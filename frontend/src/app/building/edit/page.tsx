'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import BuildingForm from '../../components/BuildingForm';

interface BuildingData {
  id: string;
  lat: number;
  long: number;
  // Add all possible coordinate field variations
  latitude?: number;
  longitude?: number;
  lng?: number;
  Lat?: number;
  Long?: number;
  Latitude?: number;
  Longitude?: number;
  Lng?: number;
  // Add nested coordinates object
  coordinates?: {
    lat?: number;
    long?: number;
    latitude?: number;
    longitude?: number;
    lng?: number;
  };
  // Other properties
  language?: string;
  numberOfDoors?: number;
  info?: string;
  address?: string;
  // Add other possible fields that might come from API
  _id?: string;
  buildingId?: string;
}

const BuildingEditContent: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const buildingId = searchParams.get('id');

  const [position, setPosition] = useState<[number, number] | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const [formData, setFormData] = useState({
    gps: '',
    language: 'English',
    numberOfDoors: 1,
    addressInfo: [''],
    buildingAddress: ''
  });

  const [originalData, setOriginalData] = useState<BuildingData | null>(null);
  const [originalFormData, setOriginalFormData] = useState(formData);

  const loadBuildingData = useCallback(async () => {
    if (!buildingId) return;
    
    try {
      setIsLoading(true);
      setErrorMessage('');
      
      // Try multiple API endpoints to handle different possible structures
      const possibleEndpoints = [
        `https://gp-sapp2-8ycr.vercel.app/api/door/${buildingId}`,
        `https://gp-sapp2-8ycr.vercel.app/api/buildings/${buildingId}`,
        `https://gp-sapp2-8ycr.vercel.app/api/door?id=${buildingId}`,
        `https://gp-sapp2-8ycr.vercel.app/api/buildings?id=${buildingId}`,
        `https://gp-sapp2-8ycr.vercel.app/api/buildings`, // Get all buildings and filter
      ];

      let data: BuildingData | null = null;
      let lastError: Error | null = null;

      for (const endpoint of possibleEndpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
          });

          if (response.ok) {
            const responseData = await response.json();
            
            // Handle different API response formats
            if (responseData.buildings && Array.isArray(responseData.buildings)) {
              // Find the specific building by ID
              data = responseData.buildings.find((building:BuildingData) => 
                String(building.id) === String(buildingId) || 
                String(building._id) === String(buildingId) ||
                String(building.buildingId) === String(buildingId)
              );
              
              if (!data && responseData.buildings.length > 0) {
                console.warn(`Building with ID ${buildingId} not found. Available buildings:`, 
                  responseData.buildings.map((b: BuildingData) => ({ id: b.id, _id: b._id, buildingId: b.buildingId }))
                );
                // Don't use fallback, let user know the specific building wasn't found
              }
            } else if (responseData.id || responseData._id) {
              // Direct building object
              data = responseData;
            } else {
              // Unknown format, try to use as-is
              data = responseData;
            }
            
            if (data) break;
          }
        } catch (error) {
          lastError = error as Error;
          continue;
        }
      }

      if (!data) {
        throw lastError || new Error('Building not found or failed to load building data from all endpoints');
      }

      // Debug log the entire response and extracted building
      console.log('Extracted building data:', data);

      // Handle different possible coordinate field names with proper type checking
      let lat: number | undefined = data.lat || data.latitude || data.Lat || data.Latitude;
      let long: number | undefined = data.long || data.lng || data.longitude || data.Long || data.Lng || data.Longitude;
      
      // Comprehensive coordinate validation
      console.log('Extracted coordinates:', { lat, long, type_lat: typeof lat, type_long: typeof long });
      
      // Check if coordinates exist and are not null/undefined
      if (lat === null || lat === undefined || long === null || long === undefined) {
        // Try to find coordinates in nested objects
        if (data.coordinates) {
          lat = data.coordinates.lat || data.coordinates.latitude || data.coordinates.lng;
          long = data.coordinates.long || data.coordinates.lng || data.coordinates.longitude;
        }
        
        if (lat === null || lat === undefined || long === null || long === undefined) {
          // Set default coordinates (Chennai, India as an example - change as needed)
          console.warn('No coordinates found, using default location');
          lat = 13.0827; // Chennai latitude
          long = 80.2707; // Chennai longitude
        }
      }
      
      // Convert to numbers and validate
      const numLat = Number(lat);
      const numLong = Number(long);
      
      if (isNaN(numLat) || isNaN(numLong)) {
        throw new Error(`Invalid coordinate format from API: lat="${lat}" (${typeof lat}), long="${long}" (${typeof long})`);
      }
      
      // Validate coordinate ranges
      if (numLat < -90 || numLat > 90) {
        throw new Error(`Latitude out of valid range (-90 to 90): ${numLat}`);
      }
      
      if (numLong < -180 || numLong > 180) {
        throw new Error(`Longitude out of valid range (-180 to 180): ${numLong}`);
      }

      // Create a properly typed building data object
      const buildingData: BuildingData = {
        ...data,
        lat: numLat,
        long: numLong
      };

      setOriginalData(buildingData);
      
      const formDataFromAPI = {
        gps: `${numLat}, ${numLong}`,
        language: data.language || 'English',
        numberOfDoors: data.numberOfDoors || 1,
        addressInfo: data.info ? data.info.split(', ').filter(info => info.trim()) : [''],
        buildingAddress: data.address || ''
      };
      
      // Ensure we have at least one door info field
      if (formDataFromAPI.addressInfo.length === 0) {
        formDataFromAPI.addressInfo = [''];
      }
      
      // Ensure addressInfo array matches numberOfDoors
      while (formDataFromAPI.addressInfo.length < formDataFromAPI.numberOfDoors) {
        formDataFromAPI.addressInfo.push('');
      }
      
      setFormData(formDataFromAPI);
      setOriginalFormData(formDataFromAPI);
      setPosition([numLat, numLong]);
      setIsDataLoaded(true);
      
    } catch (error) {
      console.error('Error loading building data:', error);
      setErrorMessage(`Failed to load building data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setShowErrorMessage(true);
    } finally {
      setIsLoading(false);
    }
  }, [buildingId]);

  useEffect(() => {
    if (buildingId) {
      loadBuildingData();
    }
  }, [buildingId, loadBuildingData]);

  // Check for unsaved changes
  useEffect(() => {
    if (isDataLoaded) {
      const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalFormData);
      setHasUnsavedChanges(hasChanges);
    }
  }, [formData, originalFormData, isDataLoaded]);

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to leave without saving?')) {
        router.back();
      }
    } else {
      router.back();
    }
  };

  const handleSave = async (): Promise<boolean> => {
    if (!position || !buildingId) return false;

    // Validate form data
    if (!formData.buildingAddress.trim()) {
      setErrorMessage('Please enter a building address');
      setShowErrorMessage(true);
      return false;
    }

    // Filter out empty door info and validate
    const validDoorInfo = formData.addressInfo.filter(info => info.trim());
    if (validDoorInfo.length === 0) {
      setErrorMessage('Please fill in at least one door information field');
      setShowErrorMessage(true);
      return false;
    }

    if (validDoorInfo.length !== formData.numberOfDoors) {
      setErrorMessage(`Number of doors (${formData.numberOfDoors}) must match the number of door information fields provided (${validDoorInfo.length})`);
      setShowErrorMessage(true);
      return false;
    }

    setIsLoading(true);
    setShowErrorMessage(false);
    setErrorMessage('');

    try {
      const apiData = {
        lat: position[0],
        long: position[1],
        info: validDoorInfo.join(', '),
        numberOfDoors: formData.numberOfDoors,
        language: formData.language,
        address: formData.buildingAddress.trim()
      };

      // Try multiple update endpoints
      const possibleEndpoints = [
        `https://gp-sapp2-8ycr.vercel.app/api/door/${buildingId}`,
        `https://gp-sapp2-8ycr.vercel.app/api/buildings/${buildingId}`,
      ];

      let success = false;
      let lastError: Error | null = null;

      for (const endpoint of possibleEndpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify(apiData),
          });

          if (response.ok) {
            const result = await response.json();
            console.log('Building updated:', result);
            success = true;
            break;
          }
        } catch (error) {
          lastError = error as Error;
          continue;
        }
      }

      if (!success) {
        throw lastError || new Error('Failed to update building on all endpoints');
      }

      setShowSuccessMessage(true);
      setHasUnsavedChanges(false);
      
      // Update original form data to reflect saved state
      setOriginalFormData(formData);

      setTimeout(() => {
        setShowSuccessMessage(false);
        router.back();
      }, 2000);

      return true;

    } catch (error) {
      console.error('Error updating building:', error);
      setErrorMessage(`Failed to update building: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setShowErrorMessage(true);
      
      setTimeout(() => {
        setShowErrorMessage(false);
      }, 5000);
      
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!buildingId) return;

    setIsDeleting(true);
    setErrorMessage('');

    try {
      // Simply delete the building without saving to deleted buildings
      const possibleEndpoints = [
        `https://gp-sapp2-8ycr.vercel.app/api/door/${buildingId}`,
        `https://gp-sapp2-8ycr.vercel.app/api/buildings/${buildingId}`,
      ];

      let success = false;
      let lastError: Error | null = null;

      for (const endpoint of possibleEndpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            success = true;
            break;
          }
        } catch (error) {
          lastError = error as Error;
          continue;
        }
      }

      if (!success) {
        throw lastError || new Error('Failed to delete building on all endpoints');
      }

      setShowSuccessMessage(true);
      setTimeout(() => {
        router.push('/'); // Navigate to home page
      }, 2000);

    } catch (error) {
      console.error('Error deleting building:', error);
      setErrorMessage(`Failed to delete building: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setShowErrorMessage(true);
      
      setTimeout(() => {
        setShowErrorMessage(false);
      }, 5000);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleMapMoveEnd = (lat: number, lng: number) => {
    const newPosition: [number, number] = [lat, lng];
    setPosition(newPosition);
    setFormData(prev => ({
      ...prev,
      gps: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    }));
  };

  const handleFormChange = (field: string, value: string | number, index?: number) => {
    if (field === 'addressInfo' && typeof index === 'number') {
      const newAddresses = [...formData.addressInfo];
      newAddresses[index] = value as string;
      setFormData(prev => ({
        ...prev,
        addressInfo: newAddresses
      }));
    } else if (field === 'numberOfDoors') {
      const newDoorCount = Number(value);
      const updatedAddresses = [...formData.addressInfo];
      
      // Add new empty fields if increasing door count
      while (updatedAddresses.length < newDoorCount) {
        updatedAddresses.push('');
      }
      
      // Remove fields if decreasing door count
      while (updatedAddresses.length > newDoorCount) {
        updatedAddresses.pop();
      }
      
      setFormData(prev => ({
        ...prev,
        numberOfDoors: newDoorCount,
        addressInfo: updatedAddresses
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleGpsChange = (newGps: string) => {
    setFormData(prev => ({
      ...prev,
      gps: newGps
    }));
    const coordinates = newGps.split(',').map(coord => parseFloat(coord.trim()));
    if (coordinates.length === 2 && !isNaN(coordinates[0]) && !isNaN(coordinates[1])) {
      setPosition([coordinates[0], coordinates[1]]);
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all changes?')) {
      setFormData(originalFormData);
      if (originalData && typeof originalData.lat === 'number' && typeof originalData.long === 'number') {
        setPosition([originalData.lat, originalData.long]);
      }
    }
  };

  if (!buildingId) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Invalid Building ID</h2>
          <button onClick={() => router.back()} className="text-blue-600 hover:underline">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (isLoading && !originalData) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading building data...</p>
        </div>
      </div>
    );
  }

  // Only render the form when we have valid position data
  if (!position || !isDataLoaded) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-purple-700 shadow-sm">
        <button onClick={handleCancel} className="p-2 hover:bg-purple-600 rounded">
          <svg className="w-6 h-6" fill="none" stroke="white" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        
        <div className="flex items-center space-x-4">
          <h1 className="text-white text-lg font-semibold">
            Edit Building #{buildingId}
          </h1>
          {hasUnsavedChanges && (
            <span className="text-yellow-200 text-sm">● Unsaved changes</span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Reset Button */}
          <button 
            onClick={handleReset}
            className="p-2 bg-gray-600 rounded hover:bg-gray-700 disabled:bg-gray-400"
            disabled={isDeleting || !hasUnsavedChanges}
            title="Reset changes"
          >
            <svg className="w-5 h-5" fill="none" stroke="white" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          
          {/* Delete Button */}
          <button 
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 bg-red-600 rounded hover:bg-red-700 disabled:bg-red-400"
            disabled={isDeleting}
            title="Delete building"
          >
            <svg className="w-6 h-6" fill="none" stroke="white" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="p-4">
        <BuildingForm
          formData={formData}
          onFormChange={handleFormChange}
          onGpsChange={handleGpsChange}
          position={position}
          onSave={handleSave}
          onCancel={handleCancel} 
          isLoading={isLoading}
          onMapMoveEnd={handleMapMoveEnd}
          isEditMode={true}
        />
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-[9999]">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm mx-4">
            <div className="flex items-center mb-4">
              <svg className="w-6 h-6 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h3 className="text-lg font-semibold">Delete Building</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this building? This action cannot be undone.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-70 z-[9999]">
          <div className="bg-white p-6 rounded-lg shadow-xl border border-green-200">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-green-600 font-bold">
                {isDeleting ? 'Building deleted successfully!' : 'Building updated successfully!'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {showErrorMessage && (
        <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-70 z-[9999]">
          <div className="bg-white p-6 rounded-lg shadow-xl border border-red-200 max-w-md mx-4">
            <div className="flex items-start">
              <svg className="w-6 h-6 text-red-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <div>
                <p className="text-red-600 font-bold">Error occurred</p>
                <p className="text-red-500 text-sm mt-1">{errorMessage || 'Please try again.'}</p>
              </div>
            </div>
            <button 
              onClick={() => setShowErrorMessage(false)}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 w-full"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const LoadingSpinner: React.FC = () => (
  <div className="h-screen w-full flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-700 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

const BuildingEditPage: React.FC = () => {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <BuildingEditContent />
    </Suspense>
  );
};

export default BuildingEditPage;