import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../utils/authContext.jsx';
import axios from '../../config/axios.config';
import { checkLoggedIn } from '../../utils/checkLoggedIn.jsx';


interface NavigationProps {
  progress?: number;
  isSticky?: boolean;
}

export default function Navigation({ progress, isSticky = false }: NavigationProps) {
  const [scrolled, setScrolled] = useState(false);
  const { isLoggedIn, user, logout } = useAuth();
  const [isDroppedDownMenu, setDroppedDownMenu] = useState(false);


  const navigate = useNavigate();
  const dropDownRef = useRef(null);


  const handleToggleMenu = () => {
    setDroppedDownMenu(!isDroppedDownMenu);
  }

  const handleSubmit = () => {
    navigate("/login");

  }
  const handleLogout = async () => {
    try {
      const result = await axios.post('/auth/logout');
      logout();
      if (result?.data?.success) {
        console.log("logged out");
        navigate("/");
      }
    } catch (e) {
      console.error(e);
      logout();
      navigate("/");
    }
  }
  const handleProfile = async () => {
    navigate("/dashboard");
  }
  const handleSettings = async () => {
    navigate("/updateProfile");
  }




  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropDownRef.current && !dropDownRef?.current?.contains(event.target)) {
        setDroppedDownMenu(false);
      }
    }
    const handleScroll = () => {
      setScrolled(window.scrollY > 100);
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };
  const goToPage = (link: string) => {
    if (link == "/upload" || link == "/planner") {
      checkLoggedIn(isLoggedIn, navigate, link);
      return;
    }
    navigate(link);
  }
  return (
    <nav
      className={`${isSticky ? "fixed" : "absolute"} top-0 left-0 w-full transition-all duration-500`}
      style={{
        zIndex: 9999,
        backgroundColor: scrolled ? 'rgba(244, 241, 236, 0.95)' : 'rgba(244, 241, 236, 0.92)',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(15, 14, 12, 0.05)' : 'none',
      }}
    >
      <div className="px-[3vw] pt-[3vh]">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <button
            onClick={() => navigate("/")}
            className="font-display text-lg font-bold tracking-tight text-text-primary hover:opacity-70 transition-opacity"
          >
            IntelliRoom
          </button>


          {/* Nav Links - Desktop */}
          <div className="hidden lg:flex items-center gap-8 ">
            {[
              { label: 'My Projects', link: '/dashboard' },
              { label: 'AI Studio', link: '/upload' },
              { label: 'Architect', link: '/planner' },
              { label: 'Pricing', link: '/pricingPlans' },
              { label: 'Shop', link: '/ecomm' },
              { label: 'About', link: '/about' },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => goToPage(item.link)}
                className="font-body text-xs uppercase tracking-widest text-text-primary hover:opacity-50 transition-all"
              >
                {item.label}
              </button>
            ))}
          </div>



          {/* Right Side: Links + Auth */}
          <div className="flex items-center gap-14">

            {/* Auth Buttons */}
            <div className="flex items-center gap-4">
              {!isLoggedIn && (
                <button
                  className="font-body text-xs uppercase tracking-widest text-text-primary hover:underline underline-offset-4 transition-all"

                  //onClick={() => goToPage("/login")}>
                  onClick={handleSubmit}>
                  Access
                </button>
              )}

              {!isLoggedIn && (
                <button
                  className="bg-text-primary text-cream px-6 py-2.5 rounded-full font-body text-xs uppercase tracking-widest hover:bg-opacity-80 transition-all shadow-sm"
                  onClick={() => goToPage("/signUp")}>
                  Join Now
                </button>
              )}
              {/* 
              {isLoggedIn && (
                <div className="flex items-center gap-4">
                  <span className="font-body text-xs tracking-widest text-text-primary">
                    {user?.name}
                  </span>
                  <button
                    className="bg-text-primary text-cream px-6 py-2.5 rounded-full font-body text-xs uppercase tracking-widest hover:bg-opacity-80 transition-all shadow-sm"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              )}*/}



              {isLoggedIn && (
                <div className="relative" ref={dropDownRef}>
                  {/* Trigger Button */}
                  <button
                    onClick={handleToggleMenu}
                    className="flex items-center gap-2 bg-text-primary text-cream px-5 py-2.5 rounded-full font-body text-xs uppercase tracking-widest hover:bg-opacity-90 transition-all shadow-sm focus:outline-none"
                  >
                    <span>{user?.name || "Account"}</span>
                    {/* Simple Down Arrow Chevron */}
                    <svg
                      className={`w-3 h-3 transition-transform duration-200 ${isDroppedDownMenu ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {isDroppedDownMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-lg py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">

                      <button
                        className="w-full text-left px-4 py-2.5 font-body text-xs tracking-widest text-text-primary ">
                        Credits: {user?.credits}
                      </button>


                      {/* Divider line */}
                      <hr className="border-gray-100 my-1" />


                      {/* Profile Link/Button */}
                      <button
                        onClick={() => {
                          handleProfile();
                          setDroppedDownMenu(false);
                        }}
                        className="w-full text-left px-4 py-2.5 font-body text-xs tracking-widest text-text-primary hover:bg-gray-50 transition-colors"
                      >
                        Profile
                      </button>

                      {/* Divider line */}
                      <hr className="border-gray-100 my-1" />

                      <button
                        onClick={() => {
                          handleSettings();
                          setDroppedDownMenu(false);
                        }}
                        className="w-full text-left px-4 py-2.5 font-body text-xs tracking-widest text-text-primary hover:bg-gray-50 transition-colors"
                      >
                        Settings
                      </button>

                      {/* Divider line */}
                      <hr className="border-gray-100 my-1" />


                      {/* Logout Button */}
                      <button
                        onClick={() => {
                          handleLogout();
                          setDroppedDownMenu(false);
                        }}
                        className="w-full text-left px-4 py-2.5 font-body text-xs tracking-widest text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Log Out
                      </button>

                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>



        {/* Progress Line */}
        <div className="mt-[2vh] h-[1px] w-full bg-black/5 relative">
          <div
            className="absolute top-0 left-0 h-full bg-text-primary transition-all duration-150"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
    </nav >


  );
}