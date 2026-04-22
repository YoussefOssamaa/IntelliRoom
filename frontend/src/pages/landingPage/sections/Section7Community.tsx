import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function Section7Community() {
  const sectionRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const tlCardRef = useRef<HTMLDivElement>(null);
  const blCardRef = useRef<HTMLDivElement>(null);
  const trCardRef = useRef<HTMLDivElement>(null);
  const brCardRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const headline = headlineRef.current;
    const tlCard = tlCardRef.current;
    const blCard = blCardRef.current;
    const trCard = trCardRef.current;
    const brCard = brCardRef.current;
    const caption = captionRef.current;

    if (!section || !headline || !tlCard || !blCard || !trCard || !brCard || !caption) return;

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
        { scale: 0.92, opacity: 0, y: '6vh' },
        { scale: 1, opacity: 1, y: 0, ease: 'none' },
        0
      );

      scrollTl.fromTo(
        tlCard,
        { x: '-40vw', opacity: 0 },
        { x: 0, opacity: 1, ease: 'none' },
        0
      );

      scrollTl.fromTo(
        blCard,
        { x: '-40vw', y: '20vh', opacity: 0 },
        { x: 0, y: 0, opacity: 1, ease: 'none' },
        0.05
      );

      scrollTl.fromTo(
        trCard,
        { x: '40vw', opacity: 0 },
        { x: 0, opacity: 1, ease: 'none' },
        0.08
      );

      scrollTl.fromTo(
        brCard,
        { x: '40vw', y: '-20vh', opacity: 0 },
        { x: 0, y: 0, opacity: 1, ease: 'none' },
        0.1
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
        { opacity: 1 },
        { opacity: 0, ease: 'power2.in' },
        0.7
      );

      scrollTl.fromTo(
        tlCard,
        { x: 0, opacity: 1 },
        { x: '-14vw', opacity: 0, ease: 'power2.in' },
        0.7
      );

      scrollTl.fromTo(
        blCard,
        { x: 0, opacity: 1 },
        { x: '-14vw', opacity: 0, ease: 'power2.in' },
        0.72
      );

      scrollTl.fromTo(
        trCard,
        { x: 0, opacity: 1 },
        { x: '14vw', opacity: 0, ease: 'power2.in' },
        0.74
      );

      scrollTl.fromTo(
        brCard,
        { x: 0, opacity: 1 },
        { x: '14vw', opacity: 0, ease: 'power2.in' },
        0.76
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
      id="section-7"
      className="stage bg-cream relative overflow-hidden"
      style={{ zIndex: 106 }}
    >
      {/* Collage images */}
      {/* Top-left card */}
      <div
        ref={tlCardRef}
        className="image-card absolute"
        style={{
          left: '6vw',
          top: '18vh',
          width: '22vw',
          height: '18vw',
          maxWidth: '330px',
          maxHeight: '270px',
        }}
      >
        <img
          src="/images/community_1.jpg"
          alt="Reading corner"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Bottom-left card */}
      <div
        ref={blCardRef}
        className="image-card absolute"
        style={{
          left: '6vw',
          top: '60vh',
          width: '22vw',
          height: '18vw',
          maxWidth: '330px',
          maxHeight: '270px',
        }}
      >
        <img
          src="/images/community_2.jpg"
          alt="Bedroom corner"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Top-right card */}
      <div
        ref={trCardRef}
        className="image-card absolute"
        style={{
          right: '6vw',
          top: '18vh',
          width: '22vw',
          height: '18vw',
          maxWidth: '330px',
          maxHeight: '270px',
        }}
      >
        <img
          src="/images/community_3.jpg"
          alt="Modern hallway"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Bottom-right card */}
      <div
        ref={brCardRef}
        className="image-card absolute"
        style={{
          right: '6vw',
          top: '60vh',
          width: '22vw',
          height: '18vw',
          maxWidth: '330px',
          maxHeight: '270px',
        }}
      >
        <img
          src="/images/community_4.jpg"
          alt="Kitchen nook"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Headline overlay (center) */}
      <h2
        ref={headlineRef}
        className="font-display font-bold text-text-primary uppercase text-center absolute"
        style={{
          left: '50%',
          top: '52%',
          transform: 'translate(-50%, -50%)',
          fontSize: 'clamp(34px, 4.2vw, 64px)',
          letterSpacing: '-0.02em',
          zIndex: 5,
        }}
      >
        Community favorites.
      </h2>

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
        Browse top-voted redesigns and save the ones that match your taste.
      </p>
    </section>
  );
}
