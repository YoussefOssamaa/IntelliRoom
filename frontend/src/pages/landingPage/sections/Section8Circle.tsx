import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function Section8Circle() {
  const sectionRef = useRef<HTMLElement>(null);
  const circleRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const topLabelRef = useRef<HTMLParagraphElement>(null);
  const marker1Ref = useRef<HTMLSpanElement>(null);
  const marker2Ref = useRef<HTMLSpanElement>(null);
  const marker3Ref = useRef<HTMLSpanElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const circle = circleRef.current;
    const headline = headlineRef.current;
    const topLabel = topLabelRef.current;
    const marker1 = marker1Ref.current;
    const marker2 = marker2Ref.current;
    const marker3 = marker3Ref.current;
    const caption = captionRef.current;

    if (!section || !circle || !headline || !topLabel || !marker1 || !marker2 || !marker3 || !caption) return;

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
        circle,
        { scale: 0.2, opacity: 0, rotate: -12 },
        { scale: 1, opacity: 1, rotate: 0, ease: 'none' },
        0
      );

      scrollTl.fromTo(
        [headline, topLabel],
        { y: '-8vh', opacity: 0 },
        { y: 0, opacity: 1, ease: 'none' },
        0.05
      );

      scrollTl.fromTo(
        marker1,
        { x: '20vw', opacity: 0 },
        { x: 0, opacity: 1, ease: 'none' },
        0.15
      );

      scrollTl.fromTo(
        marker2,
        { y: '20vh', opacity: 0 },
        { y: 0, opacity: 1, ease: 'none' },
        0.18
      );

      scrollTl.fromTo(
        marker3,
        { y: '-20vh', opacity: 0 },
        { y: 0, opacity: 1, ease: 'none' },
        0.2
      );

      scrollTl.fromTo(
        caption,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, ease: 'none' },
        0.22
      );

      // EXIT (70-100%)
      scrollTl.fromTo(
        circle,
        { scale: 1, opacity: 1 },
        { scale: 0.85, opacity: 0, ease: 'power2.in' },
        0.7
      );

      scrollTl.fromTo(
        [headline, topLabel],
        { opacity: 1 },
        { opacity: 0, ease: 'power2.in' },
        0.7
      );

      scrollTl.fromTo(
        [marker1, marker2, marker3],
        { opacity: 1 },
        { opacity: 0, ease: 'power2.in' },
        0.7
      );

      scrollTl.fromTo(
        caption,
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
      id="section-8"
      className="stage bg-cream relative overflow-hidden"
      style={{ zIndex: 107 }}
    >
      {/* Top micro label */}
      <p
        ref={topLabelRef}
        className="micro-label absolute text-text-secondary"
        style={{ left: '50%', top: '10vh', transform: 'translateX(-50%)' }}
      >
        FLEXIBLE OUTPUTS
      </p>

      {/* Headline */}
      <h2
        ref={headlineRef}
        className="font-display font-bold text-text-primary uppercase text-center absolute"
        style={{
          left: '50%',
          top: '22vh',
          transform: 'translateX(-50%)',
          fontSize: 'clamp(34px, 4.2vw, 64px)',
          letterSpacing: '-0.02em',
        }}
      >
        Round concepts. Sharp craft.
      </h2>

      {/* Center circular image */}
      <div
        ref={circleRef}
        className="image-card absolute"
        style={{
          left: '50%',
          top: '52%',
          transform: 'translate(-50%, -50%)',
          width: 'min(40vw, 640px)',
          height: 'min(40vw, 640px)',
          borderRadius: '50%',
        }}
      >
        <img
          src="/images/circle_chair.jpg"
          alt="Overhead view of chair"
          className="w-full h-full object-cover"
          style={{ borderRadius: '50%' }}
        />
      </div>

      {/* Orbiting markers */}
      <span
        ref={marker1Ref}
        className="micro-label absolute text-text-secondary"
        style={{ right: '14vw', top: '48%' }}
      >
        RICH TONES
      </span>

      <span
        ref={marker2Ref}
        className="micro-label absolute text-text-secondary"
        style={{ left: '18vw', bottom: '18vh' }}
      >
        SOFT CONTRAST
      </span>

      <span
        ref={marker3Ref}
        className="micro-label absolute text-text-secondary"
        style={{ left: '18vw', top: '26vh' }}
      >
        CLEAN LINES
      </span>

      {/* Bottom caption */}
      <p
        ref={captionRef}
        className="absolute font-body text-text-secondary text-center"
        style={{
          left: '50%',
          bottom: '6vh',
          transform: 'translateX(-50%)',
          fontSize: 'clamp(13px, 1vw, 16px)',
        }}
      >
        Switch aspect ratios, crop, and export ready-to-share visuals.
      </p>
    </section>
  );
}
