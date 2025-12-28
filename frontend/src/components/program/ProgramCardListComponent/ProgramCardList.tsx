import React, { useEffect, useState } from 'react';
import ProgramCard from '../ProgramCardComponent/ProgramCard';
import './ProgramCardList.css';

interface Program {
  id: number;
  programId: string;
  name: string;
  type: 'major' | 'minor';
  schoolId: number;
  academicYearId: number;
  totalCredits: number;
}

interface ProgramCardListProps {
  academicYearId: number;
  schoolId: number | null;
  searchQuery: string;
  selectedProgramIds: number[];
  onProgramToggle: (programId: number) => void;
}

const API_BASE_URL = 'http://localhost:3000';

const ProgramCardList: React.FC<ProgramCardListProps> = ({
  academicYearId,
  schoolId,
  searchQuery,
  selectedProgramIds,
  onProgramToggle,
}) => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          academicYearId: academicYearId.toString(),
        });

        // School of Engineering students can see all programs (no filter)
        // Students from other schools (like Arts & Sciences) see only their school's programs
        // Assuming schoolId 2 is Arts & Sciences or another filtered school
        // and other schoolIds are Engineering
        if (schoolId !== null && schoolId === 2) {
          params.append('schoolId', schoolId.toString());
        }

        const response = await fetch(`${API_BASE_URL}/api/programs?${params}`);
        if (!response.ok) throw new Error('Failed to fetch programs');
        const result = await response.json();

        // Filter to only include major and minor programs
        const filteredPrograms = result.data.filter(
          (program: Program) => program.type === 'major' || program.type === 'minor'
        );
        setPrograms(filteredPrograms);
      } catch (error) {
        console.error('Error fetching programs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrograms();
  }, [academicYearId, schoolId]);

  // Filter programs based on search query
  const filteredPrograms = programs.filter((program) =>
    program.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="program-card-list-loading">Loading programs...</div>;
  }

  if (filteredPrograms.length === 0) {
    return (
      <div className="program-card-list-empty">
        No programs found
      </div>
    );
  }

  return (
    <div className="program-card-list">
      {filteredPrograms.map((program) => (
        <ProgramCard
          key={program.id}
          program={program}
          isSelected={selectedProgramIds.includes(program.id)}
          onToggle={() => onProgramToggle(program.id)}
        />
      ))}
    </div>
  );
};

export default ProgramCardList;
