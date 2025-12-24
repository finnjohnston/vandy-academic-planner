import React from 'react';
import './RuleDescriptionField.css';

interface RuleDescriptionFieldProps {
  description: string;
}

const RuleDescriptionField: React.FC<RuleDescriptionFieldProps> = ({ description }) => {
  return (
    <div className="rule-description-field">
      <span className="rule-description-text">{description}</span>
    </div>
  );
};

export default RuleDescriptionField;
