import React from 'react';
import { useParams } from 'react-router-dom';
import NavBar from '../../components/common/NavBarComponent/NavBar';
import ReturnToPlanButton from '../../components/program/programpage/ReturnToPlanButtonComponent/ReturnToPlanButton';
import AddCreditsButton from '../../components/transfercredits/AddCreditsButtonComponent/AddCreditsButton';
import TransferSearchToggle from '../../components/transfercredits/TransferSearchToggleComponent/TransferSearchToggle';
import TransferCreditsTableHeader from '../../components/transfercredits/TransferCreditsTableHeaderComponent/TransferCreditsTableHeader';
import TransferCourseRow from '../../components/transfercredits/TransferCourseRowComponent/TransferCourseRow';
import './TransferCredits.css';

const TransferCredits: React.FC = () => {
  const { planId } = useParams<{ planId?: string }>();

  return (
    <div className="transfer-credits-page">
      <NavBar />
      <div className="transfer-credits-search-wrapper">
        <TransferSearchToggle />
      </div>
      <div className="transfer-credits-content">
        <div className="transfer-credits-header">
          <h1>Transfer credits</h1>
          <div className="transfer-credits-header-buttons">
            <AddCreditsButton />
            <ReturnToPlanButton planId={planId ? parseInt(planId) : undefined} />
          </div>
        </div>
        <TransferCreditsTableHeader />
        <div className="transfer-credits-list">
          {/* Example transfer course rows */}
          <TransferCourseRow
            course="MATH 1300"
            title="Differential and Integral Calculus I"
            credits={3}
          />
          <TransferCourseRow
            course="CS 1101"
            title="Programming and Problem Solving"
            credits={3}
          />
          <TransferCourseRow
            course="PHYS 1601"
            title="Introductory Physics I"
            credits={4}
            isLast={true}
          />
        </div>
      </div>
    </div>
  );
};

export default TransferCredits;
