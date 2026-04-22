import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function Section2Objects() {
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
        { x: '-60vw', opacity: 0, scale: 0.96, rotateY: -10 },
        { x: 0, opacity: 1, scale: 1, rotateY: 0, ease: 'none' },
        0
      );

      scrollTl.fromTo(
        text,
        { x: '30vw', opacity: 0 },
        { x: 0, opacity: 1, ease: 'none' },
        0.05
      );

      scrollTl.fromTo(
        topLabel,
        { y: -20, opacity: 0 },
        { y: 0, opacity: 1, ease: 'none' },
        0.05
      );

      scrollTl.fromTo(
        caption,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, ease: 'none' },
        0.1
      );

      // SETTLE (30-70%) - hold positions

      // EXIT (70-100%)
      scrollTl.fromTo(
        image,
        { x: 0, opacity: 1 },
        { x: '-22vw', opacity: 0, ease: 'power2.in' },
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
      id="section-2"
      className="stage bg-cream relative overflow-hidden"
      style={{ zIndex: 101 }}
    >

      {/* Top micro label */}
      <p
        ref={topLabelRef}
        className="micro-label absolute text-text-secondary"
        style={{ left: '50%', top: '10vh', transform: 'translateX(-50%)' }}
      >
        AI-CURATED MATERIALITY
      </p>

      {/* Left image card */}
      <div
        ref={imageRef}
        className="image-card absolute"
        style={{
          left: '8vw',
          top: '52%',
          transform: 'translateY(-50%)',
          width: '56vw',
          height: '34vw',
          maxWidth: '840px',
          maxHeight: '510px',
          perspective: '1000px',
        }}
      >
        <img
          src="/images/objects_lamp_vase.jpg"
          alt="Sculptural lamp and vase"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Right text block */}
      <div
        ref={textRef}
        className="absolute"
        style={{
          left: '70vw',
          top: '52%',
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
          Details that hold up to real life.
        </h2>
        <p
          className="font-body text-text-secondary mt-6 leading-relaxed"
          style={{ fontSize: 'clamp(13px, 1vw, 16px)' }}
        >
          IntelliRoom preserves architectural context and lets you control mood, palette, and contrast—so outputs feel physical, not artificial.
        </p>
        <button className="font-mono text-xs uppercase tracking-widest text-text-primary border border-text-primary px-5 py-2.5 rounded-full mt-8 hover:bg-text-primary hover:text-cream transition-all duration-300">
          Explore the engine
        </button>
      </div>

      {/* Bottom-left caption */}
      <p
        ref={captionRef}
        className="absolute font-body text-text-secondary"
        style={{
          left: '40vw',
          bottom: '7vh',
          maxWidth: '34vw',
          fontSize: 'clamp(13px, 1vw, 16px)',
        }}
      >
        Textures, lighting, and layout—generated to feel handmade.
      </p>
    </section>
  );
}
