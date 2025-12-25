import React from 'react';
import type { ConstraintValidation } from '../../../../types/RequirementProgress';
import './ConstraintField.css';

interface ConstraintFieldProps {
  constraintValidation?: ConstraintValidation;
}

const ConstraintField: React.FC<ConstraintFieldProps> = ({ constraintValidation }) => {
  if (!constraintValidation || !constraintValidation.results || constraintValidation.results.length === 0) {
    return null;
  }

  return (
    <div className="constraint-field">
      <div className="constraint-text-container">
        {constraintValidation.results.map((result, index) => (
          <span
            key={index}
            className={`constraint-text${result.satisfied ? '' : ' constraint-text-unsatisfied'}`}
          >
            {result.constraint.description}
          </span>
        ))}
      </div>
    </div>
  );
};

export default ConstraintField;
