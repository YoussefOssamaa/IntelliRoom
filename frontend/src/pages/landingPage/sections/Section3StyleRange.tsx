import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function Section3StyleRange() {
  const sectionRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const leftCardRef = useRef<HTMLDivElement>(null);
  const centerCardRef = useRef<HTMLDivElement>(null);
  const rightCardRef = useRef<HTMLDivElement>(null);
  const topLabelRef = useRef<HTMLParagraphElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const headline = headlineRef.current;
    const leftCard = leftCardRef.current;
    const centerCard = centerCardRef.current;
    const rightCard = rightCardRef.current;
    const topLabel = topLabelRef.current;
    const caption = captionRef.current;

    if (!section || !headline || !leftCard || !centerCard || !rightCard || !topLabel || !caption) return;

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
        headline,
        { y: '-10vh', opacity: 0 },
        { y: 0, opacity: 1, ease: 'none' },
        0
      );

      scrollTl.fromTo(
        topLabel,
        { y: -20, opacity: 0 },
        { y: 0, opacity: 1, ease: 'none' },
        0.02
      );

      scrollTl.fromTo(
        leftCard,
        { x: '-55vw', opacity: 0, scale: 0.95 },
        { x: 0, opacity: 1, scale: 1, ease: 'none' },
        0
      );

      scrollTl.fromTo(
        centerCard,
        { y: '60vh', opacity: 0, scale: 0.92 },
        { y: 0, opacity: 1, scale: 1, ease: 'none' },
        0.05
      );

      scrollTl.fromTo(
        rightCard,
        { x: '55vw', opacity: 0, scale: 0.95 },
        { x: 0, opacity: 1, scale: 1, ease: 'none' },
        0.08
      );

      scrollTl.fromTo(
        caption,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, ease: 'none' },
        0.15
      );

      // EXIT (70-100%)
      scrollTl.fromTo(
        headline,
        { y: 0, opacity: 1 },
        { y: '-6vh', opacity: 0, ease: 'power2.in' },
        0.7
      );

      scrollTl.fromTo(
        leftCard,
        { x: 0, opacity: 1 },
        { x: '-18vw', opacity: 0, ease: 'power2.in' },
        0.7
      );

      scrollTl.fromTo(
        centerCard,
        { y: 0, opacity: 1 },
        { y: '18vh', opacity: 0, ease: 'power2.in' },
        0.7
      );

      scrollTl.fromTo(
        rightCard,
        { x: 0, opacity: 1 },
        { x: '18vw', opacity: 0, ease: 'power2.in' },
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
      id="section-3"
      className="stage bg-cream relative overflow-hidden"
      style={{ zIndex: 102 }}
    >
      {/* Top micro label */}
      <p
        ref={topLabelRef}
        className="micro-label absolute text-text-secondary"
        style={{ left: '50%', top: '7vh', transform: 'translateX(-50%)' }}
      >
        STYLE RANGE
      </p>

      {/* Headline */}
      <h2
        ref={headlineRef}
        className="font-display font-bold text-text-primary uppercase text-center"
        style={{
          left: '50%',
          top: '14vh',
          position: 'absolute',
          transform: 'translateX(-50%)',
          fontSize: 'clamp(34px, 4.2vw, 64px)',
          letterSpacing: '-0.02em',
        }}
      >
        See what's possible.
      </h2>

      {/* Left card */}
      <div
        ref={leftCardRef}
        className="image-card absolute"
        style={{
          left: '7vw',
          top: '56%',
          transform: 'translateY(-50%)',
          width: '26vw',
          height: '30vw',
          maxWidth: '390px',
          maxHeight: '450px',
        }}
      >
        <img
          src="/images/range_left_bedroom.jpg"
          alt="Minimal bedroom"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Center card (dominant) */}
      <div
        ref={centerCardRef}
        className="image-card absolute"
        style={{
          left: '50%',
          top: '56%',
          transform: 'translate(-50%, -50%)',
          width: '34vw',
          height: '30vw',
          maxWidth: '510px',
          maxHeight: '450px',
          zIndex: 4,
        }}
      >
        <img
          src="/images/range_center_living.jpg"
          alt="Bright living room"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Right card */}
      <div
        ref={rightCardRef}
        className="image-card absolute"
        style={{
          right: '7vw',
          top: '56%',
          transform: 'translateY(-50%)',
          width: '26vw',
          height: '30vw',
          maxWidth: '390px',
          maxHeight: '450px',
        }}
      >
        <img
          src="/images/range_right_dining.jpg"
          alt="Dining area"
          className="w-full h-full object-cover"
        />
      </div>

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
        From quiet minimal to richly layered—without losing the room.
      </p>
    </section>
  );
}
