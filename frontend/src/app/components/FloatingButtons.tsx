import React from 'react';

interface FloatingButtonsProps {
  onAddClick?: () => void;
}

const FloatingButtons: React.FC<FloatingButtonsProps> = ({ onAddClick }) => {
  return (
    <div className="absolute bottom-16 right-6 flex flex-col space-y-4">
      <button 
        onClick={onAddClick}
        className="w-12 h-12 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-lg"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </button>
      <button 
        className="w-12 h-12 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-lg"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    </div>
  );
};

export default FloatingButtons;