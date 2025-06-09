'use client';

import React, { useState, useEffect, Suspense } from 'react';
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
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    gps: '',
    language: 'English',
    numberOfDoors: 1,
    addressInfo: [''],
    buildingAddress: ''
  });

  useEffect(() => {
    if (latParam && lngParam) {
      const latFloat = parseFloat(latParam);
      const lngFloat = parseFloat(lngParam);
      setPosition([latFloat, lngFloat]);
      setFormData(prev => ({
        ...prev,
        gps: `${latFloat.toFixed(6)}, ${lngFloat.toFixed(6)}`
      }));
    }
  }, [latParam, lngParam]);

  const handleCancel = () => {
    router.back();
  };

  const handleSave = async () => {
    if (!position) return;

    setIsLoading(true);
    setShowErrorMessage(false);

    try {
      // Prepare data for API call
      const apiData = {
        lat: position[0],
        long: position[1],
        info: formData.addressInfo.join(', '), // Combine all address info
        numberOfDoors: formData.numberOfDoors,
        language: formData.language,
        address: formData.buildingAddress 
      };

      // Call your API route on the backend server
      const response = await fetch(`https://gp-sapp2-8ycr.vercel.app/api/door`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
      });

      if (!response.ok) {
        throw new Error('Failed to save building');
      }

      const result = await response.json();
      console.log('Building saved:', result);

      // Show success message
      setShowSuccessMessage(true);

      // After 2 seconds, redirect to home
      setTimeout(() => {
        router.push('/');
      }, 2000);

    } catch (error) {
      console.error('Error saving building:', error);
      setShowErrorMessage(true);
      
      // Hide error message after 3 seconds
      setTimeout(() => {
        setShowErrorMessage(false);
      }, 3000);
    } finally {
      setIsLoading(false);
    }
  };

  // New function to handle map movement and update GPS coordinates
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
      while (updatedAddresses.length < newDoorCount) updatedAddresses.push('');
      while (updatedAddresses.length > newDoorCount) updatedAddresses.pop();
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
    const [newLat, newLng] = newGps.split(',').map(coord => parseFloat(coord.trim()));
    if (!isNaN(newLat) && !isNaN(newLng)) {
      setPosition([newLat, newLng]);
    }
  };

  if (!position) {
    return <div className="h-screen w-full flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen w-full bg-white">
      <div className="flex items-center p-2 bg-purple-700 shadow-sm">
        <button onClick={handleCancel} className="p-2">
          <svg className="w-6 h-6" fill="none" stroke="white" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
      </div>

      <div className="p-4">
        <BuildingForm
          formData={formData}
          onFormChange={handleFormChange}
          onGpsChange={handleGpsChange}
          position={position}
          onSave={handleSave}
          onCancel={handleCancel} 
          isLoading={isLoading}
          onMapMoveEnd={handleMapMoveEnd} // Pass the new handler to BuildingForm
        />
      </div>

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-70 z-[9999]">
          <div className="bg-white p-4 rounded-md shadow-xl border border-green-200">
            <p className="text-green-600 font-bold">Building saved successfully!</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {showErrorMessage && (
        <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-70 z-[9999]">
          <div className="bg-white p-4 rounded-md shadow-xl border border-red-200">
            <p className="text-red-600 font-bold">Error saving building. Please try again.</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Loading component for suspense fallback
const LoadingSpinner: React.FC = () => (
  <div className="h-screen w-full flex items-center justify-center">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-700"></div>
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