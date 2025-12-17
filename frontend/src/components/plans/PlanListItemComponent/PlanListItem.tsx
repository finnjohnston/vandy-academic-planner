import React from 'react';
import { format } from 'date-fns';
import type { Plan } from '../../../types/Plan';
import PlanOptionsMenu from '../PlanOptionsMenuComponent/PlanOptionsMenu';
import './PlanListItem.css';

interface PlanListItemProps {
  plan: Plan;
  onEditClick?: (planId: number) => void;
  onDeleteClick?: (planId: number) => void;
}

const PlanListItem: React.FC<PlanListItemProps> = ({
  plan,
  onEditClick,
  onDeleteClick
}) => {
  const formattedDate = format(new Date(plan.updatedAt), 'MMMM d, yyyy');

  return (
    <div className="plan-list-item">
      <span className="plan-name">{plan.name}</span>
      <span className="plan-modified">{formattedDate}</span>
      <PlanOptionsMenu
        planId={plan.id}
        onEditClick={onEditClick}
        onDeleteClick={onDeleteClick}
      />
    </div>
  );
};

export default PlanListItem;
