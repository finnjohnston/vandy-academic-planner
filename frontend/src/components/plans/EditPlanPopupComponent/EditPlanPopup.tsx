import React, { useEffect, useState } from 'react';
import './EditPlanPopup.css';
import exitIcon from '../../../assets/exit_icon.png';
import lockIcon from '../../../assets/lock_icon.webp';

interface EditPlanPopupProps {
  onClose: () => void;
  planId: number;
  initialName: string;
  catalogYear: string;
  schoolName: string;
}

const API_BASE_URL = 'http://localhost:3000';

const EditPlanPopup: React.FC<EditPlanPopupProps> = ({
  onClose,
  planId,
  initialName,
  catalogYear,
  schoolName,
}) => {
  const [planName, setPlanName] = useState(initialName);
  const [catalogYearClicked, setCatalogYearClicked] = useState(false);
  const [schoolClicked, setSchoolClicked] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

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

  // Handle plan update
  const handleUpdatePlan = async () => {
    if (!planName.trim() || planName.length > 50) {
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/plans/${planId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: planName.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update plan');
      }

      // Success - close popup and reload
      onClose();
      window.location.reload();
    } catch (err) {
      console.error('Error updating plan:', err);
      alert(err instanceof Error ? err.message : 'Failed to update plan');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="edit-plan-popup-backdrop" onClick={handleBackdropClick}>
      <div className="edit-plan-popup-content">
        <img
          src={exitIcon}
          alt="Close"
          className="edit-plan-popup-close-icon"
          onClick={onClose}
        />
        <h2 className="edit-plan-popup-header">
          Edit plan
        </h2>
        <div className="edit-plan-popup-form">
          <div className="edit-plan-popup-label">Plan name</div>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className={`edit-plan-popup-input ${planName.length > 50 ? 'error' : ''}`}
              placeholder=""
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
            />
            <div className={`edit-plan-popup-error-text ${planName.length > 50 ? 'visible' : ''}`}>
              Cannot exceed 50 characters
            </div>
          </div>

          <div className="edit-plan-popup-label" style={{ marginTop: '20px' }}>Catalog year</div>
          <div style={{ position: 'relative' }}>
            <div
              className={`edit-plan-popup-locked-dropdown ${catalogYearClicked ? 'locked-error' : ''}`}
              onClick={() => setCatalogYearClicked(!catalogYearClicked)}
            >
              <span className={catalogYearClicked ? 'locked-text-error' : ''}>{catalogYear}</span>
              <img src={lockIcon} alt="Locked" className="edit-plan-popup-lock-icon" />
            </div>
            <div className={`edit-plan-popup-error-text ${catalogYearClicked ? 'visible' : ''}`}>
              Cannot change catalog year
            </div>
          </div>

          <div className="edit-plan-popup-label" style={{ marginTop: '20px' }}>School</div>
          <div style={{ position: 'relative' }}>
            <div
              className={`edit-plan-popup-locked-dropdown ${schoolClicked ? 'locked-error' : ''}`}
              onClick={() => setSchoolClicked(!schoolClicked)}
            >
              <span className={schoolClicked ? 'locked-text-error' : ''}>{schoolName}</span>
              <img src={lockIcon} alt="Locked" className="edit-plan-popup-lock-icon" />
            </div>
            <div className={`edit-plan-popup-error-text ${schoolClicked ? 'visible' : ''}`}>
              Cannot change school
            </div>
          </div>

          <div className="edit-plan-popup-buttons">
            <button
              className="edit-plan-popup-cancel-button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className={`edit-plan-popup-update-button ${
                planName.trim() && planName.length <= 50 && planName !== initialName && !isUpdating
                  ? 'ready'
                  : 'disabled'
              }`}
              onClick={handleUpdatePlan}
              disabled={isUpdating || !planName.trim() || planName.length > 50 || planName === initialName}
            >
              {isUpdating ? 'Updating...' : 'Update Plan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditPlanPopup;
