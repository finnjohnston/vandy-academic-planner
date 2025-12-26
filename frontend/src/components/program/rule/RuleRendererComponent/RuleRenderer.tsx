import React from 'react';
import TakeCoursesRuleComponent from '../TakeCoursesRuleComponent/TakeCoursesRuleComponent';
import TakeFromListRuleComponent from '../TakeFromListRuleComponent/TakeFromListRuleComponent';
import TakeAnyCoursesRuleComponent from '../TakeAnyCoursesRuleComponent/TakeAnyCoursesRuleComponent';
import GroupRuleComponent from '../GroupRuleComponent/GroupRuleComponent';
import type { RuleProgress, FulfillingCourse, ConstraintValidation } from '../../../../types/RequirementProgress';

interface RuleRendererProps {
  ruleProgress: RuleProgress;
  description: string;
  fulfillingCourses: FulfillingCourse[];
  constraintValidation?: ConstraintValidation;
  academicYearId: number;
  nestingLevel?: number;
}

const RuleRenderer: React.FC<RuleRendererProps> = ({
  ruleProgress,
  description,
  fulfillingCourses,
  constraintValidation,
  academicYearId,
  nestingLevel = 0
}) => {
  // Extract rule-level description from details (if it exists)
  const ruleDescription = (ruleProgress.details as any).description;

  // Use rule-level description if available, otherwise use passed description
  const effectiveDescription = ruleDescription || description;

  // Build a RequirementProgress-like object for the sub-rule
  const requirementProgress = {
    requirementId: '',
    sectionId: '',
    title: '',
    description: effectiveDescription,
    status: ruleProgress.status,
    creditsRequired: 0,
    creditsFulfilled: 0,
    percentage: ruleProgress.percentage,
    ruleProgress,
    fulfillingCourses,
    constraintValidation
  };

  const type = ruleProgress.type;

  if (type === 'group') {
    return (
      <GroupRuleComponent
        requirementProgress={requirementProgress}
        academicYearId={academicYearId}
        nestingLevel={nestingLevel}
      />
    );
  }

  if (type === 'take_courses') {
    return (
      <TakeCoursesRuleComponent
        requirementProgress={requirementProgress}
        academicYearId={academicYearId}
        nestingLevel={nestingLevel}
      />
    );
  }

  if (type === 'take_from_list') {
    return (
      <TakeFromListRuleComponent
        requirementProgress={requirementProgress}
        academicYearId={academicYearId}
        nestingLevel={nestingLevel}
      />
    );
  }

  if (type === 'take_any_courses') {
    return (
      <TakeAnyCoursesRuleComponent
        requirementProgress={requirementProgress}
        academicYearId={academicYearId}
        nestingLevel={nestingLevel}
      />
    );
  }

  return null;
};

export default RuleRenderer;
