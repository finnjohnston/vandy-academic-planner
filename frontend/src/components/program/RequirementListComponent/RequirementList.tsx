import React from 'react';
import RequirementItem from '../RequirementItemComponent/RequirementItem';
import type { RequirementProgress } from '../../../types/RequirementProgress';
import './RequirementList.css';

interface RequirementListProps {
  requirements: RequirementProgress[];
  academicYearId: number;
}

const RequirementList: React.FC<RequirementListProps> = ({ requirements, academicYearId }) => {
  return (
    <div className="requirement-list">
      {requirements.map((requirement, index) => (
        <RequirementItem
          key={requirement.requirementId}
          requirementProgress={requirement}
          academicYearId={academicYearId}
          isLast={index === requirements.length - 1}
        />
      ))}
    </div>
  );
};

export default RequirementList;
