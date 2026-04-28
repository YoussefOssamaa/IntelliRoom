import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function Section10Transform() {
  const sectionRef = useRef<HTMLElement>(null);
  const leftImageRef = useRef<HTMLDivElement>(null);
  const rightImageRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const topLabelRef = useRef<HTMLParagraphElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const leftImage = leftImageRef.current;
    const rightImage = rightImageRef.current;
    const headline = headlineRef.current;
    const topLabel = topLabelRef.current;
    const caption = captionRef.current;

    if (!section || !leftImage || !rightImage || !headline || !topLabel || !caption) return;

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
        leftImage,
        { x: '-60vw', opacity: 0, scale: 0.95 },
        { x: 0, opacity: 1, scale: 1, ease: 'none' },
        0
      );

      scrollTl.fromTo(
        rightImage,
        { x: '60vw', opacity: 0, scale: 0.95 },
        { x: 0, opacity: 1, scale: 1, ease: 'none' },
        0
      );

      scrollTl.fromTo(
        [headline, topLabel],
        { y: '-8vh', opacity: 0 },
        { y: 0, opacity: 1, ease: 'none' },
        0.05
      );

      scrollTl.fromTo(
        caption,
        { y: 20, opacity: 0 },
        { y: -25, opacity: 1, ease: 'none' },
        0.15
      );

      // EXIT (70-100%)
      scrollTl.fromTo(
        leftImage,
        { x: 0, opacity: 1 },
        { x: '-16vw', opacity: 0, ease: 'power2.in' },
        0.7
      );

      scrollTl.fromTo(
        rightImage,
        { x: 0, opacity: 1 },
        { x: '16vw', opacity: 0, ease: 'power2.in' },
        0.7
      );

      scrollTl.fromTo(
        [headline, topLabel, caption],
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
      id="section-10"
      className="stage bg-cream relative overflow-hidden"
      style={{ zIndex: 109 }}
    >
      {/* Top micro label */}
      <p
        ref={topLabelRef}
        className="micro-label absolute text-text-secondary"
        style={{ left: '50%', top: '10vh', transform: 'translateX(-50%)' }}
      >
        TRANSFORM
      </p>

      {/* Headline */}
      <h2
        ref={headlineRef}
        className="font-display font-bold text-text-primary uppercase text-center absolute"
        style={{
          left: '50%',
          top: '18vh',
          transform: 'translateX(-50%)',
          fontSize: 'clamp(34px, 4.2vw, 64px)',
          letterSpacing: '-0.02em',
        }}
      >
        From existing to exceptional.
      </h2>

      {/* Left image (Before) */}
      <div
        ref={leftImageRef}
        className="image-card absolute"
        style={{
          left: '18vw',
          top: '62%',
          transform: 'translateY(-50%)',
          width: '40vw',
          height: '28vw',
          maxWidth: '600px',
          maxHeight: '420px',
        }}
      >
        <img
          src="/images/before.png"
          alt="Before renovation"
          className="w-full h-full object-cover"
        />
        {/* Before label */}
        <span
          className="absolute bottom-4 left-4 font-mono text-xs uppercase tracking-widest px-3 py-1.5 rounded-full"
          style={{
            backgroundColor: 'rgba(244, 241, 236, 0.9)',
            color: '#141210',
          }}
        >
          Before
        </span>
      </div>

      {/* Right image (After) */}
      <div
        ref={rightImageRef}
        className="image-card absolute"
        style={{
          right: '18vw',
          top: '62%',
          transform: 'translateY(-50%)',
          width: '40vw',
          height: '28vw',
          maxWidth: '600px',
          maxHeight: '420px',
        }}
      >
        <img
          src="/images/after.png"
          alt="After renovation"
          className="w-full h-full object-cover"
        />
        {/* After label */}
        <span
          className="absolute bottom-4 left-4 font-mono text-xs uppercase tracking-widest px-3 py-1.5 rounded-full"
          style={{
            backgroundColor: 'rgba(244, 241, 236, 0.9)',
            color: '#141210',
          }}
        >
          After
        </span>
      </div>

      {/* Bottom caption */}
      <p
        ref={captionRef}
        className="absolute font-body text-text-secondary text-center"
        style={{
          left: '50%',
          bottom: '7vh',
          transform: 'translateX(-50%)',
          fontSize: 'clamp(13px, 1vw, 16px)',
        }}
      >
        Keep the structure. Change the story—lighting, materials, and layout.
      </p>

      {/* CTA */}
      <button
        className="absolute font-mono text-xs uppercase tracking-widest text-text-primary border border-text-primary px-5 py-2.5 rounded-full hover:bg-text-primary hover:text-cream transition-all duration-300"
        style={{
          left: '50%',
          bottom: '3vh',
          transform: 'translateX(-50%)',
        }}
      >
        See examples
      </button>
    </section>
  );
}
