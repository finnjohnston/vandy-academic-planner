import React from 'react';
import RequirementItem from '../RequirementItemComponent/RequirementItem';
import './RequirementList.css';

interface RequirementListProps {
  requirements: Array<{
    requirementId: string;
    name: string;
    creditsRequired: number;
    creditsFulfilled: number;
  }>;
}

const RequirementList: React.FC<RequirementListProps> = ({ requirements }) => {
  return (
    <div className="requirement-list">
      {requirements.map((requirement, index) => (
        <RequirementItem
          key={requirement.requirementId}
          name={requirement.name}
          creditsText={`${requirement.creditsFulfilled} / ${requirement.creditsRequired} credits`}
          isLast={index === requirements.length - 1}
        />
      ))}
    </div>
  );
};

export default RequirementList;
