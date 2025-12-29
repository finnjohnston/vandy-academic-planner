import React from 'react';
import transferIcon from '../../../assets/transfer_icon.png';
import './TransferCredits.css';

const TransferCredits: React.FC = () => {
  return (
    <button className="transfer-credits-button">
      <img src={transferIcon} alt="Transfer" className="transfer-credits-icon" />
      <span className="transfer-credits-text">Transfer credits</span>
    </button>
  );
};

export default TransferCredits;
