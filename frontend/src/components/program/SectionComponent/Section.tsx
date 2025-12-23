import React from 'react';
import './Section.css';

interface SectionProps {
  title: string;
  creditsText: string;
  progressPercent: number;
}

const Section: React.FC<SectionProps> = ({ title, creditsText }) => {
  return (
    <div className="section-container">
      <div className="section-info">
        <span className="section-name">{title}</span>
        <div className="section-progress-group">
          <span className="section-progress-spacer" aria-hidden />
          <span className="section-credits">{creditsText}</span>
        </div>
      </div>
      <svg className="section-dropdown-icon" width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
};

export default Section;
