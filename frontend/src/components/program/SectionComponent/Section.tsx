import React, { useState } from 'react';
import RequirementList from '../RequirementListComponent/RequirementList';
import './Section.css';

interface SectionProps {
  title: string;
  creditsText: string;
  progressPercent: number;
  isLast?: boolean;
  hasBorderTop?: boolean;
  requirements?: Array<{
    requirementId: string;
    name: string;
    creditsRequired: number;
    creditsFulfilled: number;
    description?: string;
  }>;
  onToggle?: (isExpanded: boolean) => void;
}

const Section: React.FC<SectionProps> = ({
  title,
  creditsText,
  isLast = false,
  hasBorderTop = false,
  requirements,
  onToggle
}) => {
  const [expanded, setExpanded] = useState(false);

  const handleToggle = () => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    onToggle?.(newExpanded);
  };

  return (
    <>
      <div
        className={`section-container${isLast ? ' section-last' : ''}${expanded ? ' section-expanded' : ''}${hasBorderTop ? ' section-border-top' : ''}`}
        onClick={handleToggle}
      >
        <div className="section-info">
          <span className="section-name">{title}</span>
          <div className="section-progress-group">
            <span className="section-progress-spacer" aria-hidden />
            <span className="section-credits">{creditsText}</span>
          </div>
        </div>
        <svg className={`section-dropdown-icon ${expanded ? 'expanded' : ''}`} width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      {expanded && requirements && requirements.length > 0 && (
        <RequirementList requirements={requirements} />
      )}
    </>
  );
};

export default Section;
