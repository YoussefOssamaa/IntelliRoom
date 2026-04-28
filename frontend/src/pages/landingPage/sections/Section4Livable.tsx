import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function Section4Livable() {
  const sectionRef = useRef<HTMLElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const topLabelRef = useRef<HTMLParagraphElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const image = imageRef.current;
    const text = textRef.current;
    const topLabel = topLabelRef.current;
    const caption = captionRef.current;

    if (!section || !image || !text || !topLabel || !caption) return;

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
        { x: '-60vw', opacity: 0, rotateY: -8 },
        { x: 0, opacity: 1, rotateY: 0, ease: 'none' },
        0
      );

      scrollTl.fromTo(
        text,
        { x: '30vw', opacity: 0 },
        { x: 0, opacity: 1, ease: 'none' },
        0.08
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
        { y: 0, opacity: 1, ease: 'none' },
        0.12
      );

      // EXIT (70-100%)
      scrollTl.fromTo(
        image,
        { x: 0, opacity: 1 },
        { x: '-20vw', opacity: 0, ease: 'power2.in' },
        0.7
      );

      scrollTl.fromTo(
        text,
        { x: 0, opacity: 1 },
        { x: '12vw', opacity: 0, ease: 'power2.in' },
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
      id="section-4"
      className="stage bg-cream relative overflow-hidden"
      style={{ zIndex: 103 }}
    >
      {/* Top micro label */}
      <p
        ref={topLabelRef}
        className="micro-label absolute text-text-secondary"
        style={{ left: '50%', top: '10vh', transform: 'translateX(-50%)' }}
      >
        LIVABLE OUTPUT
      </p>

      {/* Left image card */}
      <div
        ref={imageRef}
        className="image-card absolute"
        style={{
          left: '8vw',
          top: '54%',
          transform: 'translateY(-50%)',
          width: '54vw',
          height: '34vw',
          maxWidth: '810px',
          maxHeight: '510px',
          perspective: '1000px',
        }}
      >
        <img
          src="/images/livable_sofa_scene.jpg"
          alt="Modern living room with sculptural sofa"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Right text block */}
      <div
        ref={textRef}
        className="absolute"
        style={{
          left: '70vw',
          top: '54%',
          transform: 'translateY(-50%)',
          width: '22vw',
          maxWidth: '320px',
        }}
      >
        <h2
          className="font-display font-bold text-text-primary uppercase leading-tight"
          style={{
            fontSize: 'clamp(28px, 3.2vw, 48px)',
            letterSpacing: '-0.02em',
          }}
        >
          Beautiful, not overdone.
        </h2>
        <p
          className="font-body text-text-secondary mt-6 leading-relaxed"
          style={{ fontSize: 'clamp(13px, 1vw, 16px)' }}
        >
          IntelliRoom keeps ceilings, floors, and proportions intact—so the design feels like a renovation, not a render.
        </p>
        <button className="font-mono text-xs uppercase tracking-widest text-text-primary border border-text-primary px-5 py-2.5 rounded-full mt-8 hover:bg-text-primary hover:text-cream transition-all duration-300">
          View the guidelines
        </button>
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
        Generated layouts that respect real-world scale.
      </p>
    </section>
  );
}
