import React from 'react';
import ProgramList from '../ProgramListComponent/ProgramList';
import EditProgramsButton from '../EditProgramsButtonComponent/EditProgramsButton';
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
  academicYearId: number;
  schoolId: number | null;
  currentProgramIds: number[];
}

const Requirement: React.FC<RequirementProps> = ({
  isBlurred = false,
  planId,
  programs,
  plannedCourses,
  academicYearId,
}) => {
  const isEmpty = programs.length === 0;

  return (
    <div
      className={`requirement-container${isBlurred ? ' requirement-blurred' : ''}${
        isEmpty ? ' requirement-empty' : ''
      }`}
    >
      <div className="requirement-header-section">
        <h1 className="requirement-header">Requirements</h1>
        <EditProgramsButton planId={planId} />
      </div>
      <div className="requirement-content">
        <ProgramList
          planId={planId}
          programs={programs}
          plannedCourses={plannedCourses}
          academicYearId={academicYearId}
        />
      </div>
    </div>
  );
};

export default Requirement;
