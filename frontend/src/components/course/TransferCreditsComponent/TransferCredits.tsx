import React from 'react';
import { useNavigate } from 'react-router-dom';
import transferIcon from '../../../assets/transfer_icon.png';
import './TransferCredits.css';

interface TransferCreditsProps {
  planId?: number;
}

const TransferCredits: React.FC<TransferCreditsProps> = ({ planId }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (planId) {
      navigate(`/plans/${planId}/transfer-credits`);
    }
  };

  return (
    <button className="transfer-credits-button" onClick={handleClick}>
      <img src={transferIcon} alt="Transfer" className="transfer-credits-icon" />
      <span className="transfer-credits-text">Transfer credits</span>
    </button>
  );
};

export default TransferCredits;
