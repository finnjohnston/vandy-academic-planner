import React, { useEffect, useState } from 'react';
import Program from '../ProgramComponent/Program';
import './ProgramList.css';

const API_BASE_URL = 'http://localhost:3000';

interface ProgramListProps {
  planId: number;
  programs: Array<{
    id: number;
    name: string;
    type: string;
    totalCredits: number;
  }>;
  plannedCourses?: Array<{
    id: number;
    courseId: string | null;
    semesterNumber: number;
  }>;
}

const ProgramList: React.FC<ProgramListProps> = ({ planId, programs, plannedCourses }) => {
  const [progressByProgramId, setProgressByProgramId] = useState<
    Record<number, {
      fulfilled: number;
      required: number;
      sections: Array<{
        sectionId: string;
        title: string;
        creditsRequired: number;
        creditsFulfilled: number;
        percentage: number;
      }>;
    }>
  >({});

  useEffect(() => {
    let isMounted = true;

    if (programs.length === 0) {
      setProgressByProgramId({});
      return;
    }

    const fetchProgress = async () => {
      const results = await Promise.all(
        programs.map(async (program) => {
          try {
            const response = await fetch(
              `${API_BASE_URL}/api/plans/${planId}/programs/${program.id}/progress`
            );
            if (!response.ok) throw new Error('Failed to fetch program progress');
            const data = await response.json();
            return {
              id: program.id,
              fulfilled: data.data.totalCreditsFulfilled,
              required: data.data.totalCreditsRequired,
              sections: data.data.sectionProgress || [],
            };
          } catch (error) {
            console.error('Error fetching program progress:', error);
            return {
              id: program.id,
              fulfilled: 0,
              required: program.totalCredits,
              sections: [],
            };
          }
        })
      );

      if (!isMounted) return;
      const nextProgress: Record<number, {
        fulfilled: number;
        required: number;
        sections: Array<{
          sectionId: string;
          title: string;
          creditsRequired: number;
          creditsFulfilled: number;
          percentage: number;
        }>;
      }> = {};
      results.forEach((result) => {
        nextProgress[result.id] = {
          fulfilled: result.fulfilled,
          required: result.required,
          sections: result.sections,
        };
      });
      setProgressByProgramId(nextProgress);
    };

    fetchProgress();

    return () => {
      isMounted = false;
    };
  }, [planId, programs, plannedCourses]);

  return (
    <div className="program-list">
      {programs.map((program) => {
        const fulfilled = progressByProgramId[program.id]?.fulfilled ?? 0;
        const required = progressByProgramId[program.id]?.required ?? program.totalCredits;
        const sections = progressByProgramId[program.id]?.sections ?? [];
        const progressPercent = required > 0 ? (fulfilled / required) * 100 : 0;

        return (
          <Program
            key={program.id}
            name={program.name}
            type={program.type}
            progressPercent={progressPercent}
            creditsText={`${fulfilled} / ${required} credits`}
            sections={sections}
          />
        );
      })}
    </div>
  );
};

export default ProgramList;
