import React from 'react';
import PlansTableHeader from '../PlansTableHeaderComponent/PlansTableHeader';
import PlansList from '../PlansListComponent/PlansList';
import './PlansTable.css';

const PlansTable: React.FC = () => {
  return (
    <div className="plans-table">
      <PlansTableHeader />
      <PlansList />
    </div>
  );
};

export default PlansTable;
