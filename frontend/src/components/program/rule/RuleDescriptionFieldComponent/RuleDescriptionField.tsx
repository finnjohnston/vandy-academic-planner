import React from 'react';
import './RuleDescriptionField.css';

interface RuleDescriptionFieldProps {
  description: string;
  nestingLevel?: number;
}

const RuleDescriptionField: React.FC<RuleDescriptionFieldProps> = ({ description, nestingLevel = 0 }) => {
  return (
    <div
      className="rule-description-field"
      style={{ width: `calc(100% - ${60 * (nestingLevel + 1)}px)` }}
    >
      <span className="rule-description-text">{description}</span>
    </div>
  );
};

export default RuleDescriptionField;
