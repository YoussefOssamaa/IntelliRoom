import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function Section6Dark() {
  const sectionRef = useRef<HTMLElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLDivElement>(null);
  const topLabelRef = useRef<HTMLParagraphElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const image = imageRef.current;
    const headline = headlineRef.current;
    const topLabel = topLabelRef.current;
    const caption = captionRef.current;

    if (!section || !image || !headline || !topLabel || !caption) return;

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
        image,
        { y: '50vh', opacity: 0, scale: 0.9 },
        { y: '10vh', opacity: 1, scale: 1, ease: 'none' },
        0
      );

      scrollTl.fromTo(
        headline,
        { y: '-18vh', opacity: 0 },
        { y: '-5vh', opacity: 1, ease: 'none' },
        0.05
      );

      scrollTl.fromTo(
        topLabel,
        { y: -20, opacity: 0 },
        { y: 0, opacity: 1, ease: 'none' },
        0.02
      );

      scrollTl.fromTo(
        caption,
        { y: 30, opacity: 0 },
        { y: -20, opacity: 1, ease: 'none' },
        0.12
      );

      // EXIT (70-100%)
      scrollTl.fromTo(
        image,
        { y: '10vh', opacity: 1 },
        { y: '-12vh', opacity: 0, ease: 'power2.in' },
        0.7
      );

      scrollTl.fromTo(
        headline,
        { y: "-5vh", opacity: 1 },
        { y: '-18vh', opacity: 0, ease: 'power2.in' },
        0.7
      );

      scrollTl.fromTo(
        [topLabel, caption],
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
      id="section-6"
      className="stage bg-espresso relative overflow-hidden"
      style={{ zIndex: 105 }}
    >
      {/* Top micro label */}
      <p
        ref={topLabelRef}
        className="micro-label absolute"
        style={{
          left: '50%',
          top: '10vh',
          transform: 'translateX(-50%)',
          color: 'rgba(244, 241, 236, 0.72)',
        }}
      >
        FOR CREATORS
      </p>

      {/* Stacked headline */}
      <div
        ref={headlineRef}
        className="absolute text-center"
        style={{
          left: '50%',
          top: '22vh',
          transform: 'translateX(-50%)',
          zIndex: 4,
        }}
      >
        <div
          className="font-display font-bold uppercase text-cream"
          style={{
            fontSize: 'clamp(44px, 5.6vw, 86px)',
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
          }}
        >
          DESIGN
        </div>
        <div
          className="font-display font-bold uppercase text-cream"
          style={{
            fontSize: 'clamp(44px, 5.6vw, 86px)',
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
          }}
        >
          FASTER
        </div>
      </div>

      {/* Center image card */}
      <div
        ref={imageRef}
        className="image-card absolute"
        style={{
          left: '50%',
          top: '52%',
          transform: 'translate(-50%, -50%)',
          width: '46vw',
          height: '30vw',
          maxWidth: '690px',
          maxHeight: '450px',
        }}
      >
        <img
          src="/images/circle_chair.jpg"
          alt="Creator portrait"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Bottom caption */}
      <p
        ref={captionRef}
        className="absolute font-body text-center"
        style={{
          left: '50%',
          bottom: '8vh',
          transform: 'translateX(-50%)',
          fontSize: 'clamp(13px, 1vw, 16px)',
          color: 'rgba(244, 241, 236, 0.78)',
          zIndex: 4,
        }}
      >
        Concept, present, and refine interiors in minutes—not days.
      </p>

      {/* CTA */}
      <button
        className="absolute font-mono text-xs uppercase tracking-widest text-cream border border-cream px-5 py-2.5 rounded-full hover:bg-cream hover:text-espresso transition-all duration-300"
        style={{
          left: '50%',
          bottom: '4vh',
          transform: 'translateX(-50%)',
          zIndex: 4,
        }}
      >
        Request creator access
      </button>
    </section>
  );
}
