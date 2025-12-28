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

  // Separate programs into majors and minors
  const majors = plan.programs?.filter(p => p.type === 'major').slice(0, 3) || [];
  const minors = plan.programs?.filter(p => p.type === 'minor').slice(0, 3) || [];

  return (
    <div className="plan-list-item">
      <Link to={`/planning/${plan.id}`} className="plan-name">
        {plan.name}
      </Link>
      <div className="plan-majors">
        {majors.map((major) => (
          <div key={major.id} className="plan-program-name">
            {major.name}
          </div>
        ))}
      </div>
      <div className="plan-minors">
        {minors.map((minor) => (
          <div key={minor.id} className="plan-program-name">
            {minor.name}
          </div>
        ))}
      </div>
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
