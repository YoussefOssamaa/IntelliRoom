import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../utils/authContext.jsx';
import axios from '../../config/axios.config';
import { checkLoggedIn } from '../../utils/checkLoggedIn.jsx';


interface NavigationProps {
  progress: number;
}

export default function Navigation({ progress }: NavigationProps) {
  const [scrolled, setScrolled] = useState(false);
  const { isLoggedIn, user, logout } = useAuth();

  const navigate = useNavigate();


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

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
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
      className="fixed top-0 left-0 w-full transition-all duration-500"
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

          {/* Right Side: Links + Auth */}
          <div className="flex items-center gap-14">
            {/* Nav Links - Desktop */}
            <div className="hidden lg:flex items-center gap-8">
              {[
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