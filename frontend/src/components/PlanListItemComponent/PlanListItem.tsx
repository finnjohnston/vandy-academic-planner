import React from 'react';
import { format } from 'date-fns';
import type { Plan } from '../../types/Plan';
import threeDotsIcon from '../../assets/three_dots_icon.svg';
import './PlanListItem.css';

interface PlanListItemProps {
  plan: Plan;
  onClick?: (planId: number) => void;
  onOptionsClick?: (planId: number) => void;
}

const PlanListItem: React.FC<PlanListItemProps> = ({
  plan,
  onClick,
  onOptionsClick
}) => {
  const formattedDate = format(new Date(plan.updatedAt), 'MMMM d, yyyy');

  const handleRowClick = () => {
    if (onClick) {
      onClick(plan.id);
    }
  };

  const handleOptionsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOptionsClick) {
      onOptionsClick(plan.id);
    }
  };

  return (
    <div className="plan-list-item" onClick={handleRowClick}>
      <span className="plan-name">{plan.name}</span>
      <span className="plan-modified">{formattedDate}</span>
      <img
        src={threeDotsIcon}
        alt="Options"
        className="plan-options-icon"
        onClick={handleOptionsClick}
      />
    </div>
  );
};

export default PlanListItem;
