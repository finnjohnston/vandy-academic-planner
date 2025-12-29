import React, { useState, useRef, useEffect } from 'react';
import './ProgramDropdown.css';
import dropdownIcon from '../../../../assets/dropdown_icon.png';

const ProgramDropdown: React.FC = () => {
  const [selectedValue, setSelectedValue] = useState('All');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const options = ['All', 'Major', 'Minor'];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (option: string) => {
    setSelectedValue(option);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="program-dropdown-container">
      <button
        className="program-dropdown-button"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="program-dropdown-value">{selectedValue}</span>
        <img
          src={dropdownIcon}
          alt=""
          className={`program-dropdown-icon ${isOpen ? 'open' : ''}`}
        />
      </button>

      {isOpen && (
        <ul className="program-dropdown-menu">
          {options.map((option, index) => (
            <li
              key={index}
              className={`program-dropdown-item ${option === selectedValue ? 'selected' : ''}`}
              onClick={() => handleSelect(option)}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ProgramDropdown;
