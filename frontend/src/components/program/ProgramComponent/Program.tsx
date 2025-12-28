import React, { useState } from 'react';
import ProgramProgressBar from '../ProgramProgressBarComponent/ProgramProgressBar';
import SectionList from '../SectionListComponent/SectionList';
import type { RequirementProgress } from '../../../types/RequirementProgress';
import './Program.css';

interface ProgramProps {
  name: string;
  type: string;
  creditsText: string;
  progressPercent: number;
  academicYearId: number;
  sections?: Array<{
    sectionId: string;
    title: string;
    creditsRequired: number;
    creditsFulfilled: number;
    percentage: number;
    requirementProgress?: RequirementProgress[];
  }>;
}

const Program: React.FC<ProgramProps> = ({
  name,
  type,
  creditsText,
  progressPercent,
  academicYearId,
  sections,
}) => {
  const [expanded, setExpanded] = useState(false);

  const handleToggle = () => {
    setExpanded(!expanded);
  };
  const normalizedType = type.trim().toLowerCase();
  const displayType = normalizedType
    ? normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1)
    : '';

  return (
    <>
      <div
        className={`program-container${expanded ? ' program-expanded' : ''}`}
        onClick={handleToggle}
      >
        <div className="program-info">
          <span className="program-name">{name}</span>
          {displayType && <span className="program-type">{displayType}</span>}
          <div className="program-progress-group">
            <ProgramProgressBar percent={progressPercent} />
            <span className="program-credits">{creditsText}</span>
          </div>
        </div>
        <svg className={`program-dropdown-icon ${expanded ? 'expanded' : ''}`} width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      {expanded && sections && sections.length > 0 && (
        <SectionList sections={sections} academicYearId={academicYearId} />
      )}
    </>
  );
};

export default Program;
