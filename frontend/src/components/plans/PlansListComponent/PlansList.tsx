import React, { useState, useEffect } from 'react';
import PlanListItem from '../PlanListItemComponent/PlanListItem';
import type { Plan } from '../../../types/Plan';
import './PlansList.css';

const API_BASE_URL = 'http://localhost:3000';

const PlansList: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/plans`);
        if (!response.ok) throw new Error('Failed to fetch plans');
        const result = await response.json();
        setPlans(result.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching plans:', err);
        setError(err instanceof Error ? err.message : 'Failed to load plans');
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  const handleEditPlan = (planId: number) => {
    console.log('Edit plan:', planId);
    // TODO: Implement edit functionality
  };

  const handleDeletePlan = async (planId: number) => {
    // Optimistically remove the plan from the UI
    const originalPlans = [...plans];
    setPlans(plans.filter((plan) => plan.id !== planId));

    try {
      const response = await fetch(`${API_BASE_URL}/api/plans/${planId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        // If the server-side deletion fails, revert the UI change
        setPlans(originalPlans);
        // Optionally, show an error message to the user
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete the plan.');
      }
      // If server-side deletion is successful, the UI is already updated.
    } catch (err) {
      console.error('Error deleting plan:', err);
      // Revert the optimistic update on any error
      setPlans(originalPlans);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    }
  };

  if (loading) {
    return (
      <div className="plans-list">
        <div className="plans-list-loading">Loading plans...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="plans-list">
        <div className="plans-list-error">Error: {error}</div>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="plans-list">
        <div className="plans-list-empty">No plans found</div>
      </div>
    );
  }

  return (
    <div className="plans-list">
      {plans.map((plan) => (
        <PlanListItem
          key={plan.id}
          plan={plan}
          onEditClick={handleEditPlan}
          onDeleteClick={handleDeletePlan}
        />
      ))}
    </div>
  );
};

export default PlansList;
