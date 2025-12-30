import React from 'react';
import { useParams } from 'react-router-dom';
import NavBar from '../../components/common/NavBarComponent/NavBar';
import ReturnToPlanButton from '../../components/program/programpage/ReturnToPlanButtonComponent/ReturnToPlanButton';
import AddCreditsButton from '../../components/transfercredits/AddCreditsButtonComponent/AddCreditsButton';
import TransferCreditsTableHeader from '../../components/transfercredits/TransferCreditsTableHeaderComponent/TransferCreditsTableHeader';
import './TransferCredits.css';

const TransferCredits: React.FC = () => {
  const { planId } = useParams<{ planId?: string }>();

  return (
    <div className="transfer-credits-page">
      <NavBar />
      <div className="transfer-credits-content">
        <div className="transfer-credits-header">
          <h1>Transfer credits</h1>
          <div className="transfer-credits-header-buttons">
            <AddCreditsButton />
            <ReturnToPlanButton planId={planId ? parseInt(planId) : undefined} />
          </div>
        </div>
        <TransferCreditsTableHeader />
        {/* Transfer credits list will go here */}
      </div>
    </div>
  );
};

export default TransferCredits;
