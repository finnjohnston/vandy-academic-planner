import React, { useState } from 'react';
import Section from '../SectionComponent/Section';
import type { RequirementProgress } from '../../../types/RequirementProgress';
import './SectionList.css';

interface SectionListProps {
  sections: Array<{
    sectionId: string;
    title: string;
    creditsRequired: number;
    creditsFulfilled: number;
    percentage: number;
    requirementProgress?: RequirementProgress[];
  }>;
  academicYearId: number;
}

const SectionList: React.FC<SectionListProps> = ({ sections, academicYearId }) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const handleToggleSection = (sectionId: string, isExpanded: boolean) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (isExpanded) {
        newSet.add(sectionId);
      } else {
        newSet.delete(sectionId);
      }
      return newSet;
    });
  };

  return (
    <div className="section-list">
      {sections.map((section, index) => {
        const requirements = section.requirementProgress;

        const isPreviousExpanded = index > 0 && expandedSections.has(sections[index - 1].sectionId);

        return (
          <Section
            key={section.sectionId}
            title={section.title}
            creditsText={`${section.creditsFulfilled} / ${section.creditsRequired} credits`}
            progressPercent={section.percentage}
            isLast={index === sections.length - 1}
            hasBorderTop={isPreviousExpanded}
            requirements={requirements}
            academicYearId={academicYearId}
            onToggle={(isExpanded) => handleToggleSection(section.sectionId, isExpanded)}
          />
        );
      })}
    </div>
  );
};

export default SectionList;
