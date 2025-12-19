import React from 'react';
import './DropIndicator.css';

interface DropIndicatorProps {
  position: 'above' | 'below';
}

const DropIndicator: React.FC<DropIndicatorProps> = ({ position }) => {
  return (
    <div className={`drop-indicator drop-indicator-${position}`}>
      <div className="drop-indicator-line" />
    </div>
  );
};

export default DropIndicator;
