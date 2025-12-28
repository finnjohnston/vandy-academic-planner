import React from 'react';
import ProgramList from '../ProgramListComponent/ProgramList';
import EditProgramsButton from '../EditProgramsButtonComponent/EditProgramsButton';
import EditProgramsPopup from '../EditProgramsPopupComponent/EditProgramsPopup';
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
  isEditProgramsOpen: boolean;
  onEditProgramsOpen: () => void;
  onEditProgramsClose: () => void;
}

const Requirement: React.FC<RequirementProps> = ({
  isBlurred = false,
  planId,
  programs,
  plannedCourses,
  academicYearId,
  isEditProgramsOpen,
  onEditProgramsOpen,
  onEditProgramsClose,
}) => {
  const isEmpty = programs.length === 0;

  return (
    <>
      <div
        className={`requirement-container${isBlurred ? ' requirement-blurred' : ''}${
          isEmpty ? ' requirement-empty' : ''
        }`}
      >
        <div className="requirement-header-section">
          <h1 className="requirement-header">Requirements</h1>
          <EditProgramsButton onClick={onEditProgramsOpen} />
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
      {isEditProgramsOpen && (
        <EditProgramsPopup onClose={onEditProgramsClose} />
      )}
    </>
  );
};

export default Requirement;
