import { useEffect, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './landingPage.css';
import Navigation from '../../components/common/Navigation';
import Section1Hero from './sections/Section1Hero';
import Section2Objects from './sections/Section2Objects';
import Section3StyleRange from './sections/Section3StyleRange';
import Section4Livable from './sections/Section4Livable';
import Section5Manifesto from './sections/Section5Manifesto';
import Section6Dark from './sections/Section6Dark';
import Section7Community from './sections/Section7Community';
import Section8Circle from './sections/Section8Circle';
import Section9Accent from './sections/Section9Accent';
import Section10Transform from './sections/Section10Transform';
import Section11Finish from './sections/Section11Finish';
import Section12Contact from './sections/Section12Contact';

gsap.registerPlugin(ScrollTrigger);

function App() {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    // Mobile Viewport Scale Fix - preserve original viewport meta data
    let viewportMeta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
    let originalContent = '';
    let isCreated = false;

    if (viewportMeta) {
      originalContent = viewportMeta.content;
      // Force mobile browsers to render at a desktop-like minimum width
      viewportMeta.content = 'width=1280, initial-scale=0';
    } else {
      viewportMeta = document.createElement('meta');
      viewportMeta.name = 'viewport';
      viewportMeta.content = 'width=1280, initial-scale=0';
      document.head.appendChild(viewportMeta);
      isCreated = true;
    }

    return () => {
      // Restore the original document viewport on component unmount
      if (viewportMeta && !isCreated) {
        viewportMeta.content = originalContent;
      } else if (viewportMeta && isCreated) {
        document.head.removeChild(viewportMeta);
      }
    };
  }, []);

  useEffect(() => {
    // Wait for all sections to mount and ScrollTriggers to initialize
    const timer = setTimeout(() => {
      ScrollTrigger.refresh();


      // Update global progress for navigation
      ScrollTrigger.create({
        onUpdate: (self) => {
          setScrollProgress(self.progress);
        },
      });
    }, 500);

    return () => {
      clearTimeout(timer);
      // Only kill the global triggers we created, not section triggers
      const allTriggers = ScrollTrigger.getAll();
      const globalTriggers = allTriggers.filter(
        (st) => !st.vars.pin && st.vars.snap
      );
      globalTriggers.forEach((st) => st.kill());
    };
  }, []);

  return (
    <div className="relative">
      {/* Noise overlay */}
      <div className="noise-overlay" />

      {/* Navigation */}
      <Navigation progress={scrollProgress} />

      {/* Sections */}
      <main className="relative">
        <Section5Manifesto />
        <Section1Hero />
        <Section10Transform />
        <Section2Objects />
        <Section3StyleRange />
        <Section4Livable />
        <Section9Accent />
        <Section6Dark />
        <Section7Community />
        <Section11Finish />
        <Section12Contact />
      </main>
    </div>
  );
}

export default App;
