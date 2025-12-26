import React, { useState, useRef, useEffect } from 'react';
import './MultiSelectDropdown.css';
import dropdownIcon from '../../../assets/dropdown_icon.png';

interface MultiSelectDropdownProps {
  label: string;
  selectedValues: string[];
  options: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  label,
  selectedValues,
  options,
  onChange,
  disabled = false,
  placeholder = 'Select options',
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

  const handleToggleOption = (option: string) => {
    if (selectedValues.includes(option)) {
      onChange(selectedValues.filter(v => v !== option));
    } else {
      onChange([...selectedValues, option]);
    }
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

  const displayValue = selectedValues.length === 0
    ? placeholder
    : selectedValues.join(', ');

  return (
    <div ref={dropdownRef} className="plans-multiselect-dropdown-container">
      <button
        className="plans-multiselect-dropdown-button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={label}
      >
        <span className={`plans-multiselect-dropdown-value ${selectedValues.length === 0 ? 'placeholder' : ''}`}>
          {displayValue}
        </span>
        <img
          src={dropdownIcon}
          alt=""
          className={`plans-multiselect-dropdown-icon ${isOpen ? 'open' : ''}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <ul className="plans-multiselect-dropdown-menu" role="listbox" aria-label={label}>
          {options.map((option, index) => {
            const isSelected = selectedValues.includes(option);
            return (
              <li
                key={index}
                className="plans-multiselect-dropdown-item"
                onClick={() => handleToggleOption(option)}
                role="option"
                aria-selected={isSelected}
              >
                <span className="plans-multiselect-dropdown-item-label">{option}</span>
                <input
                  type="checkbox"
                  className="plans-multiselect-dropdown-checkbox"
                  checked={isSelected}
                  readOnly
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default MultiSelectDropdown;
