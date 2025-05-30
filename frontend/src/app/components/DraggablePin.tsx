import React from 'react';

interface DraggablePinProps {
  position: [number, number];
  onDrag?: (position: [number, number]) => void;
}

const DraggablePin: React.FC<DraggablePinProps> = ({ position, onDrag }) => {
  const [isDragging, setIsDragging] = React.useState(false);
  const [pinPosition, setPinPosition] = React.useState<[number, number]>(position);
  
  // This component is primarily used by the Map component which already handles
  // the dragging functionality through Leaflet. This component provides a visual
  // representation for direct DOM manipulation cases.
  
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    e.preventDefault();
  };
  
  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      // In a real implementation, this would translate mouse coordinates to lat/lng
      // For now, we're just simulating the movement
      const newPosition: [number, number] = [
        position[0] + (e.movementY * 0.00001), 
        position[1] + (e.movementX * 0.00001)
      ];
      
      setPinPosition(newPosition);
      if (onDrag) {
        onDrag(newPosition);
      }
    }
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  return (
    <div 
      className={`absolute transform -translate-x-1/2 -translate-y-full cursor-grab ${isDragging ? 'cursor-grabbing' : ''}`}
      onMouseDown={handleMouseDown}
    >
      <div className="relative">
        <div className="w-8 h-8 bg-white rounded-full border-2 border-red-500 flex items-center justify-center">
          <svg 
            className="w-5 h-5 text-red-500" 
            fill="currentColor" 
            viewBox="0 0 20 20" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              fillRule="evenodd" 
              d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" 
              clipRule="evenodd" 
            />
          </svg>
        </div>
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-3 h-3 bg-white border-r-2 border-b-2 border-red-500"></div>
      </div>
    </div>
  );
};

export default DraggablePin;