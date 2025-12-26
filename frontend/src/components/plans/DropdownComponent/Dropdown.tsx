import React, { useState, useRef, useEffect } from 'react';
import './Dropdown.css';
import dropdownIcon from '../../../assets/dropdown_icon.png';

interface DropdownProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const Dropdown: React.FC<DropdownProps> = ({
  label,
  value,
  options,
  onChange,
  disabled = false,
  placeholder = 'Select an option',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    onChange(option);
    setIsOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;

    switch (event.key) {
      case 'Escape':
        setIsOpen(false);
        break;
      case 'Enter':
      case ' ':
        setIsOpen(!isOpen);
        event.preventDefault();
        break;
    }
  };

  return (
    <div ref={dropdownRef} className="plans-dropdown-container">
      <button
        className="plans-dropdown-button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={label}
      >
        <span className={`plans-dropdown-value ${!value ? 'placeholder' : ''}`}>
          {value || placeholder}
        </span>
        <img
          src={dropdownIcon}
          alt=""
          className={`plans-dropdown-icon ${isOpen ? 'open' : ''}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <ul className="plans-dropdown-menu" role="listbox" aria-label={label}>
          {options.map((option, index) => (
            <li
              key={index}
              className={`plans-dropdown-item ${option === value ? 'selected' : ''}`}
              onClick={() => handleSelect(option)}
              role="option"
              aria-selected={option === value}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Dropdown;
