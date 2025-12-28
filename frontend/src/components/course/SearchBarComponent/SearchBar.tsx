import React from 'react';
import './SearchBar.css';
import searchIcon from '../../../assets/search_icon.svg';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onSearch,
  placeholder = 'Search for courses'
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  return (
    <div className="search-bar-container">
      <img src={searchIcon} alt="Search" className="search-icon" />
      <input
        type="text"
        className="search-input"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
};

export default SearchBar;
