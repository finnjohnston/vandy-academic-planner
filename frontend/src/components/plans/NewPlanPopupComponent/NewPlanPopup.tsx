import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './NewPlanPopup.css';
import exitIcon from '../../../assets/exit_icon.png';
import Dropdown from '../DropdownComponent/Dropdown';

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

const API_BASE_URL = 'http://localhost:3000';

const NewPlanPopup: React.FC<NewPlanPopupProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const [planName, setPlanName] = useState('');
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<number | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
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
    if (!planName.trim() || planName.length > 50 || !selectedAcademicYearId || !selectedSchoolId) {
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

      // Success - navigate to the new plan
      navigate(`/planning/${planId}`);
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

          <div className="new-plan-popup-buttons">
            <button
              className="new-plan-popup-cancel-button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className={`new-plan-popup-create-button ${
                planName.trim() && planName.length <= 50 && selectedAcademicYearId && selectedSchoolId && !isCreating
                  ? 'ready'
                  : 'disabled'
              }`}
              onClick={handleCreatePlan}
              disabled={isCreating || !planName.trim() || planName.length > 50 || !selectedAcademicYearId || !selectedSchoolId}
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
