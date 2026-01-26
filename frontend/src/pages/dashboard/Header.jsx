import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import logoImage from '../../../public/assets/site-logo-white.png';

const Header = ({ user }) => {
  const [openSubmenu, setOpenSubmenu] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();

  const getLinkClass = (path) => {
   /* const isActive = location.pathname === path;
    return isActive 
      ? "text-base font-medium text-[#00e676] bg-transparent border-0 cursor-pointer"
      : "text-base font-medium text-text-primary hover:text-text-accent transition-colors";*/

    const isActive = location.pathname === path;
  return "text-base font-medium text-text-primary hover:text-text-accent transition-colors";
  };

  const handleLogout = () => {
    console.log("Logout clicked");
    setShowProfileMenu(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white shadow-[0px_1px_2px_#0000000c] border-b border-[#e0e0e0]">
      <div className="max-w-360 mx-auto px-3 sm:px-6 lg:px-12 py-3">
        
        <div className="flex justify-between items-center w-full">
          

          <Link to="/" className="flex items-center gap-3 cursor-pointer">
            <img
              src={logoImage}
              alt="IntelliRoom AI Logo"
              className="h-10 sm:h-12 lg:h-14 w-auto object-contain"
            />

            <span className="text-xl sm:text-2xl font-bold text-text-primary tracking-wide leading-none">
              IntelliRoom <span className="text-text-accent">AI</span>
            </span>
          </Link>


          <nav className="flex items-center space-x-7">
            
            <Link to="/" className={getLinkClass('/')}>
              Home
            </Link>
            
            <div 
              className="relative h-full flex items-center" 
              onMouseEnter={() => setOpenSubmenu('features')} 
              onMouseLeave={() => setOpenSubmenu(null)}
            >
            {/*
              <button className="text-base font-medium text-text-primary hover:text-text-accent transition-colors">
                Features
                <img 
                   src="/images/img_.png" 
                   alt="" 
                   className={`w-3 h-4 ml-2 transition-transform ${openSubmenu === 'features' ? 'rotate-180' : ''}`}
                   onError={(e) => {e.target.style.display='none'}}
                />
              </button>
              
              {openSubmenu === 'features' && (
                <ul className="absolute top-full left-0 mt-0 w-48 bg-white border border-[#e0e0e0] rounded-md shadow-lg z-50">
                  <li><button className="w-full px-4 py-3 text-left text-sm text-[#333333] hover:bg-[#f0fdf4] transition-colors bg-transparent border-0 cursor-pointer">Style Transfer</button></li>
                  <li><button onClick={()=>{navigate("/upload"); setOpenSubmenu(null);  }}  className="w-full px-4 py-3 text-left text-sm text-[#333333] hover:bg-[#f0fdf4] transition-colors bg-transparent border-0 cursor-pointer">AI Generation</button></li>
                  <li><button className="w-full px-4 py-3 text-left text-sm text-[#333333] hover:bg-[#f0fdf4] transition-colors bg-transparent border-0 cursor-pointer">Custom Configs</button></li>
                </ul>
              )}
            */}
            </div>


            <Link to="/upload" className={getLinkClass('/upload')}>
              AI Generation
            </Link>
{/*
            <Link to="/marketplace" className={getLinkClass('/gallery')}>
              Gallery
            </Link>
*/}
            <Link to="/marketplace" className={getLinkClass('/marketplace')}>
              Marketplace
            </Link>

            <Link to="/pricingPlans" className={getLinkClass('/pricingPlans')}>
              Pricing
            </Link>
            
            <Link to="/dashboard" className={getLinkClass('/dashboard')}>
              Dashboard
            </Link>
          </nav>

          <div className="flex items-center space-x-6">
            
            <button className="relative p-1 text-[#333333] hover:text-[#00e676] transition-colors bg-transparent border-0 cursor-pointer">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>

            <div className="flex items-center gap-2 px-4 py-2 bg-[#f0fdf4] rounded-md">
              <svg className="w-5 h-5 text-[#00e676]" fill="currentColor" viewBox="0 0 20 20">
                <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
              </svg>
              <span className="text-sm font-semibold text-[#333333]">
                {user?.credits || 0} Credits
              </span>
            </div>

            <div className="relative">
              <button 
                className="flex items-center gap-2 focus:outline-none bg-transparent border-0 cursor-pointer"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                <div className="w-10 h-10 rounded-full border-2 border-[#00e676] overflow-hidden">
                   {user?.profile_picture_url ? (
                     <img src={user.profile_picture_url} alt="Profile" className="w-full h-full object-cover" />
                   ) : (
                     <div className="w-full h-full bg-[#e0e0e0] flex items-center justify-center text-[#666] font-bold text-lg">
                        {user?.name?.charAt(0) || 'U'}
                     </div>
                   )}
                </div>
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-[#e0e0e0] rounded-md shadow-lg z-50">
                  <div className="px-4 py-3 border-b border-[#e0e0e0]">
                    <p className="text-sm font-semibold text-[#333333]">{user?.name || "User"}</p>
                    <p className="text-xs text-[#666666] truncate">{user?.plan || "Free"} Plan</p>
                  </div>
                  <ul className="py-2">
                    <li><button className="w-full px-4 py-2 text-left text-sm text-[#333333] hover:bg-[#f0fdf4] transition-colors bg-transparent border-0 cursor-pointer">Profile Settings</button></li>
                    <li><button className="w-full px-4 py-2 text-left text-sm text-[#333333] hover:bg-[#f0fdf4] transition-colors bg-transparent border-0 cursor-pointer">My Projects</button></li>
                    <li><button className="w-full px-4 py-2 text-left text-sm text-[#333333] hover:bg-[#f0fdf4] transition-colors bg-transparent border-0 cursor-pointer">Billing</button></li>
                    <li className="border-t border-[#e0e0e0] mt-2 pt-2">
                        <button 
                            onClick={handleLogout}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-[#f0fdf4] transition-colors bg-transparent border-0 cursor-pointer"
                        >
                            Sign Out
                        </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
          
        </div>
      </div>
    </header>
  );
};

export default Header;