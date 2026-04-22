import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function Section9Accent() {
  const sectionRef = useRef<HTMLElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const topLabelRef = useRef<HTMLParagraphElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const bg = bgRef.current;
    const headline = headlineRef.current;
    const topLabel = topLabelRef.current;
    const caption = captionRef.current;
    const cta = ctaRef.current;

    if (!section || !bg || !headline || !topLabel || !caption || !cta) return;

    const ctx = gsap.context(() => {
      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: '+=280%',
          pin: true,
          scrub: 0.6,
        },
      });

      // ENTRANCE (0-30%)
      scrollTl.fromTo(
        bg,
        { scale: 1.06, opacity: 0 },
        { scale: 1, opacity: 1, ease: 'none' },
        0
      );

      scrollTl.fromTo(
        headline,
        { y: '18vh', opacity: 0, rotateX: 18 },
        { y: 0, opacity: 1, rotateX: 0, ease: 'none' },
        0.05
      );

      scrollTl.fromTo(
        topLabel,
        { y: -20, opacity: 0 },
        { y: 0, opacity: 1, ease: 'none' },
        0.02
      );

      scrollTl.fromTo(
        cta,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, ease: 'none' },
        0.12
      );

      scrollTl.fromTo(
        caption,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, ease: 'none' },
        0.15
      );

      // EXIT (70-100%)
      scrollTl.fromTo(
        bg,
        { opacity: 1 },
        { opacity: 0, ease: 'power2.in' },
        0.7
      );

      scrollTl.fromTo(
        headline,
        { y: 0, opacity: 1 },
        { y: '-10vh', opacity: 0, ease: 'power2.in' },
        0.7
      );

      scrollTl.fromTo(
        [topLabel, cta, caption],
        { opacity: 1 },
        { opacity: 0, ease: 'power2.in' },
        0.7
      );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="section-9"
      className="stage relative overflow-hidden"
      style={{ zIndex: 108 }}
    >
      {/* Full-bleed burnt orange background */}
      <div
        ref={bgRef}
        className="absolute inset-0 w-full h-full bg-burnt"
        style={{ zIndex: 1 }}
      />

      {/* Top micro label */}
      <p
        ref={topLabelRef}
        className="micro-label absolute"
        style={{
          left: '50%',
          top: '14vh',
          transform: 'translateX(-50%)',
          color: '#0F0E0C',
          zIndex: 4,
        }}
      >
        A NEW CHAPTER
      </p>

      {/* Large centered headline */}
      <h2
        ref={headlineRef}
        className="font-display font-bold uppercase text-center absolute"
        style={{
          left: '50%',
          top: '52%',
          transform: 'translate(-50%, -50%)',
          fontSize: 'clamp(34px, 4.8vw, 72px)',
          letterSpacing: '-0.02em',
          color: '#0F0E0C',
          lineHeight: 1.1,
          zIndex: 4,
          maxWidth: '80vw',
        }}
      >
        Modern interiors, generated with care.
      </h2>

      {/* CTA */}
      <button
        ref={ctaRef}
        className="absolute font-mono text-xs uppercase tracking-widest border px-6 py-3 rounded-full hover:transition-all duration-300"
        style={{
          left: '50%',
          bottom: '16vh',
          transform: 'translateX(-50%)',
          color: '#0F0E0C',
          borderColor: '#0F0E0C',
          zIndex: 4,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#0F0E0C';
          e.currentTarget.style.color = '#FF6A3D';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = '#0F0E0C';
        }}
      >
        Get early access
      </button>

      {/* Bottom caption */}
      <p
        ref={captionRef}
        className="absolute font-body text-center"
        style={{
          left: '50%',
          bottom: '10vh',
          transform: 'translateX(-50%)',
          fontSize: 'clamp(13px, 1vw, 16px)',
          color: 'rgba(15, 14, 12, 0.8)',
          zIndex: 4,
        }}
      >
        Start with a photo. End with a vision you can build.
      </p>
    </section>
  );
}
