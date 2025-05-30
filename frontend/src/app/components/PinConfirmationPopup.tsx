import React from 'react';

interface PinConfirmationPopupProps {
  coordinates: [number, number];
  onClose: () => void;
}

const PinConfirmationPopup: React.FC<PinConfirmationPopupProps> = ({ 
  coordinates, 
  onClose 
}) => {
  return (
    <div className="absolute top-24 left-1/2 transform -translate-x-1/2 bg-white p-3 rounded shadow-md z-10 flex items-center">
      <div className="mr-6">
        {coordinates[0].toFixed(14)}, {coordinates[1].toFixed(14)}
      </div>
      <button onClick={onClose} className="text-gray-400">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

export default PinConfirmationPopup;