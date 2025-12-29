import React from 'react';
import searchIcon from '../../../../assets/search_icon.svg';
import './ProgramSearchBar.css';

interface ProgramSearchBarProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}

const ProgramSearchBar: React.FC<ProgramSearchBarProps> = ({
  value = '',
  onChange,
  placeholder = 'Search for programs'
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  return (
    <div className="program-search-bar-container">
      <img src={searchIcon} alt="Search" className="program-search-icon" />
      <input
        type="text"
        className="program-search-input"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
      />
    </div>
  );
};

export default ProgramSearchBar;
