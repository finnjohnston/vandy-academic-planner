import React, { useEffect, useState } from 'react';
import './NewPlanPopup.css';
import exitIcon from '../../../assets/exit_icon.png';
import Dropdown from '../DropdownComponent/Dropdown';
import MultiSelectDropdown from '../MultiSelectDropdownComponent/MultiSelectDropdown';

interface NewPlanPopupProps {
  onClose: () => void;
}

interface AcademicYear {
  id: number;
  year: string;
  start: string;
  end: string;
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
}

interface School {
  id: number;
  code: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface Program {
  id: number;
  name: string;
  type: string;
  totalCredits: number;
}

const API_BASE_URL = 'http://localhost:3000';

const NewPlanPopup: React.FC<NewPlanPopupProps> = ({ onClose }) => {
  const [planName, setPlanName] = useState('');
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<number | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [allPrograms, setAllPrograms] = useState<Program[]>([]);
  const [selectedSecondaryProgramId, setSelectedSecondaryProgramId] = useState<number | null>(null);
  const [allMinors, setAllMinors] = useState<Program[]>([]);
  const [selectedMinorIds, setSelectedMinorIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [loadingAllPrograms, setLoadingAllPrograms] = useState(false);
  const [loadingMinors, setLoadingMinors] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Fetch academic years and schools on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch academic years
        const yearsResponse = await fetch(`${API_BASE_URL}/api/academic-years`);
        if (!yearsResponse.ok) throw new Error('Failed to fetch academic years');
        const yearsResult = await yearsResponse.json();
        const years = yearsResult.data as AcademicYear[];
        setAcademicYears(years);

        // Fetch schools
        const schoolsResponse = await fetch(`${API_BASE_URL}/api/schools`);
        if (!schoolsResponse.ok) throw new Error('Failed to fetch schools');
        const schoolsResult = await schoolsResponse.json();
        const schoolsData = schoolsResult.data as School[];
        setSchools(schoolsData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch programs when school or academic year changes
  useEffect(() => {
    const fetchPrograms = async () => {
      if (!selectedSchoolId || !selectedAcademicYearId) {
        setPrograms([]);
        setSelectedProgramId(null);
        return;
      }

      setLoadingPrograms(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/programs?schoolId=${selectedSchoolId}&academicYearId=${selectedAcademicYearId}&type=major`
        );
        if (!response.ok) throw new Error('Failed to fetch programs');
        const result = await response.json();
        const programsData = result.data as Program[];
        setPrograms(programsData);
      } catch (error) {
        console.error('Error fetching programs:', error);
        setPrograms([]);
        setSelectedProgramId(null);
      } finally {
        setLoadingPrograms(false);
      }
    };

    fetchPrograms();
  }, [selectedSchoolId, selectedAcademicYearId]);

  // Fetch all programs for secondary major dropdown
  useEffect(() => {
    const fetchAllPrograms = async () => {
      if (!selectedAcademicYearId) {
        setAllPrograms([]);
        setSelectedSecondaryProgramId(null);
        return;
      }

      setLoadingAllPrograms(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/programs?academicYearId=${selectedAcademicYearId}&type=major`
        );
        if (!response.ok) throw new Error('Failed to fetch all programs');
        const result = await response.json();
        const programsData = result.data as Program[];
        setAllPrograms(programsData);
      } catch (error) {
        console.error('Error fetching all programs:', error);
        setAllPrograms([]);
      } finally {
        setLoadingAllPrograms(false);
      }
    };

    fetchAllPrograms();
  }, [selectedAcademicYearId]);

  // Fetch all minors
  useEffect(() => {
    const fetchMinors = async () => {
      if (!selectedAcademicYearId) {
        setAllMinors([]);
        setSelectedMinorIds([]);
        return;
      }

      setLoadingMinors(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/programs?academicYearId=${selectedAcademicYearId}&type=minor`
        );
        if (!response.ok) throw new Error('Failed to fetch minors');
        const result = await response.json();
        const minorsData = result.data as Program[];
        setAllMinors(minorsData);
      } catch (error) {
        console.error('Error fetching minors:', error);
        setAllMinors([]);
      } finally {
        setLoadingMinors(false);
      }
    };

    fetchMinors();
  }, [selectedAcademicYearId]);

  // Clear secondary major if it becomes the primary major
  useEffect(() => {
    if (selectedSecondaryProgramId === selectedProgramId) {
      setSelectedSecondaryProgramId(null);
    }
  }, [selectedProgramId, selectedSecondaryProgramId]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle plan creation
  const handleCreatePlan = async () => {
    if (!planName.trim() || planName.length > 50 || !selectedAcademicYearId || !selectedSchoolId || !selectedProgramId) {
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/plans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: planName.trim(),
          academicYearId: selectedAcademicYearId,
          schoolId: selectedSchoolId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create plan');
      }

      const result = await response.json();
      const planId = result.data.id;

      // Add primary major to plan
      await fetch(`${API_BASE_URL}/api/plans/${planId}/programs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          programId: selectedProgramId,
        }),
      });

      // Add secondary major if selected
      if (selectedSecondaryProgramId) {
        await fetch(`${API_BASE_URL}/api/plans/${planId}/programs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            programId: selectedSecondaryProgramId,
          }),
        });
      }

      // Add minors if selected
      for (const minorId of selectedMinorIds) {
        await fetch(`${API_BASE_URL}/api/plans/${planId}/programs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            programId: minorId,
          }),
        });
      }

      // Success - close popup
      onClose();
      // Optionally refresh the page or navigate to the new plan
      window.location.reload();
    } catch (err) {
      console.error('Error creating plan:', err);
      alert(err instanceof Error ? err.message : 'Failed to create plan');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="new-plan-popup-backdrop" onClick={handleBackdropClick}>
      <div className="new-plan-popup-content">
        <img
          src={exitIcon}
          alt="Close"
          className="new-plan-popup-close-icon"
          onClick={onClose}
        />
        <h2 className="new-plan-popup-header">
          New plan
        </h2>
        <div className="new-plan-popup-form">
          <div className="new-plan-popup-label">Name your plan</div>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className={`new-plan-popup-input ${planName.length > 50 ? 'error' : ''}`}
              placeholder=""
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
            />
            <div className={`new-plan-popup-error-text ${planName.length > 50 ? 'visible' : ''}`}>
              Cannot exceed 50 characters
            </div>
          </div>

          <div className="new-plan-popup-label" style={{ marginTop: '20px' }}>Select your catalog year</div>
          {loading ? (
            <div className="new-plan-popup-input" style={{ display: 'flex', alignItems: 'center', color: 'var(--color-text-dark)' }}>
              Loading...
            </div>
          ) : (
            <Dropdown
              label="Select your catalog year"
              value={academicYears.find(y => y.id === selectedAcademicYearId)?.year || ''}
              options={academicYears.map(y => y.year)}
              onChange={(year) => {
                const selected = academicYears.find(y => y.year === year);
                if (selected) {
                  setSelectedAcademicYearId(selected.id);
                }
              }}
              placeholder="Select catalog year"
            />
          )}

          <div className="new-plan-popup-label" style={{ marginTop: '20px' }}>Select your school</div>
          {loading ? (
            <div className="new-plan-popup-input" style={{ display: 'flex', alignItems: 'center', color: 'var(--color-text-dark)' }}>
              Loading...
            </div>
          ) : (
            <Dropdown
              label="Select your school"
              value={schools.find(s => s.id === selectedSchoolId)?.name || ''}
              options={schools.map(s => s.name)}
              onChange={(name) => {
                const selected = schools.find(s => s.name === name);
                if (selected) {
                  setSelectedSchoolId(selected.id);
                }
              }}
              placeholder="Select school"
            />
          )}

          <div className="new-plan-popup-label" style={{ marginTop: '20px' }}>Select primary major</div>
          {loading || loadingPrograms ? (
            <div className="new-plan-popup-input" style={{ display: 'flex', alignItems: 'center', color: 'var(--color-text-dark)' }}>
              Loading...
            </div>
          ) : !selectedSchoolId || !selectedAcademicYearId ? (
            <div className="new-plan-popup-input" style={{ display: 'flex', alignItems: 'center', color: 'var(--color-text-dark)' }}>
              Select school and catalog year first
            </div>
          ) : programs.length === 0 ? (
            <div className="new-plan-popup-input" style={{ display: 'flex', alignItems: 'center', color: 'var(--color-text-dark)' }}>
              No majors available
            </div>
          ) : (
            <Dropdown
              label="Select primary major"
              value={(() => {
                const program = programs.find(p => p.id === selectedProgramId);
                if (!program) return '';
                const normalizedType = program.type.trim().toLowerCase();
                return normalizedType && program.name.toLowerCase().endsWith(` ${normalizedType}`)
                  ? program.name.slice(0, program.name.length - (normalizedType.length + 1))
                  : program.name;
              })()}
              options={programs.map(p => {
                const normalizedType = p.type.trim().toLowerCase();
                return normalizedType && p.name.toLowerCase().endsWith(` ${normalizedType}`)
                  ? p.name.slice(0, p.name.length - (normalizedType.length + 1))
                  : p.name;
              })}
              onChange={(displayName) => {
                const selected = programs.find(p => {
                  const normalizedType = p.type.trim().toLowerCase();
                  const strippedName = normalizedType && p.name.toLowerCase().endsWith(` ${normalizedType}`)
                    ? p.name.slice(0, p.name.length - (normalizedType.length + 1))
                    : p.name;
                  return strippedName === displayName;
                });
                if (selected) {
                  setSelectedProgramId(selected.id);
                }
              }}
              placeholder="Select primary major"
            />
          )}

          <div className="new-plan-popup-label" style={{ marginTop: '20px' }}>Select secondary major</div>
          {loading || loadingAllPrograms ? (
            <div className="new-plan-popup-input" style={{ display: 'flex', alignItems: 'center', color: 'var(--color-text-dark)' }}>
              Loading...
            </div>
          ) : !selectedAcademicYearId ? (
            <div className="new-plan-popup-input" style={{ display: 'flex', alignItems: 'center', color: 'var(--color-text-dark)' }}>
              Select catalog year first
            </div>
          ) : (() => {
            const availablePrograms = allPrograms.filter(p => p.id !== selectedProgramId);
            return availablePrograms.length === 0 ? (
              <div className="new-plan-popup-input" style={{ display: 'flex', alignItems: 'center', color: 'var(--color-text-dark)' }}>
                No majors available
              </div>
            ) : (
              <Dropdown
                label="Select secondary major"
                value={(() => {
                  const program = availablePrograms.find(p => p.id === selectedSecondaryProgramId);
                  if (!program) return '';
                  const normalizedType = program.type.trim().toLowerCase();
                  return normalizedType && program.name.toLowerCase().endsWith(` ${normalizedType}`)
                    ? program.name.slice(0, program.name.length - (normalizedType.length + 1))
                    : program.name;
                })()}
                options={availablePrograms.map(p => {
                  const normalizedType = p.type.trim().toLowerCase();
                  return normalizedType && p.name.toLowerCase().endsWith(` ${normalizedType}`)
                    ? p.name.slice(0, p.name.length - (normalizedType.length + 1))
                    : p.name;
                })}
                onChange={(displayName) => {
                  const selected = availablePrograms.find(p => {
                    const normalizedType = p.type.trim().toLowerCase();
                    const strippedName = normalizedType && p.name.toLowerCase().endsWith(` ${normalizedType}`)
                      ? p.name.slice(0, p.name.length - (normalizedType.length + 1))
                      : p.name;
                    return strippedName === displayName;
                  });
                  if (selected) {
                    setSelectedSecondaryProgramId(selected.id);
                  }
                }}
                placeholder="Select secondary major"
              />
            );
          })()}

          <div className="new-plan-popup-label" style={{ marginTop: '20px' }}>Select minors</div>
          {loading || loadingMinors ? (
            <div className="new-plan-popup-input" style={{ display: 'flex', alignItems: 'center', color: 'var(--color-text-dark)' }}>
              Loading...
            </div>
          ) : !selectedAcademicYearId ? (
            <div className="new-plan-popup-input" style={{ display: 'flex', alignItems: 'center', color: 'var(--color-text-dark)' }}>
              Select catalog year first
            </div>
          ) : allMinors.length === 0 ? (
            <div className="new-plan-popup-input" style={{ display: 'flex', alignItems: 'center', color: 'var(--color-text-dark)' }}>
              No minors available
            </div>
          ) : (
            <MultiSelectDropdown
              label="Select minors"
              selectedValues={selectedMinorIds.map(id => {
                const minor = allMinors.find(m => m.id === id);
                if (!minor) return '';
                const normalizedType = minor.type.trim().toLowerCase();
                return normalizedType && minor.name.toLowerCase().endsWith(` ${normalizedType}`)
                  ? minor.name.slice(0, minor.name.length - (normalizedType.length + 1))
                  : minor.name;
              })}
              options={allMinors.map(m => {
                const normalizedType = m.type.trim().toLowerCase();
                return normalizedType && m.name.toLowerCase().endsWith(` ${normalizedType}`)
                  ? m.name.slice(0, m.name.length - (normalizedType.length + 1))
                  : m.name;
              })}
              onChange={(displayNames) => {
                const ids = displayNames.map(displayName => {
                  const minor = allMinors.find(m => {
                    const normalizedType = m.type.trim().toLowerCase();
                    const strippedName = normalizedType && m.name.toLowerCase().endsWith(` ${normalizedType}`)
                      ? m.name.slice(0, m.name.length - (normalizedType.length + 1))
                      : m.name;
                    return strippedName === displayName;
                  });
                  return minor?.id;
                }).filter((id): id is number => id !== undefined);
                setSelectedMinorIds(ids);
              }}
              placeholder="Select minors"
            />
          )}

          <div className="new-plan-popup-buttons">
            <button
              className="new-plan-popup-cancel-button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className={`new-plan-popup-create-button ${
                planName.trim() && planName.length <= 50 && selectedAcademicYearId && selectedSchoolId && selectedProgramId && !isCreating
                  ? 'ready'
                  : 'disabled'
              }`}
              onClick={handleCreatePlan}
              disabled={isCreating || !planName.trim() || planName.length > 50 || !selectedAcademicYearId || !selectedSchoolId || !selectedProgramId}
            >
              {isCreating ? 'Creating...' : 'Create Plan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewPlanPopup;
