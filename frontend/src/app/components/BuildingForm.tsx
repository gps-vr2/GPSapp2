'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const Map = dynamic(() => import('./Map'), { ssr: false });

interface BuildingFormProps {
  formData: {
    gps: string;
    language: string;
    numberOfDoors: number;
    addressInfo: string[];
  };
  position: [number, number];
  onFormChange: (field: string, value: string | number, index?: number) => void;
  onGpsChange: (gps: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

const BuildingForm: React.FC<BuildingFormProps> = ({
  formData,
  position,
  onFormChange,
  onGpsChange,
  onSave,
  onCancel,
}) => {
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
          />
          <div className="ml-2">
            <svg
              className="w-6 h-6 text-gray-500"
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
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="h-64 border rounded-md overflow-hidden shadow-sm">
        <Map
          center={position}
          zoom={13}
          showMarker={true}
          markerPosition={position}
          draggable={false}
          showDraggablePin={false}
        />
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
            onClick={() => onFormChange('numberOfDoors', Math.max(0, formData.numberOfDoors - 1))}
            className="mx-2 px-2 py-1 border rounded-md"
          >
            −
          </button>
          <button
            onClick={() => onFormChange('numberOfDoors', formData.numberOfDoors + 1)}
            className="px-2 py-1 border rounded-md"
          >
            +
          </button>
        </div>
      </div>

      {/* Address Info for Each Door */}
      <div>
        <label className="block text-sm font-medium mb-1">Address Info & Comments*</label>
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
          className="px-4 py-2 mr-2 bg-gray-200 rounded-md"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          className="px-4 py-2 bg-green-100 text-green-800 rounded-md"
        >
          Save
        </button>
      </div>
    </div>
  );
};

export default BuildingForm;