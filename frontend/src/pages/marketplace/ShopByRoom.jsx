import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../config/axios.config";

const ShopByRoom = () => {
  const navigate = useNavigate();
  const sliderRef = useRef(null);

  // --- State Management ---
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- Fetch Full Room Models from Database ---
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        console.log("1. Sending request to /rooms...");
        const response = await axios.get("/rooms");

        console.log("2. Raw Response received:", response.data);

        const fetchedRooms = response.data.data || response.data;

        if (Array.isArray(fetchedRooms)) {
          console.log("3. Success! Setting rooms array:", fetchedRooms);
          setRooms(fetchedRooms);
        } else {
          console.warn(
            "Uh oh, the data is NOT an array. It is:",
            typeof fetchedRooms,
          );
        }
      } catch (error) {
        console.error(
          "API Fetch Failed! Error:",
          error.response?.data || error.message,
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchRooms();
  }, []);

  const slide = (direction) => {
    if (sliderRef.current) {
      const slideAmount = sliderRef.current.clientWidth;
      sliderRef.current.scrollBy({
        left: direction === "left" ? -slideAmount : slideAmount,
        behavior: "smooth",
      });
    }
  };


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

        {/* Custom Left/Right Navigation Buttons (Hide if no rooms) */}
        {rooms.length > 0 && (
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
        )}
      </div>

      {/* The Slider Container OR Empty State */}
      {isLoading ? (
        // Loading Skeletons
        <div className="flex gap-6 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-8">
          {[1, 2, 3].map((skeleton) => (
            <div
              key={skeleton}
              className="min-w-full md:min-w-[calc(100%-2rem)] lg:min-w-[calc(80%)] aspect-[4/3] md:aspect-[21/9] rounded-3xl bg-gray-200 animate-pulse snap-center"
            ></div>
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <div className="w-full py-16 flex flex-col items-center justify-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
          <svg
            className="w-16 h-16 text-gray-300 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            ></path>
          </svg>
          <h3 className="text-xl font-bold text-gray-900">
            Collections Coming Soon
          </h3>
          <p className="text-gray-500 mt-2 text-center max-w-md">
            We are currently curating beautiful room layouts and designs. Check
            back shortly to explore our new collections!
          </p>
        </div>
      ) : (
        // Dynamic Room Rendering
        <div
          ref={sliderRef}
          className="flex gap-6 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-8"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {rooms.map((room) => {
            const imageUrl =
              !room.media?.bannerUrl ||
              room.media?.bannerUrl?.includes("via.placeholder.com")
                ? "/marketplace/defaultRoomPic.jpg"
                : room.media?.bannerUrl;

            return (
              <div
                key={room._id}
                className="relative min-w-full md:min-w-[calc(100%-2rem)] lg:min-w-[calc(80%)] aspect-[4/3] md:aspect-[21/9] rounded-3xl overflow-hidden snap-center group cursor-pointer shadow-lg"
                onClick={() => navigate(`/ecomm/room/${room.slug}`)}
              >
                <img
                  src={imageUrl}
                  alt={room.name}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out !rounded-none"
                  style={{ borderRadius: "0px", clipPath: "none" }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/20 to-transparent"></div>
                <div className="absolute bottom-0 left-0 p-8 md:p-12 w-full">
                  <h3 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight mb-3 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                    {room.name}
                  </h3>
                  <p className="text-lg text-gray-200 max-w-xl opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500 delay-75">
                    {room.description}
                  </p>
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
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ShopByRoom;
