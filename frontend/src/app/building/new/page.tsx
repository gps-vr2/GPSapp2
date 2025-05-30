'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import BuildingForm from '../../components/BuildingForm';

const Map = dynamic(() => import('../../components/Map'), {
  ssr: false,
  loading: () => <div className="h-64 w-full flex items-center justify-center">Loading map...</div>
});

const BuildingNewPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const latParam = searchParams.get('lat');
  const lngParam = searchParams.get('lng');

  const [position, setPosition] = useState<[number, number] | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const [formData, setFormData] = useState({
    gps: '',
    language: 'English',
    numberOfDoors: 1,
    addressInfo: ['']
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

  const handleReturnToHome = () => {
    router.push('/');
  };

  const handleSave = () => {
    if (!position) return;

    // Simulate saving, e.g., calling an API if needed
    setShowSuccessMessage(true);

    // After 2 seconds, redirect to home
    setTimeout(() => {
      router.push('/');
    }, 2000);
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
        />

        <div className="flex justify-end mt-6">
          <button onClick={handleReturnToHome} className="px-4 py-2 mr-2 bg-gray-200 rounded-md">
            Cancel
          </button>
          <button onClick={handleSave} className="px-4 py-2 bg-green-100 text-green-800 rounded-md">
            Save
          </button>
        </div>
      </div>

      {showSuccessMessage && (
        <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-70 z-[9999]">
          <div className="bg-white p-4 rounded-md shadow-xl">
            <p className="text-green-600 font-bold">Building saved successfully!</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuildingNewPage;
