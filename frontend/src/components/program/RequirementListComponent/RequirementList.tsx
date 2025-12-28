import React, { useState } from 'react';
import RequirementItem from '../RequirementItemComponent/RequirementItem';
import type { RequirementProgress } from '../../../types/RequirementProgress';
import './RequirementList.css';

interface RequirementListProps {
  requirements: RequirementProgress[];
  academicYearId: number;
}

const RequirementList: React.FC<RequirementListProps> = ({ requirements, academicYearId }) => {
  const [expandedRequirements, setExpandedRequirements] = useState<Set<string>>(new Set());

  const handleToggleRequirement = (requirementId: string, isExpanded: boolean) => {
    setExpandedRequirements((prev) => {
      const next = new Set(prev);
      if (isExpanded) {
        next.add(requirementId);
      } else {
        next.delete(requirementId);
      }
      return next;
    });
  };

  return (
    <div className="requirement-list">
      {requirements.map((requirement, index) => {
        const isExpanded = expandedRequirements.has(requirement.requirementId);
        const isPreviousExpanded =
          index > 0 && expandedRequirements.has(requirements[index - 1].requirementId);

        return (
          <RequirementItem
            key={requirement.requirementId}
            requirementProgress={requirement}
            academicYearId={academicYearId}
            isLast={index === requirements.length - 1}
            isExpanded={isExpanded}
            hasBorderTop={isPreviousExpanded}
            onToggle={(nextExpanded) =>
              handleToggleRequirement(requirement.requirementId, nextExpanded)
            }
          />
        );
      })}
    </div>
  );
};

export default RequirementList;
