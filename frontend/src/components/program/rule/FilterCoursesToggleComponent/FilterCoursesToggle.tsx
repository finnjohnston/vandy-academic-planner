import React from 'react';
import './FilterCoursesToggle.css';

interface FilterCoursesToggleProps {
  isOn: boolean;
  onToggle: () => void;
}

const FilterCoursesToggle: React.FC<FilterCoursesToggleProps> = ({ isOn, onToggle }) => {
  return (
    <button
      className={`filter-courses-toggle${isOn ? ' filter-courses-toggle-on' : ''}`}
      onClick={onToggle}
      type="button"
      aria-pressed={isOn}
    >
      <div className="filter-courses-toggle-circle" />
    </button>
  );
};

export default FilterCoursesToggle;
