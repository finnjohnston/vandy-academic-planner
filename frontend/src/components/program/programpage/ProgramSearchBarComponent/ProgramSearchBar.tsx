import React from 'react';
import searchIcon from '../../../../assets/search_icon.svg';
import './ProgramSearchBar.css';

const ProgramSearchBar: React.FC = () => {
  return (
    <div className="program-search-bar-container">
      <img src={searchIcon} alt="Search" className="program-search-icon" />
      <input
        type="text"
        className="program-search-input"
        placeholder="Search for programs"
        readOnly
      />
    </div>
  );
};

export default ProgramSearchBar;
