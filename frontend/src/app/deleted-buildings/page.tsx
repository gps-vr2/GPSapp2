'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
interface DeletedBuilding {
  id: string;
  original_id: string;
  lat: number;
  long: number;
  address: string;
  info: string;
  numberOfDoors: number;
  language: string;
  deleted_at: string;
  deleted_by: string;
}

const DeletedBuildingsPage: React.FC = () => {
  const [deletedBuildings, setDeletedBuildings] = useState<DeletedBuilding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState<string | null>(null);
  const [showPermanentDeleteConfirm, setShowPermanentDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadDeletedBuildings();
  }, []);

  const loadDeletedBuildings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('https://gp-sapp2-8ycr.vercel.app/api/deleted-buildings');
      
      if (!response.ok) {
        throw new Error('Failed to load deleted buildings');
      }

      const data = await response.json();
      setDeletedBuildings(data);
    } catch (error) {
      console.error('Error loading deleted buildings:', error);
      setError('Failed to load deleted buildings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (buildingId: string) => {
    try {
      const building = deletedBuildings.find(b => b.id === buildingId);
      if (!building) return;

      // Restore to main buildings table
      const restoreData = {
        lat: building.lat,
        long: building.long,
        info: building.info,
        numberOfDoors: building.numberOfDoors,
        language: building.language,
        address: building.address
      };

      const restoreResponse = await fetch('https://gp-sapp2-8ycr.vercel.app/api/door', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(restoreData),
      });

      if (!restoreResponse.ok) {
        throw new Error('Failed to restore building');
      }

      // Remove from deleted buildings table
      const deleteResponse = await fetch(`https://gp-sapp2-8ycr.vercel.app/api/deleted-buildings/${buildingId}`, {
        method: 'DELETE',
      });

      if (!deleteResponse.ok) {
        throw new Error('Failed to remove from deleted buildings');
      }

      // Refresh the list
      loadDeletedBuildings();
      setShowRestoreConfirm(null);

    } catch (error) {
      console.error('Error restoring building:', error);
      setError('Failed to restore building');
    }
  };

  const handlePermanentDelete = async (buildingId: string) => {
    try {
      const response = await fetch(`https://gp-sapp2-8ycr.vercel.app/api/deleted-buildings/${buildingId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to permanently delete building');
      }

      // Refresh the list
      loadDeletedBuildings();
      setShowPermanentDeleteConfirm(null);

    } catch (error) {
      console.error('Error permanently deleting building:', error);
      setError('Failed to permanently delete building');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-purple-700 text-white p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Deleted Buildings</h1>
          <button
            onClick={loadDeletedBuildings}
            className="p-2 hover:bg-purple-600 rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      <div className="p-4">
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        )}

        {deletedBuildings.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg">No deleted buildings found</div>
          </div>
        ) : (
          <div className="space-y-4">
            {deletedBuildings.map((building) => (
              <Card key={building.id} className="border-l-4 border-l-red-500">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-lg">Building #{building.original_id}</span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setShowRestoreConfirm(building.id)}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                      >
                        Restore
                      </button>
                      <button
                        onClick={() => setShowPermanentDeleteConfirm(building.id)}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                      >
                        Delete Forever
                      </button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Address:</strong> {building.address || 'N/A'}
                    </div>
                    <div>
                      <strong>GPS:</strong> {building.lat.toFixed(6)}, {building.long.toFixed(6)}
                    </div>
                    <div>
                      <strong>Door Info:</strong> {building.info || 'N/A'}
                    </div>
                    <div>
                      <strong>Number of Doors:</strong> {building.numberOfDoors}
                    </div>
                    <div>
                      <strong>Language:</strong> {building.language}
                    </div>
                    <div>
                      <strong>Deleted At:</strong> {formatDate(building.deleted_at)}
                    </div>
                    <div>
                      <strong>Deleted By:</strong> {building.deleted_by}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Restore Confirmation Modal */}
      {showRestoreConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm mx-4">
            <h3 className="text-lg font-semibold mb-4">Restore Building</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to restore this building? It will be added back to the main buildings list.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowRestoreConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRestore(showRestoreConfirm)}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Restore
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Confirmation Modal */}
      {showPermanentDeleteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm mx-4">
            <h3 className="text-lg font-semibold mb-4">Permanently Delete Building</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to permanently delete this building? This action cannot be undone.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowPermanentDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handlePermanentDelete(showPermanentDeleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeletedBuildingsPage;