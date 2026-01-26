import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

//import { useAuth } from '../../context/AuthContext'; until implement auth

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState(null);
  //const [showProfileMenu, setShowProfileMenu] = useState(false);
  //const { user, isSignedIn, logout } = useAuth();

  const navigate = useNavigate();

  const toggleSubmenu = (menuItem) => {
    setOpenSubmenu(openSubmenu === menuItem ? null : menuItem);
  };

  const handleLogout = () => {
    logout();
    setShowProfileMenu(false);
  };

  return (
    <header className="w-full bg-header-background shadow-[0px_1px_2px_#0000000c] relative">
      <div className="max-w-360 mx-auto px-3 sm:px-6 lg:px-12 py-3">
        <div className="flex justify-between items-center w-full">
          
          <div className="flex-shrink-0 flex items-center gap-3 cursor-pointer">
            <img 
              src="../public/assets/site-logo-white.png" 
              alt="IntelliRoom AI Logo" 
              className="w-auto h-10 sm:h-12 lg:h-14"
            />

              <span className="text-xl sm:text-2xl font-bold text-text-primary tracking-wide">
              IntelliRoom <span className="text-text-accent">AI</span>
            </span>
          </div>

          {/* desktop navigation */}
          <nav className="hidden lg:flex items-center space-x-7">
            <button 
              onClick={()=> navigate("/")}
              className="text-base font-medium text-text-primary hover:text-text-accent transition-colors"
              role="menuitem"
            >
              Home
            </button>
            
            <div className="relative">
            
             {/* 
                <button 
                className="flex items-center text-base font-medium text-text-primary hover:text-text-accent transition-colors"
                role="menuitem"
                aria-haspopup="true"
                aria-expanded={openSubmenu === 'features'}
                onClick={() => toggleSubmenu('features')}
              >
                Features
                <img 
                  src="/images/img_.png" 
                  alt="" 
                  className="w-3 h-4 ml-2"
                />
              </button>

              {openSubmenu === 'features' && (
                <ul className="absolute top-full left-0 mt-2 w-48 bg-background-card border border-border-light rounded-md shadow-lg z-50" role="menu">
                  <li role="menuitem">
                    <button className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-secondary-light transition-colors">
                      Style Transfer
                    </button>
                  </li>
                  <li role="menuitem">
                    <button 
                    onClick={()=>{navigate("/upload"); setOpenSubmenu(null);  }}
                    className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-secondary-light transition-colors">
                      AI Generation
                    </button>
                  </li>
                  <li role="menuitem">
                    <button className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-secondary-light transition-colors">
                      Custom Configs
                    </button>
                  </li>
                </ul>
              )}
                */}


            </div>

              <button 
              onClick={()=> navigate("/upload")}
              className="text-base font-medium text-text-primary hover:text-text-accent transition-colors"
              role="menuitem"
              >
              AI Generation
            </button>
{/*
            <button 
              onClick={()=> navigate("/gallery")}
              className="text-base font-medium text-text-primary hover:text-text-accent transition-colors"
              role="menuitem"
            >
              Gallery
            </button>
*/}
            <button
              onClick={()=> navigate("/marketplace")}
              className="text-base font-medium text-text-primary hover:text-text-accent transition-colors"
              role="menuitem"
            >
              Marketplace
            </button>

            <button 
              onClick={()=> navigate("/pricingPlans")}
              className="text-base font-medium text-text-primary hover:text-text-accent transition-colors"
              role="menuitem"
            >
              Pricing
            </button>

            <button 
              onClick={()=> navigate("/dashboard")}
              className="text-base font-medium text-text-primary hover:text-text-accent transition-colors"
              role="menuitem"
            >
              Dashboard
            </button>
          </nav>

           
           {/*{isSignedIn ? (
            <div className="hidden lg:flex items-center space-x-4">
              {// credits display //}
              <div className="flex items-center gap-2 px-4 py-2 bg-secondary-light rounded-md">
                <svg 
                  className="w-5 h-5 text-accent-color" 
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-semibold text-text-primary">
                  {user?.credits || 0} Credits
                </span>
              </div>

              {// profile dropdown //}
              <div className="relative">
                <button 
                  className="flex items-center gap-2 focus:outline-none"
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                >
                  <img 
                    src={user?.profile_picture_url || '/assets/default-avatar.png'} 
                    alt={user?.user_name || 'User'}
                    className="w-10 h-10 rounded-full object-cover border-2 border-primary-background"
                  />
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-background-card border border-border-light rounded-md shadow-lg z-50">
                    <div className="px-4 py-3 border-b border-border-light">
                      <p className="text-sm font-semibold text-text-primary">{user?.user_name}</p>
                      <p className="text-xs text-text-secondary truncate">{user?.email}</p>
                    </div>
                    <ul className="py-2">
                      <li>
                        <button className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-secondary-light transition-colors">
                          Profile Settings
                        </button>
                      </li>
                      <li>
                        <button className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-secondary-light transition-colors">
                          My Projects
                        </button>
                      </li>
                      <li>
                        <button className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-secondary-light transition-colors">
                          Billing
                        </button>
                      </li>
                      <li className="border-t border-border-light mt-2 pt-2">
                        <button 
                          onClick={handleLogout}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-secondary-light transition-colors"
                        >
                          Sign Out
                        </button>
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ) : */}
           
            <div className="hidden lg:flex items-center space-x-4">
              <button 
              onClick={()=> navigate("/login")}
              className="btn-secondary" style={{ padding: '10px 26px' }}>
                Sign In
              </button>
              <button 
              onClick={()=> navigate("/signup")}
              className="btn-primary" style={{ padding: '10px 24px' }}>
                Sign Up Free
              </button>
            </div>
          
      </div>
      </div>
    </header>
  );
};

export default Header;
