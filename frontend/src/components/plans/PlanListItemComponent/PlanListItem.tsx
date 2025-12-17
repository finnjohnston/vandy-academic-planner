import React from 'react';
import { Link } from 'react-router-dom';
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
      <Link to={`/planning/${plan.id}`} className="plan-name">
        {plan.name}
      </Link>
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
