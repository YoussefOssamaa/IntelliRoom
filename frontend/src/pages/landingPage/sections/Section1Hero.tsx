import React from 'react';
import { Camera, PencilLine, ArrowRight } from 'lucide-react';

const SelectionPage = () => {
  return (
    <div className="relative min-h-screen w-full bg-espresso flex flex-col md:flex-row overflow-hidden">

      {/* OPTION 1: UPLOAD WORKFLOW */}
      <div className="group relative w-full md:w-1/2 h-[50vh] md:h-screen overflow-hidden border-b md:border-b-0 md:border-r border-cream/10">
        {/* Background Image with Hover Zoom */}
        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-500" />

        {/* Content */}
        <div className="relative h-full flex flex-col items-center justify-center text-center p-8">
          <span className="font-display text-3xl md:text-5xl font-bold text-white uppercase tracking-tighter mb-6">
            - The Visionary -
          </span>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-white uppercase tracking-tighter mb-6">
            Upload Your Space
          </h2>
          <p className="max-w-md text-cream/80 font-body mb-8">
            Already have a room? Upload a photo and let our AI reimagine the possibilities instantly.
          </p>

          <button className="flex items-center gap-3 bg-cream text-espresso px-8 py-4 rounded-full font-mono text-sm uppercase tracking-widest hover:bg-white transition-all transform hover:-translate-y-1">
            <Camera size={18} />
            Start with Photo
          </button>
        </div>
      </div>

      {/* OPTION 2: 2D TO 3D WORKFLOW */}
      <div className="group relative w-full md:w-1/2 h-[50vh] md:h-screen overflow-hidden">
        {/* Background Image with Hover Zoom */}
        <div className="absolute inset-0 bg-black/50 group-hover:bg-black/30 transition-colors duration-500" />

        {/* Content */}
        <div className="relative h-full flex flex-col items-center justify-center text-center p-8">
          <span className="font-display text-3xl md:text-5xl font-bold text-white uppercase tracking-tighter mb-6">
            - The Architect -
          </span>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-white uppercase tracking-tighter mb-6">
            Design from Scratch
          </h2>
          <p className="max-w-md text-cream/80 font-body mb-8">
            Start with a blank canvas. Draft a 2D floor plan and watch it evolve into a high-fidelity 3D render.
          </p>

          <button className="flex items-center gap-3 border border-cream text-cream px-8 py-4 rounded-full font-mono text-sm uppercase tracking-widest hover:bg-cream hover:text-espresso transition-all transform hover:-translate-y-1">
            <PencilLine size={18} />
            Begin Drafting
          </button>
        </div>
      </div>

      {/* CENTRAL LOGO / OR DIVIDER */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:block z-10">
        <div className="bg-espresso border border-cream/20 w-16 h-16 rounded-full flex items-center justify-center shadow-2xl">
          <span className="text-cream font-display font-bold text-xl">VS</span>
        </div>
      </div>
    </div>
  );
};

export default SelectionPage;