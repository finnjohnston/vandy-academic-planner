import React from 'react';
import './ConstraintField.css';

interface ConstraintFieldProps {
  constraint: string;
}

const ConstraintField: React.FC<ConstraintFieldProps> = ({ constraint }) => {
  return (
    <div className="constraint-field">
      <span className="constraint-text">{constraint}</span>
    </div>
  );
};

export default ConstraintField;
