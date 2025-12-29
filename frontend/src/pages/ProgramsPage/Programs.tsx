import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import NavBar from '../../components/common/NavBarComponent/NavBar';
import ProgramSearchBar from '../../components/program/programpage/ProgramSearchBarComponent/ProgramSearchBar';
import ProgramDropdown from '../../components/program/programpage/ProgramDropdownComponent/ProgramDropdown';
import Toggle from '../../components/common/ToggleComponent/Toggle';
import ReturnToPlanButton from '../../components/program/programpage/ReturnToPlanButtonComponent/ReturnToPlanButton';
import ProgramsTableHeader from '../../components/program/programpage/ProgramsTableHeaderComponent/ProgramsTableHeader';
import ProgramList from '../../components/program/ProgramListComponent/ProgramList';
import './Programs.css';

interface PlanData {
  id: number;
  name: string;
  academicYearId: number;
  schoolId: number | null;
  programs: Array<{
    id: number;
    program: {
      id: number;
      programId: string;
      name: string;
      type: string;
      totalCredits: number;
    };
  }>;
}

const Programs: React.FC = () => {
  const { planId } = useParams<{ planId?: string }>();
  const [showAllPrograms, setShowAllPrograms] = useState(false);
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [allAvailablePrograms, setAllAvailablePrograms] = useState<Array<{
    id: number;
    name: string;
    type: string;
    totalCredits: number;
  }>>([]);
  const [loading, setLoading] = useState(!!planId);
  const [error, setError] = useState<string | null>(null);
  const [checkedPrograms, setCheckedPrograms] = useState<Set<number>>(new Set());
  const [selectedType, setSelectedType] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (!planId) return;

    const fetchPlan = async () => {
      try {
        const response = await fetch(`http://localhost:3000/api/plans/${planId}`);
        if (!response.ok) throw new Error('Failed to fetch plan data');
        const result = await response.json();
        setPlanData(result.data);

        // Initialize checked programs from plan data
        const selectedProgramIds = new Set(
          result.data.programs.map((p: any) => p.program.id)
        );
        setCheckedPrograms(selectedProgramIds);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load plan');
      } finally {
        setLoading(false);
      }
    };

    fetchPlan();
  }, [planId]);

  // Fetch all available programs
  useEffect(() => {
    const fetchAllPrograms = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/programs');
        if (!response.ok) throw new Error('Failed to fetch all programs');
        const result = await response.json();

        // Filter to only Major and Minor types
        const majorMinorPrograms = result.data
          .filter((p: any) => {
            const type = p.type.toLowerCase();
            return type === 'major' || type === 'minor';
          })
          .map((p: any) => ({
            id: p.id,
            name: p.name,
            type: p.type,
            totalCredits: p.totalCredits
          }));

        setAllAvailablePrograms(majorMinorPrograms);
      } catch (err) {
        console.error('Error fetching all programs:', err);
      }
    };

    fetchAllPrograms();
  }, []);

  const handleCheckChange = async (programId: number, checked: boolean) => {
    if (!planData) return;

    // Optimistically update UI
    const newCheckedPrograms = new Set(checkedPrograms);
    if (checked) {
      newCheckedPrograms.add(programId);
    } else {
      newCheckedPrograms.delete(programId);
    }
    setCheckedPrograms(newCheckedPrograms);

    try {
      // Save to database
      const response = await fetch(
        `http://localhost:3000/api/plans/${planData.id}/programs`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ programIds: Array.from(newCheckedPrograms) })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update programs');
      }

      // Refetch plan data to ensure UI is in sync
      const planResponse = await fetch(`http://localhost:3000/api/plans/${planData.id}`);
      if (planResponse.ok) {
        const planResult = await planResponse.json();
        setPlanData(planResult.data);

        // Update checked programs from fresh data
        const updatedProgramIds = new Set(
          planResult.data.programs.map((p: any) => p.program.id)
        );
        setCheckedPrograms(updatedProgramIds);
      }
    } catch (err) {
      console.error('Error updating programs:', err);
      // Revert optimistic update on error
      setCheckedPrograms(checkedPrograms);
      alert('Failed to update programs. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="programs-page">
        <NavBar />
        <div className="programs-content">
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            Loading plan data...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="programs-page">
        <NavBar />
        <div className="programs-content">
          <div style={{ textAlign: 'center', padding: '2rem', color: 'red' }}>
            Error: {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="programs-page">
      <NavBar />
      <div className="programs-content">
        <div className="programs-header">
          <h1>Programs</h1>
          <ReturnToPlanButton planId={planId ? parseInt(planId) : undefined} />
        </div>
        <div className="programs-search-wrapper">
          <ProgramSearchBar value={searchQuery} onChange={setSearchQuery} />
          <ProgramDropdown value={selectedType} onChange={setSelectedType} />
          <div className="programs-toggle-section">
            <Toggle
              isOn={showAllPrograms}
              onToggle={() => setShowAllPrograms(!showAllPrograms)}
            />
            <span className="programs-toggle-text">All programs</span>
          </div>
        </div>
        <ProgramsTableHeader />
        {(() => {
          // Determine which programs to show based on toggle
          let sourcePrograms = showAllPrograms
            ? allAvailablePrograms
            : (planData ? planData.programs.map(p => ({
                id: p.program.id,
                name: p.program.name,
                type: p.program.type,
                totalCredits: p.program.totalCredits
              })) : []);

          // Filter to only Major and Minor types
          sourcePrograms = sourcePrograms.filter(p => {
            const type = p.type.toLowerCase();
            return type === 'major' || type === 'minor';
          });

          // Filter by type dropdown selection
          let filteredPrograms = selectedType === 'All'
            ? sourcePrograms
            : sourcePrograms.filter(p => p.type.toLowerCase() === selectedType.toLowerCase());

          // Filter by search query
          if (searchQuery.trim()) {
            filteredPrograms = filteredPrograms.filter(p =>
              p.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
          }

          // Sort: Alphabetically by name, then Major before Minor for same name
          filteredPrograms.sort((a, b) => {
            // First, sort alphabetically by name
            const nameComparison = a.name.localeCompare(b.name);

            // If names are different, use alphabetical order
            if (nameComparison !== 0) {
              return nameComparison;
            }

            // If names are the same, Major comes before Minor
            const typeA = a.type.toLowerCase();
            const typeB = b.type.toLowerCase();
            return typeA === 'major' ? -1 : 1;
          });

          // Only render if we have planData (needed for planId and academicYearId)
          if (!planData) return null;

          return (
            <ProgramList
              planId={planData.id}
              programs={filteredPrograms}
              academicYearId={planData.academicYearId}
              showCheckmarks={true}
              checkedProgramIds={checkedPrograms}
              onCheckChange={handleCheckChange}
            />
          );
        })()}
      </div>
    </div>
  );
};

export default Programs;
