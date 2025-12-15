import React from 'react';
import Semester from '../SemesterComponent/Semester';
import './Plan.css';

interface PlanProps {
  planId: number;
  planName: string;
  startingYear: number;
  isBlurred?: boolean;
}

const Plan: React.FC<PlanProps> = ({ planId, planName, startingYear, isBlurred = false }) => {
  const semesters = [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <div className={`plan-container${isBlurred ? ' plan-blurred' : ''}`}>
      <div className="plan-content">
        <h1 className="plan-header">{planName}</h1>
        <div className="plan-grid">
          {semesters.map((semesterNumber) => (
            <Semester
              key={semesterNumber}
              semesterNumber={semesterNumber}
              startingYear={startingYear}
              credits={0}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Plan;
