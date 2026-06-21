import React from "react";
import { useNavigate } from "react-router-dom";
import { aesthetics } from "./aestheticData";

const AestheticBento = () => {
  const navigate = useNavigate();

  const handleNavigation = (tag) => {
    navigate(`/ecomm/aesthetic/${tag}`);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="mb-8">
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          Shop by Aesthetic
        </h2>
        <p className="mt-2 text-lg text-gray-500">
          Find furniture that perfectly matches your AI-generated room vibe.
        </p>
      </div>

      {/* 4-Column, 3-Row Grid Architecture */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-[250px]">
        {aesthetics.map((style, index) => {
          // Dynamic classes to create the asymmetric Bento shape
          let gridClasses = "";
          if (index === 0) gridClasses = "md:col-span-2 md:row-span-2"; // Hero (Japandi)
          else if (index === 1) gridClasses = "md:col-span-2 md:row-span-1"; // Wide (Mid-Century)
          else if (index === 4) gridClasses = "md:col-span-2 md:row-span-1"; // Wide Bottom (Farmhouse)
          else gridClasses = "md:col-span-1 md:row-span-1"; // Squares (Industrial, Boho, Cyberpunk)

          return (
            <div
              key={style.id}
              onClick={() => handleNavigation(style.tag)}
              className={`group relative overflow-hidden rounded-2xl cursor-pointer ${gridClasses}`}
            >
              {/* Background Image */}
              <img
                src={style.image}
                alt={style.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              
              {/* Gradient Overlay for text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-300"></div>

              {/* Text Content */}
              <div className="absolute inset-0 p-6 flex flex-col justify-end">
                <span className="text-sm font-bold tracking-wider text-sky-400 uppercase mb-1 opacity-0 transform translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                  {style.subtitle}
                </span>
                <h3 className="text-2xl font-bold text-white mb-2">
                  {style.title}
                </h3>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AestheticBento;