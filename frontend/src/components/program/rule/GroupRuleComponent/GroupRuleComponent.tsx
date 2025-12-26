import React from 'react';
import RuleRenderer from '../RuleRendererComponent/RuleRenderer';
import type { RequirementProgress, GroupProgressDetails } from '../../../../types/RequirementProgress';
import './GroupRuleComponent.css';

interface GroupRuleComponentProps {
  requirementProgress: RequirementProgress;
  academicYearId: number;
  nestingLevel?: number;
}

const isGroupRule = (details: any): details is GroupProgressDetails => {
  return details.type === 'group';
};

const GroupRuleComponent: React.FC<GroupRuleComponentProps> = ({
  requirementProgress,
  academicYearId,
  nestingLevel = 0
}) => {
  const isGroup = isGroupRule(requirementProgress.ruleProgress.details);

  if (!isGroup) {
    return null;
  }

  const details = requirementProgress.ruleProgress.details as GroupProgressDetails;
  const isOr = details.operator === 'OR';

  const getOptionLabel = (index: number): string => {
    if (isOr) {
      return `Option ${String.fromCharCode(65 + index)}`; // Option A, Option B, etc.
    } else {
      return `Part ${index + 1}`; // Part 1, Part 2, etc.
    }
  };

  return (
    <div className="group-rule-component">
      {requirementProgress.description && (
        <div
          className="group-rule-description"
          style={{ width: `calc(100% - ${60 * (nestingLevel + 1)}px)` }}
        >
          <span className="group-rule-description-text">{requirementProgress.description}</span>
        </div>
      )}
      {details.subRuleProgress.map((subRule, index) => {
        const isCompleted = subRule.status === 'completed';

        // Generate description for nested group rules
        let subRuleDescription = '';
        if (subRule.type === 'group') {
          const subGroupDetails = subRule.details as GroupProgressDetails;
          subRuleDescription = subGroupDetails.operator === 'OR'
            ? 'Complete one of the following'
            : 'Complete all of the following';
        }

        return (
          <div key={index}>
            <div
              className="group-rule-option group-rule-option-with-border"
              style={{ width: `calc(100% - ${60 * (nestingLevel + 1)}px)` }}
            >
              <span className={`group-rule-option-text${isCompleted ? ' group-rule-option-text-completed' : ''}`}>
                {getOptionLabel(index)}
              </span>
            </div>
            <RuleRenderer
              ruleProgress={subRule}
              description={subRuleDescription}
              fulfillingCourses={requirementProgress.fulfillingCourses}
              constraintValidation={undefined}
              academicYearId={academicYearId}
              nestingLevel={nestingLevel + 1}
            />
          </div>
        );
      })}
    </div>
  );
};

export default GroupRuleComponent;
