import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";

const ShopByRoom = () => {
  const navigate = useNavigate();

  const sliderRef = useRef(null);

  const slide = (direction) => {
    if (sliderRef.current) {
      const slideAmount = sliderRef.current.clientWidth;
      sliderRef.current.scrollBy({
        left: direction === "left" ? -slideAmount : slideAmount,
        behavior: "smooth",
      });
    }
  };

  // 3. The Room Data
  const rooms = [
    {
      id: "living-room",
      name: "Living Room",
      description:
        "The heart of your home. Find sofas, coffee tables, and statement rugs.",
      image:
        "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=1200&q=80",
    },
    {
      id: "bedroom",
      name: "Bedroom",
      description:
        "Your personal sanctuary. Discover beds, nightstands, and calming lighting.",
      image:
        "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=1200&q=80",
    },
    {
      id: "kitchen",
      name: "Kitchen & Dining",
      description:
        "Where flavors meet. Shop dining tables, bar stools, and modern fixtures.",
      image:
        "https://images.unsplash.com/photo-1617228069096-4638a7ffc906?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8a2l0Y2hlbnxlbnwwfHwwfHx8MA%3D%3D",
    },
    {
      id: "Bathroom",
      name: "Bathroom",
      description:
        "Where flavors meet. Shop dining tables, bar stools, and modern fixtures.",
      image:
        "https://images.unsplash.com/photo-1620626011761-996317b8d101??auto=format&fit=crop&w=1200&q=80",
    },
    {
      id: "Children's room",
      name: "Children's room",
      description:
        "Where flavors meet. Shop dining tables, bar stools, and modern fixtures.",
      image:
        "https://plus.unsplash.com/premium_photo-1685235226830-195c9ea49d5e?auto=format&fit=crop&w=1200&q=80",
    },
    {
      id: "home-office",
      name: "Home Office",
      description:
        "Focus and create. Elevate your workspace with ergonomic desks and chairs.",
      image:
        "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80",
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* Header & Controls */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Shop by Room
          </h2>
          <p className="mt-2 text-lg text-gray-500">
            Curated collections for every space.
          </p>
        </div>

        {/* Custom Left/Right Navigation Buttons */}
        <div className="hidden md:flex space-x-3">
          <button
            onClick={() => slide("left")}
            className="p-3 rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-sky-50 hover:text-sky-500 hover:border-sky-200 transition-all shadow-sm"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 19l-7-7 7-7"
              ></path>
            </svg>
          </button>
          <button
            onClick={() => slide("right")}
            className="p-3 rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-sky-50 hover:text-sky-500 hover:border-sky-200 transition-all shadow-sm"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 5l7 7-7 7"
              ></path>
            </svg>
          </button>
        </div>
      </div>

      {/*  The Slider Container */}
      <div
        ref={sliderRef}
        className="flex gap-6 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-8"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {rooms.map((room) => (
          <div
            key={room.id}
            className="relative min-w-full md:min-w-[calc(100%-2rem)] lg:min-w-[calc(80%)] aspect-[4/3] md:aspect-[21/9] rounded-3xl overflow-hidden snap-center group cursor-pointer shadow-lg"
            onClick={() => navigate(`/marketplace/room/${room.id}`)} // Redirects to your future filtered page
          >
            {/* 1. The Image */}
            <img
              src={room.image}
              alt={room.name}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out !rounded-none"
              style={{ borderRadius: "0px", clipPath: "none" }}
            />

            {/* 2. The Dark Gradient Overlay (So white text is readable) */}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/20 to-transparent"></div>

            {/* 3. The Text Content (Positioned at the bottom) */}
            <div className="absolute bottom-0 left-0 p-8 md:p-12 w-full">
              <h3 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight mb-3 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                {room.name}
              </h3>
              <p className="text-lg text-gray-200 max-w-xl opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500 delay-75">
                {room.description}
              </p>

              {/* Subtle 'Explore' indicator */}
              <div className="mt-6 flex items-center text-sky-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-150">
                Explore Collection
                <svg
                  className="w-5 h-5 ml-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  ></path>
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ShopByRoom;
