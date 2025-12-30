import React from 'react';
import menuIcon from '../../../assets/menu_icon.png';
import './TransferSearchToggle.css';

interface TransferSearchToggleProps {
  onClick: () => void;
}

const TransferSearchToggle: React.FC<TransferSearchToggleProps> = ({ onClick }) => {
  return (
    <div className="transfer-search-toggle" onClick={onClick}>
      <img src={menuIcon} alt="Menu" className="transfer-search-toggle-icon" />
    </div>
  );
};

export default TransferSearchToggle;
