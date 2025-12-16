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
        <PlanListItem key={plan.id} plan={plan} />
      ))}
    </div>
  );
};

export default PlansList;
