import React, { useState, useRef, useEffect } from "react";

const ProjectCard = ({ project, onCardClick, onToggleFavorite }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Fallbacks in case the database doesn't have these fields yet
  const status = project.status || "Draft";
  const type = project.type || "3D";
  
  // Format the date 
  const formattedDate = project.createdAt 
    ? new Date(project.createdAt).toLocaleDateString() 
    : "Just now";

  // --- Click-Away Listener for the Dropdown ---
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- UI Helpers for Badges ---
  const getStatusColor = (status) => {
    switch (status) {
      case "Completed":
      case "Finished": return "bg-green-100 text-green-700 border-green-200";
      case "Rendering":
      case "Working": return "bg-sky-100 text-sky-700 border-sky-200";
      case "Draft": return "bg-gray-100 text-gray-700 border-gray-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getTypeColor = (type) => {
    return type === "3D"
      ? "bg-purple-100 text-purple-700 border-purple-200"
      : "bg-indigo-100 text-indigo-700 border-indigo-200";
  };

  // --- Handlers ---
  const handleMenuClick = (e) => {
    e.stopPropagation(); // Prevents the card from navigating
    setIsMenuOpen(!isMenuOpen);
  };

  const handleAction = (e, action) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    console.log(`Triggered ${action} on project ${project._id}`);
    // You can pass these up to the parent later (e.g., onDelete(project._id))
  };

  return (
    <div
      onClick={onCardClick}
      className="group bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-xl hover:border-sky-200 transition-all cursor-pointer flex flex-col h-full relative"
    >
      {/* 1. Thumbnail Area */}
      <div className="h-44 w-full bg-gray-100 relative overflow-hidden flex-shrink-0">
        <img
          src={project.generatedImageUrl || project.thumbnail}
          alt={project.inputPrompt || "Project Design"}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        
        {/* Floating Type Badge */}
        <div className="absolute top-3 left-3">
          <span className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-md border shadow-sm backdrop-blur-sm bg-opacity-90 ${getTypeColor(type)}`}>
            {type}
          </span>
        </div>

        {/* Favorite Button Overlay */}
        <button
          onClick={(e) => onToggleFavorite(e, project)}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-white/80 hover:bg-white backdrop-blur-sm shadow-sm transition-all focus:outline-none z-10"
          title={project.isFavorite ? "Remove favorite" : "Add favorite"}
        >
          <IconStar isFavorite={project.isFavorite} />
        </button>
      </div>

      {/* 2. Details Area */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-lg font-bold text-gray-900 group-hover:text-sky-600 transition-colors mb-1 truncate" title={project.inputPrompt}>
          {project.inputPrompt || project.name || "Custom Design"}
        </h3>
        
        <p className="text-sm text-gray-500 mb-4 flex items-center gap-1.5">
          <IconClock />
          {formattedDate}
        </p>

        {/* 3. Footer (Pushed to bottom) */}
        <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between relative">
          
          {/* Status Badge */}
          <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${getStatusColor(status)}`}>
            {status}
          </span>

          {/* Three-Dot Menu Wrapper */}
          <div ref={menuRef} className="relative z-20">
            <button
              onClick={handleMenuClick}
              className="text-gray-400 hover:text-gray-900 p-1.5 rounded-full hover:bg-gray-100 transition-colors focus:outline-none"
            >
              <IconDots />
            </button>

            {/* The Dropdown Panel */}
            {isMenuOpen && (
              <div className="absolute right-0 bottom-full mb-2 w-40 bg-white rounded-xl shadow-lg border border-gray-100 py-1 overflow-hidden transform origin-bottom-right transition-all animate-in fade-in zoom-in duration-200">
                <button
                  onClick={(e) => handleAction(e, "rename")}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-sky-600 flex items-center gap-2"
                >
                  <IconEdit /> Rename
                </button>
                <button
                  onClick={(e) => handleAction(e, "duplicate")}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-sky-600 flex items-center gap-2"
                >
                  <IconCopy /> Duplicate
                </button>
                <div className="h-px bg-gray-100 my-1"></div>
                <button
                  onClick={(e) => handleAction(e, "delete")}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                >
                  <IconTrash /> Delete
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

// --- Embedded SVG Icons ---
const IconStar = ({ isFavorite }) => (
  <svg className={`w-5 h-5 transition-all duration-300 ${isFavorite ? "text-yellow-400 fill-current scale-110" : "text-gray-400 fill-transparent hover:text-yellow-400 hover:scale-110"}`} stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>
  </svg>
);
const IconClock = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
);
const IconDots = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
);
const IconEdit = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
);
const IconCopy = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
);
const IconTrash = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
);

export default ProjectCard;