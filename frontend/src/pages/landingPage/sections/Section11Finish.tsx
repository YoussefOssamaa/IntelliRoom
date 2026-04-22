import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function Section11Finish() {
  const sectionRef = useRef<HTMLElement>(null);
  const largeLeftRef = useRef<HTMLDivElement>(null);
  const topCenterRef = useRef<HTMLDivElement>(null);
  const topRightRef = useRef<HTMLDivElement>(null);
  const bottomCenterRef = useRef<HTMLDivElement>(null);
  const bottomRightRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const topLabelRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const largeLeft = largeLeftRef.current;
    const topCenter = topCenterRef.current;
    const topRight = topRightRef.current;
    const bottomCenter = bottomCenterRef.current;
    const bottomRight = bottomRightRef.current;
    const headline = headlineRef.current;
    const topLabel = topLabelRef.current;
    const cta = ctaRef.current;

    if (!section || !largeLeft || !topCenter || !topRight || !bottomCenter || !bottomRight || !headline || !topLabel || !cta) return;

    const ctx = gsap.context(() => {
      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: '+=200%',
          pin: true,
          scrub: 0.6,
        },
      });

      // ENTRANCE (0-30%)
      scrollTl.fromTo(
        largeLeft,
        { x: '-60vw', opacity: 0 },
        { x: 0, opacity: 1, ease: 'none' },
        0
      );

      scrollTl.fromTo(
        topCenter,
        { y: '-40vh', opacity: 0 },
        { y: 0, opacity: 1, ease: 'none' },
        0.05
      );

      scrollTl.fromTo(
        topRight,
        { x: '40vw', y: '-20vh', opacity: 0 },
        { x: 0, y: 0, opacity: 1, ease: 'none' },
        0.08
      );

      scrollTl.fromTo(
        bottomCenter,
        { y: '40vh', opacity: 0 },
        { y: 0, opacity: 1, ease: 'none' },
        0.1
      );

      scrollTl.fromTo(
        bottomRight,
        { x: '40vw', y: '20vh', opacity: 0 },
        { x: 0, y: 0, opacity: 1, ease: 'none' },
        0.12
      );

      scrollTl.fromTo(
        [headline, topLabel],
        { y: -30, opacity: 0 },
        { y: 0, opacity: 1, ease: 'none' },
        0.02
      );

      scrollTl.fromTo(
        cta,
        { y: 40, opacity: 0, scale: 0.98 },
        { y: 0, opacity: 1, scale: 1, ease: 'none' },
        0.18
      );

      // EXIT (70-100%)
      scrollTl.fromTo(
        [largeLeft, topCenter, topRight, bottomCenter, bottomRight],
        { opacity: 1 },
        { opacity: 0, ease: 'power2.in' },
        0.7
      );

      scrollTl.fromTo(
        [headline, topLabel],
        { opacity: 1 },
        { opacity: 0, ease: 'power2.in' },
        0.7
      );

      scrollTl.fromTo(
        cta,
        { opacity: 1 },
        { opacity: 0, ease: 'power2.in' },
        0.75
      );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="section-11"
      className="stage bg-cream relative overflow-hidden"
      style={{ zIndex: 110 }}
    >
      {/* Top micro label */}
      <p
        ref={topLabelRef}
        className="micro-label absolute text-text-secondary"
        style={{ left: '50%', top: '10vh', transform: 'translateX(-50%)' }}
      >
        FINISH YOUR VISION
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
        Details that complete the room.
      </h2>

      {/* 5-image collage */}
      {/* Large left */}
      <div
        ref={largeLeftRef}
        className="image-card absolute"
        style={{
          left: '8vw',
          top: '62%',
          transform: 'translateY(-50%)',
          width: '44vw',
          height: '28vw',
          maxWidth: '660px',
          maxHeight: '420px',
        }}
      >
        <img
          src="/images/final_1.jpg"
          alt="Living room with shelving"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Top center */}
      <div
        ref={topCenterRef}
        className="image-card absolute"
        style={{
          left: '58vw',
          top: '40%',
          transform: 'translateY(-50%)',
          width: '18vw',
          height: '18vw',
          maxWidth: '270px',
          maxHeight: '270px',
        }}
      >
        <img
          src="/images/final_2.jpg"
          alt="Plant and ceramic detail"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Top right */}
      <div
        ref={topRightRef}
        className="image-card absolute"
        style={{
          left: '82vw',
          top: '40%',
          transform: 'translate(-100%, -50%)',
          width: '18vw',
          height: '18vw',
          maxWidth: '270px',
          maxHeight: '270px',
        }}
      >
        <img
          src="/images/final_3.jpg"
          alt="Lamp detail"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Bottom center */}
      <div
        ref={bottomCenterRef}
        className="image-card absolute"
        style={{
          left: '58vw',
          top: '72%',
          transform: 'translateY(-50%)',
          width: '18vw',
          height: '18vw',
          maxWidth: '270px',
          maxHeight: '270px',
        }}
      >
        <img
          src="/images/final_4.jpg"
          alt="Rug texture"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Bottom right */}
      <div
        ref={bottomRightRef}
        className="image-card absolute"
        style={{
          left: '82vw',
          top: '72%',
          transform: 'translate(-100%, -50%)',
          width: '18vw',
          height: '18vw',
          maxWidth: '270px',
          maxHeight: '270px',
        }}
      >
        <img
          src="/images/final_5.jpg"
          alt="Cushions detail"
          className="w-full h-full object-cover"
        />
      </div>

      {/* CTA */}
      <div
        ref={ctaRef}
        className="absolute flex flex-col items-center gap-3"
        style={{
          left: '50%',
          bottom: '6vh',
          transform: 'translateX(-50%)',
          zIndex: 5,
        }}
      >
        <button className="font-mono text-xs uppercase tracking-widest text-cream bg-text-primary px-8 py-3.5 rounded-full hover:bg-espresso transition-all duration-300">
          Start designing
        </button>
        <button className="font-body text-sm text-text-secondary hover:text-text-primary transition-colors underline underline-offset-4">
          View pricing
        </button>
      </div>
    </section>
  );
}
