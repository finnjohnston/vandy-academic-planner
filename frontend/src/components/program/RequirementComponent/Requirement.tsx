import React from 'react';
import ProgramList from '../ProgramListComponent/ProgramList';
import './Requirement.css';

interface RequirementProps {
  isBlurred?: boolean;
  planId: number;
  programs: Array<{
    id: number;
    name: string;
    type: string;
    totalCredits: number;
  }>;
  plannedCourses?: Array<{
    id: number;
    courseId: string | null;
    semesterNumber: number;
  }>;
}

const Requirement: React.FC<RequirementProps> = ({
  isBlurred = false,
  planId,
  programs,
  plannedCourses,
}) => {
  const isEmpty = programs.length === 0;
  return (
    <div
      className={`requirement-container${isBlurred ? ' requirement-blurred' : ''}${
        isEmpty ? ' requirement-empty' : ''
      }`}
    >
      <h1 className="requirement-header">Requirements</h1>
      <div className="requirement-content">
        <ProgramList planId={planId} programs={programs} plannedCourses={plannedCourses} />
      </div>
    </div>
  );
};

export default Requirement;
