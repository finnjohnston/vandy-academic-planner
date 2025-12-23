import React from 'react';
import './ProgramProgressBar.css';

interface ProgramProgressBarProps {
  percent: number;
}

const ProgramProgressBar: React.FC<ProgramProgressBarProps> = ({ percent }) => {
  const clampedPercent = Math.max(0, Math.min(100, percent));

  return (
    <span className="program-progress">
      <span className="program-progress-fill" style={{ width: `${clampedPercent}%` }} />
    </span>
  );
};

export default ProgramProgressBar;
