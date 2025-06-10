'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import BuildingForm from '../../components/BuildingForm';

const BuildingEditContent: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const buildingId = searchParams.get('id');

  const [position, setPosition] = useState<[number, number] | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    gps: '',
    language: 'English',
    numberOfDoors: 1,
    addressInfo: [''],
    buildingAddress: ''
  });

  const [originalData, setOriginalData] = useState<any>(null);

  useEffect(() => {
    if (buildingId) {
      loadBuildingData();
    }
  }, [buildingId]);

  const loadBuildingData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`https://gp-sapp2-8ycr.vercel.app/api/door/${buildingId}`);
      if (!response.ok) {
        throw new Error('Failed to load building data');
      }

      const data = await response.json();
      setOriginalData(data);
      setFormData({
        gps: `${data.lat}, ${data.long}`,
        language: data.language || 'English',
        numberOfDoors: data.numberOfDoors || 1,
        addressInfo: data.info ? data.info.split(', ') : [''],
        buildingAddress: data.address || ''
      });
      setPosition([data.lat, data.long]);
    } catch (error) {
      console.error('Error loading building data:', error);
      setShowErrorMessage(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const handleSave = async () => {
    if (!position || !buildingId) return;

    setIsLoading(true);
    setShowErrorMessage(false);

    try {
      const apiData = {
        lat: position[0],
        long: position[1],
        info: formData.addressInfo.join(', '),
        numberOfDoors: formData.numberOfDoors,
        language: formData.language,
        address: formData.buildingAddress 
      };

      const response = await fetch(`https://gp-sapp2-8ycr.vercel.app/api/door/${buildingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
      });

      if (!response.ok) {
        throw new Error('Failed to update building');
      }

      const result = await response.json();
      console.log('Building updated:', result);
      setShowSuccessMessage(true);

      setTimeout(() => {
        router.back();
      }, 2000);

    } catch (error) {
      console.error('Error updating building:', error);
      setShowErrorMessage(true);
      setTimeout(() => {
        setShowErrorMessage(false);
      }, 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!buildingId || !originalData) return;

    setIsDeleting(true);

    try {
      const deletedData = {
        ...(originalData ?? {}),
        deleted_at: new Date().toISOString(),
        deleted_by: 'user',
        original_id: buildingId
      };

      const saveDeletedResponse = await fetch(`https://gp-sapp2-8ycr.vercel.app/api/deleted-buildings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deletedData),
      });

      if (!saveDeletedResponse.ok) {
        throw new Error('Failed to save deleted building data');
      }

      const deleteResponse = await fetch(`https://gp-sapp2-8ycr.vercel.app/api/door/${buildingId}`, {
        method: 'DELETE',
      });

      if (!deleteResponse.ok) {
        throw new Error('Failed to delete building');
      }

      setShowSuccessMessage(true);
      setTimeout(() => {
        router.push('/');
      }, 2000);

    } catch (error) {
      console.error('Error deleting building:', error);
      setShowErrorMessage(true);
      setTimeout(() => {
        setShowErrorMessage(false);
      }, 3000);
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

  if (!buildingId) {
    return <div className="h-screen w-full flex items-center justify-center">Invalid building ID</div>;
  }

  if (isLoading && !originalData) {
    return <div className="h-screen w-full flex items-center justify-center">Loading building data...</div>;
  }

  if (!position) {
    return <div className="h-screen w-full flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen w-full bg-white">
      <div className="flex items-center justify-between p-2 bg-purple-700 shadow-sm">
        <button onClick={handleCancel} className="p-2">
          <svg className="w-6 h-6" fill="none" stroke="white" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h1 className="text-white text-lg font-semibold">Edit Building</h1>
        <button 
          onClick={() => setShowDeleteConfirm(true)}
          className="p-2 bg-red-600 rounded hover:bg-red-700"
          disabled={isDeleting}
        >
          <svg className="w-6 h-6" fill="none" stroke="white" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
          onMapMoveEnd={handleMapMoveEnd}
          isEditMode={true}
        />
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-[9999]">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm mx-4">
            <h3 className="text-lg font-semibold mb-4">Delete Building</h3>
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
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccessMessage && (
        <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-70 z-[9999]">
          <div className="bg-white p-4 rounded-md shadow-xl border border-green-200">
            <p className="text-green-600 font-bold">
              {isDeleting ? 'Building deleted successfully!' : 'Building updated successfully!'}
            </p>
          </div>
        </div>
      )}

      {showErrorMessage && (
        <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-70 z-[9999]">
          <div className="bg-white p-4 rounded-md shadow-xl border border-red-200">
            <p className="text-red-600 font-bold">Error occurred. Please try again.</p>
          </div>
        </div>
      )}
    </div>
  );
};

const LoadingSpinner: React.FC = () => (
  <div className="h-screen w-full flex items-center justify-center">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-700"></div>
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
