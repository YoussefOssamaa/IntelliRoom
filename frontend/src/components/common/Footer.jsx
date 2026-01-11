const Footer = () => {
  return (
    <footer className="w-full bg-footer-background">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-20 pt-16 pb-8">
        <div className="flex flex-col gap-12 w-full">
           
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
            
            
            <div className="flex flex-col gap-4">
              <h4 className="text-lg font-bold text-secondary mb-2">
                Products
              </h4>
              <nav className="flex flex-col gap-3">
                <a 
                  href="#" 
                  className="text-sm font-normal text-secondary hover:text-primary relative transition-colors duration-200 hover-underline-animation"
                >
                  Floor Planner
                </a>
                <a 
                  href="#" 
                  className="text-sm font-normal text-secondary hover:text-primary relative transition-colors duration-200 hover-underline-animation"
                >
                  Interior Design
                </a>
                <a 
                  href="#" 
                  className="text-sm font-normal text-secondary hover:text-primary relative transition-colors duration-200 hover-underline-animation"
                >
                  AI Home Design
                </a>
                <a 
                  href="#" 
                  className="text-sm font-normal text-secondary hover:text-primary relative transition-colors duration-200 hover-underline-animation"
                >
                  3D Viewer
                </a>
              </nav>
            </div>

            
            <div className="flex flex-col gap-4">
              <h4 className="text-lg font-bold text-secondary mb-2">
                Resources
              </h4>
              <nav className="flex flex-col gap-3">
                <a 
                  href="#" 
                  className="text-sm font-normal text-secondary hover:text-primary relative transition-colors duration-200 hover-underline-animation"
                >
                  Home Design Ideas
                </a>
                <a 
                  href="#" 
                  className="text-sm font-normal text-secondary hover:text-primary relative transition-colors duration-200 hover-underline-animation"
                >
                  Help Center
                </a>
                <a 
                  href="#" 
                  className="text-sm font-normal text-secondary hover:text-primary relative transition-colors duration-200 hover-underline-animation"
                >
                  Article
                </a>
              </nav>
            </div>

            
            <div className="flex flex-col gap-4">
              <h4 className="text-lg font-bold text-secondary mb-2">
                Company
              </h4>
              <nav className="flex flex-col gap-3">
                <a 
                  href="#" 
                  className="text-sm font-normal text-secondary hover:text-primary relative transition-colors duration-200 hover-underline-animation"
                >
                  About Us
                </a>
                <a 
                  href="#" 
                  className="text-sm font-normal text-secondary hover:text-primary relative transition-colors duration-200 hover-underline-animation"
                >
                  Contact Us
                </a>
                <a 
                  href="#" 
                  className="text-sm font-normal text-secondary hover:text-primary relative transition-colors duration-200 hover-underline-animation"
                >
                  Partner Program
                </a>
                <a 
                  href="#" 
                  className="text-sm font-normal text-secondary hover:text-primary relative transition-colors duration-200 hover-underline-animation"
                >
                  Careers
                </a>
              </nav>
            </div>

            
            <div className="flex flex-col gap-4 lg:col-span-2 lg:items-end">
              <img 
                src="../assets/site-logo-white.png" 
                alt="IntelliRoom AI Logo"
                className="w-40 h-auto" 
              />
              <p className="text-sm font-normal text-secondary lg:text-right max-w-xs">
                Developed and run by IntelliRoom AI
              </p>
            </div>
          </div>

          
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-8 border-t border-gray-700/50">
            <p className="text-sm font-normal text-secondary">
              © 2025 IntelliRoom AI. All rights reserved.
            </p>
            <div className="flex gap-6">
              <a 
                href="#" 
                className="text-sm font-normal text-secondary hover:text-primary relative transition-colors duration-200 hover-underline-animation"
              >
                Privacy Policy
              </a>
              <a 
                href="#" 
                className="text-sm font-normal text-secondary hover:text-primary relative transition-colors duration-200 hover-underline-animation"
              >
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
