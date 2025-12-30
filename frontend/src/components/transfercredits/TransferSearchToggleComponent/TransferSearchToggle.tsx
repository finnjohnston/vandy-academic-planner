import React from 'react';
import menuIcon from '../../../assets/menu_icon.png';
import './TransferSearchToggle.css';

const TransferSearchToggle: React.FC = () => {
  const handleClick = () => {
    // TODO: Implement search toggle functionality
    console.log('Search toggle clicked');
  };

  return (
    <div className="transfer-search-toggle" onClick={handleClick}>
      <img src={menuIcon} alt="Menu" className="transfer-search-toggle-icon" />
    </div>
  );
};

export default TransferSearchToggle;
