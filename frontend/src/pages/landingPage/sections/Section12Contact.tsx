import { useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function Section12Contact() {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const content = contentRef.current;

    if (!section || !content) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        content,
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    }, section);

    return () => ctx.revert();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Thank you for your message! We will get back to you soon.');
    setFormData({ name: '', email: '', message: '' });
  };

  return (
    <section
      ref={sectionRef}
      id="section-12"
      className="bg-cream relative"
      style={{
        padding: '12vh 0 8vh',
        zIndex: 111,
      }}
    >
      <div ref={contentRef} className="px-[5vw] max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
          {/* Left column */}
          <div>
            <h2
              className="font-display font-bold text-text-primary uppercase leading-tight"
              style={{
                fontSize: 'clamp(34px, 4.2vw, 64px)',
                letterSpacing: '-0.02em',
              }}
            >
              Let's build your next space.
            </h2>
            <p
              className="font-body text-text-secondary mt-6 leading-relaxed"
              style={{ fontSize: 'clamp(14px, 1.15vw, 18px)' }}
            >
              Tell us what you're designing. We'll reply with next steps and early access options.
            </p>
            <a
              href="mailto:hello@intelliroom.studio"
              className="inline-block font-mono text-sm text-text-primary mt-8 hover:text-text-secondary transition-colors underline underline-offset-4"
            >
              hello@intelliroom.studio
            </a>

            {/* Footer links */}
            <div className="flex flex-wrap gap-6 mt-16">
              {['Product', 'Gallery', 'About', 'Privacy', 'Terms'].map((link) => (
                <button
                  key={link}
                  className="font-body text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  {link}
                </button>
              ))}
            </div>
          </div>

          {/* Right column - Form */}
          <div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="micro-label text-text-secondary block mb-2">
                  NAME
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-transparent border-b border-text-secondary/30 py-3 font-body text-text-primary focus:outline-none focus:border-text-primary transition-colors"
                  placeholder="Your name"
                  required
                />
              </div>
              <div>
                <label className="micro-label text-text-secondary block mb-2">
                  EMAIL
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-transparent border-b border-text-secondary/30 py-3 font-body text-text-primary focus:outline-none focus:border-text-primary transition-colors"
                  placeholder="your@email.com"
                  required
                />
              </div>
              <div>
                <label className="micro-label text-text-secondary block mb-2">
                  MESSAGE
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={4}
                  className="w-full bg-transparent border-b border-text-secondary/30 py-3 font-body text-text-primary focus:outline-none focus:border-text-primary transition-colors resize-none"
                  placeholder="Tell us about your project..."
                  required
                />
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-4">
                <button
                  type="submit"
                  className="font-mono text-xs uppercase tracking-widest text-cream bg-text-primary px-8 py-3.5 rounded-full hover:bg-espresso transition-all duration-300"
                >
                  Send message
                </button>
                <button
                  type="button"
                  className="font-body text-sm text-text-secondary hover:text-text-primary transition-colors underline underline-offset-4"
                >
                  Download overview (PDF)
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-20 pt-8 border-t border-text-secondary/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-display text-lg font-bold text-text-primary">
            IntelliRoom
          </p>
          <p className="font-body text-sm text-text-secondary">
            © 2026 IntelliRoom. All rights reserved.
          </p>
        </div>
      </div>
    </section>
  );
}
