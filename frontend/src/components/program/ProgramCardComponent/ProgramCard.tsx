import React from 'react';
import './ProgramCard.css';
import checkmarkIcon from '../../../assets/checkmark_icon.png';

interface ProgramCardProps {
  program: {
    id: number;
    name: string;
    type: 'major' | 'minor';
  };
  isSelected: boolean;
  onToggle?: () => void;
}

const ProgramCard: React.FC<ProgramCardProps> = ({ program, isSelected, onToggle }) => {

  return (
    <div className="program-card" onClick={onToggle}>
      <div className={`program-checkbox ${isSelected ? 'checked' : ''}`}>
        {isSelected && (
          <img
            src={checkmarkIcon}
            alt="Checkmark"
            className="program-checkmark"
          />
        )}
      </div>
      <div className="program-card-info">
        <div className="program-card-subject">{program.name}</div>
        <div className="program-card-type">
          {program.type.charAt(0).toUpperCase() + program.type.slice(1)}
        </div>
      </div>
    </div>
  );
};

export default ProgramCard;
