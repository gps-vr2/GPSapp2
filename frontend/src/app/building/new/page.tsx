'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import BuildingForm from '../../components/BuildingForm';

// Create a separate component for the search params logic
const BuildingNewContent: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const latParam = searchParams.get('lat');
  const lngParam = searchParams.get('lng');

  const [position, setPosition] = useState<[number, number] | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const [formData, setFormData] = useState({
    gps: '',
    language: 'English',
    numberOfDoors: 1,
    addressInfo: [''],
    buildingAddress: ''
  });

  const [originalFormData, setOriginalFormData] = useState(formData);

  useEffect(() => {
    if (latParam && lngParam) {
      const latFloat = parseFloat(latParam);
      const lngFloat = parseFloat(lngParam);
      if (!isNaN(latFloat) && !isNaN(lngFloat)) {
        setPosition([latFloat, lngFloat]);
        const initialFormData = {
          gps: `${latFloat.toFixed(6)}, ${lngFloat.toFixed(6)}`,
          language: 'English',
          numberOfDoors: 1,
          addressInfo: [''],
          buildingAddress: ''
        };
        setFormData(initialFormData);
        setOriginalFormData(initialFormData);
      }
    } else {
      // Set default position if no params provided
      const defaultLat = 11.0168; // Default to Coimbatore coordinates
      const defaultLng = 76.9558;
      setPosition([defaultLat, defaultLng]);
      const initialFormData = {
        gps: `${defaultLat.toFixed(6)}, ${defaultLng.toFixed(6)}`,
        language: 'English',
        numberOfDoors: 1,
        addressInfo: [''],
        buildingAddress: ''
      };
      setFormData(initialFormData);
      setOriginalFormData(initialFormData);
    }
    setIsDataLoaded(true);
  }, [latParam, lngParam]);

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
        router.push('/'); // Navigate to main page
      }
    } else {
      router.push('/'); // Navigate to main page
    }
  };

  const handleSave = async (): Promise<boolean> => {
    if (!position) {
      setErrorMessage('No position available for saving');
      setShowErrorMessage(true);
      return false;
    }

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
      // Prepare data for API call
      const apiData = {
        lat: position[0],
        long: position[1],
        info: validDoorInfo.join(', '),
        numberOfDoors: formData.numberOfDoors,
        language: formData.language,
        address: formData.buildingAddress.trim()
      };

      console.log('Sending API request with data:', apiData);

      // Call your API route
      const response = await fetch(`https://gp-sapp2-8ycr.vercel.app/api/door`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(apiData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save building: ${errorText}`);
      }

      const result = await response.json();
      console.log('Building saved successfully:', result);

      setShowSuccessMessage(true);
      setHasUnsavedChanges(false);

      // Navigate back to main page after 2 seconds with the new building coordinates
      setTimeout(() => {
        setShowSuccessMessage(false);
        // Navigate to main page with the newly added building coordinates and building ID
        const buildingId = result.id || result._id || result.buildingId || Date.now();
        router.push(`/?lat=${position[0]}&lng=${position[1]}&newBuilding=true&newBuildingId=${buildingId}`);
      }, 2000);

      return true;

    } catch (error) {
      console.error('Error saving building:', error);
      setErrorMessage(`Failed to save building: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setShowErrorMessage(true);
      
      setTimeout(() => {
        setShowErrorMessage(false);
      }, 5000);
      
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced map movement handler with better synchronization
  const handleMapMoveEnd = useCallback((lat: number, lng: number) => {
    console.log('Map moved to:', lat, lng);
    
    // Validate coordinates
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      console.warn('Invalid coordinates received:', lat, lng);
      return;
    }
    
    const newPosition: [number, number] = [lat, lng];
    setPosition(newPosition);
    
    // Update the GPS field in form data when map moves
    const newGpsString = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    setFormData(prev => ({
      ...prev,
      gps: newGpsString
    }));
    
    console.log('Updated position and GPS:', newPosition, newGpsString);
  }, []); // Empty dependency array to prevent re-creation

  const handleFormChange = (field: string, value: string | number, index?: number) => {
    console.log('Form field changed:', field, value, index);
    
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

  // Enhanced GPS change handler with position synchronization
  const handleGpsChange = useCallback((newGps: string) => {
    console.log('GPS input changed:', newGps);
    
    setFormData(prev => ({
      ...prev,
      gps: newGps
    }));
    
    // Parse and validate GPS coordinates
    const coords = newGps.split(',').map(coord => parseFloat(coord.trim()));
    if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
      // Validate coordinate ranges
      if (coords[0] >= -90 && coords[0] <= 90 && coords[1] >= -180 && coords[1] <= 180) {
        console.log('Setting new position from GPS input:', coords);
        setPosition([coords[0], coords[1]]);
      } else {
        console.warn('GPS coordinates out of valid range:', coords);
      }
    }
  }, []); // Empty dependency array to prevent re-creation

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all changes?')) {
      setFormData(originalFormData);
      if (originalFormData.gps) {
        const coords = originalFormData.gps.split(',').map(coord => parseFloat(coord.trim()));
        if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
          setPosition([coords[0], coords[1]]);
        }
      }
    }
  };

  if (!position || !isDataLoaded) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing location...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-purple-700 shadow-sm">
        <button 
          onClick={handleCancel} 
          className="p-2 hover:bg-purple-600 rounded"
          disabled={isLoading}
        >
          <svg className="w-6 h-6" fill="none" stroke="white" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        
        <div className="flex items-center space-x-4">
          <h1 className="text-white text-lg font-semibold">Add New Building</h1>
          {hasUnsavedChanges && (
            <span className="text-yellow-200 text-sm">● Unsaved changes</span>
          )}
          {isLoading && (
            <div className="flex items-center text-white text-sm">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Reset Button */}
          <button 
            onClick={handleReset}
            className="p-2 bg-gray-600 rounded hover:bg-gray-700 disabled:bg-gray-400"
            disabled={isLoading || !hasUnsavedChanges}
            title="Reset changes"
          >
            <svg className="w-5 h-5" fill="none" stroke="white" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Content */}
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
          isEditMode={false}
        />
      </div>

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-70 z-[9999]">
          <div className="bg-white p-6 rounded-lg shadow-xl border border-green-200">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-green-600 font-bold">Building saved successfully!</p>
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

// Loading component for suspense fallback
const LoadingSpinner: React.FC = () => (
  <div className="h-screen w-full flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-700 mx-auto mb-4"></div>
      <h2 className="text-xl font-semibold text-gray-700 mb-2">Loading Application</h2>
      <p className="text-gray-500">Please wait while we prepare the form...</p>
    </div>
  </div>
);

// Main component with Suspense boundary
const BuildingNewPage: React.FC = () => {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <BuildingNewContent />
    </Suspense>
  );
};

export default BuildingNewPage;