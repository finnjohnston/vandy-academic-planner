import React from 'react';
import './Toggle.css';

interface ToggleProps {
  isOn: boolean;
  onToggle: () => void;
}

const Toggle: React.FC<ToggleProps> = ({ isOn, onToggle }) => {
  return (
    <button
      className={`toggle${isOn ? ' toggle-on' : ''}`}
      onClick={onToggle}
      type="button"
      aria-pressed={isOn}
    >
      <div className="toggle-circle" />
    </button>
  );
};

export default Toggle;
