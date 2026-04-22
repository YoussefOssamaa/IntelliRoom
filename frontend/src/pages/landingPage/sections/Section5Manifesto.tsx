import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function Section5Manifesto() {
  const sectionRef = useRef<HTMLElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const line1Ref = useRef<HTMLDivElement>(null);
  const line2Ref = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const bg = bgRef.current;
    const title = titleRef.current;
    const line1 = line1Ref.current;
    const line2 = line2Ref.current;
    const caption = captionRef.current;
    const cta = ctaRef.current;

    if (!section || !bg || !title || !line1 || !line2 || !caption || !cta) return;

    const ctx = gsap.context(() => {
      // 1. Set initial state: Everything is visible immediately
      gsap.set([bg, title, line1, line2, caption, cta], { opacity: 1, y: 0, scale: 1, rotateX: 0 });

      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: '+=80%',
          pin: true,
          scrub: 1.2,
        },
      });

      /**
       * EXIT PHASE ONLY
       * The timeline starts with the elements static, and as you scroll, 
       * they begin to fade out towards the end of the scroll distance.
       */

      // Start exit animations at 0.5 (halfway through the scroll)
      const exitStart = 0.5;

      scrollTl.to(
        bg,
        { scale: 1.05, opacity: 0, ease: 'power2.inOut' },
        exitStart
      );

      scrollTl.to(
        [title, line1, line2],
        { y: '-8vh', opacity: 0, ease: 'power2.inOut' },
        exitStart
      );

      scrollTl.to(
        [cta, caption],
        { y: -20, opacity: 0, ease: 'power2.inOut' },
        exitStart
      );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="section-5"
      className="stage relative overflow-hidden"
      style={{ zIndex: 104, height: '100vh' }}
    >
      <div ref={bgRef} className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
        <img
          src="/images/manifesto_full_room.jpg"
          alt="Wide interior scene"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0" style={{ backgroundColor: 'rgba(15, 14, 12, 0.35)' }} />
      </div>


      <div
        className="absolute text-center"
        style={{
          left: '50%',
          top: '30%',
          transform: 'translate(-50%, -50%)',
          zIndex: 4,
          perspective: '1000px',
        }}
      >
        <div
          ref={titleRef}
          className="text-cream"
          style={{
            /* Use Pinyon Script for that unique, loopy capital 'I' */
            fontFamily: '"Pinyon Script", cursive',
            fontSize: 'clamp(60px, 10vw, 120px)', // Slightly larger to show off the curves
            lineHeight: 1.1,
            textTransform: 'none', // Critical: Scripts must be Title Case, not Uppercase
            paddingBottom: '10px',  // Prevents the loopy 'I' from being cut off
            filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.2))'
          }}
        >
          Intelliroom
        </div>
      </div>



      <div
        className="absolute text-center"
        style={{
          left: '50%',
          top: '52%',
          transform: 'translate(-50%, -50%)',
          zIndex: 4,
          perspective: '1000px',
        }}
      >

        <div
          ref={line1Ref}
          className="font-display font-bold text-cream uppercase"
          style={{
            fontSize: 'clamp(44px, 6vw, 92px)',
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
          }}
        >
          YOUR SPACE
        </div>
        <div
          ref={line2Ref}
          className="font-display font-bold text-cream uppercase"
          style={{
            fontSize: 'clamp(44px, 6vw, 92px)',
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
          }}
        >
          REIMAGINED
        </div>
      </div>

      <button
        ref={ctaRef}
        className="absolute font-mono text-xs uppercase tracking-widest text-cream border border-cream px-6 py-3 rounded-full hover:bg-cream hover:text-espresso transition-all duration-300"
        style={{ left: '50%', bottom: '14vh', transform: 'translateX(-50%)', zIndex: 4 }}
      >
        Try it now
      </button>

      <p
        ref={captionRef}
        className="absolute font-body text-cream text-center"
        style={{
          left: '50%',
          bottom: '8vh',
          transform: 'translateX(-50%)',
          fontSize: 'clamp(13px, 1vw, 16px)',
          opacity: 0.85,
          zIndex: 4,
        }}
      >
        Upload a photo. Choose a direction. Iterate until it feels like home.
      </p>
    </section>
  );
}