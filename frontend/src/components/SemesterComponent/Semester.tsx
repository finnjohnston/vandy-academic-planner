import React from 'react';
import './Semester.css';

interface SemesterProps {
  semesterNumber: number;
  startingYear: number;
  credits?: number;
}

interface SemesterInfo {
  year: number;
  season: 'Fall' | 'Spring';
}

const Semester: React.FC<SemesterProps> = ({
  semesterNumber,
  startingYear,
  credits = 0,
}) => {
  const getSemesterInfo = (
    semesterNumber: number,
    startingYear: number
  ): SemesterInfo => {
    const isOdd = semesterNumber % 2 === 1;
    const season = isOdd ? 'Fall' : 'Spring';

    const yearOffset = Math.floor(semesterNumber / 2);
    const year = startingYear + yearOffset;

    return { year, season };
  };

  const { year, season } = getSemesterInfo(semesterNumber, startingYear);

  return (
    <div className="semester-card">
      <div className="semester-header">
        <span className="semester-name">
          {year} {season}
        </span>
        <span className="semester-credits">{credits} credits</span>
      </div>
      <div className="semester-body">{/* Future: Course list */}</div>
    </div>
  );
};

export default Semester;
