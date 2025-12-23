import React from 'react';
import Section from '../SectionComponent/Section';
import './SectionList.css';

interface SectionListProps {
  sections: Array<{
    sectionId: string;
    title: string;
    creditsRequired: number;
    creditsFulfilled: number;
    percentage: number;
  }>;
}

const SectionList: React.FC<SectionListProps> = ({ sections }) => {
  return (
    <div className="section-list">
      {sections.map((section) => (
        <Section
          key={section.sectionId}
          title={section.title}
          creditsText={`${section.creditsFulfilled} / ${section.creditsRequired} credits`}
          progressPercent={section.percentage}
        />
      ))}
    </div>
  );
};

export default SectionList;
