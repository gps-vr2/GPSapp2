'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

const DeletedBuildingsPage: React.FC = () => {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-purple-700 text-white p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-purple-600 rounded"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-xl font-semibold">Deleted Buildings</h1>
          <div className="w-10"></div> {/* Spacer for alignment */}
        </div>
      </div>

      <div className="p-4">
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-4">
            Deleted buildings are permanently removed and not stored.
          </div>
          <p className="text-gray-400 text-sm">
            When you delete a building, it is immediately and permanently removed from the system.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DeletedBuildingsPage;