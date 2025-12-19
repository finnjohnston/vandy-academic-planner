import React from 'react';
import './NavBar.css';
import vanderbiltLogo from '../../../assets/vanderbilt_logo.png';
import vanderbiltLogotype from '../../../assets/vanderbilt_logotype.png';

interface NavBarProps {
  isBlurred?: boolean;
}

const NavBar: React.FC<NavBarProps> = ({ isBlurred = false }) => {
  return (
    <nav className={`navbar${isBlurred ? ' navbar-blurred' : ''}`}>
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
