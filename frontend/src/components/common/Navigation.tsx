import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface NavigationProps {
  progress: number;
}

export default function Navigation({ progress }: NavigationProps) {
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

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
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
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
              {/* Login -> "Enter" or "Access" */}
              <button
                className="font-body text-xs uppercase tracking-widest text-text-primary hover:underline underline-offset-4 transition-all"
                onClick={() => goToPage("/login")}>
                Access
              </button>

              {/* Sign Up -> "Join" or "Begin" */}
              <button
                className="bg-text-primary text-cream px-6 py-2.5 rounded-full font-body text-xs uppercase tracking-widest hover:bg-opacity-80 transition-all shadow-sm"
                onClick={() => goToPage("/signUp")}>
                Join Now
              </button>
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
    </nav>
  );
}