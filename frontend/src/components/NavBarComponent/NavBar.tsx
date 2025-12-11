import React from 'react';
import './NavBar.css';
import vanderbiltLogo from '../../assets/vanderbilt_logo.png';
import vanderbiltLogotype from '../../assets/vanderbilt_logotype.png';

const NavBar: React.FC = () => {
  return (
    <nav className="navbar">
      <div className="navbar-left">
        <img
          src={vanderbiltLogo}
          alt="Vanderbilt Logo"
          className="navbar-logo"
        />
        <img
          src={vanderbiltLogotype}
          alt="Vanderbilt"
          className="navbar-logotype"
        />
      </div>
    </nav>
  );
};

export default NavBar;
