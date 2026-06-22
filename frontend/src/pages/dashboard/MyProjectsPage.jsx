import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import ProjectCard from "./ProjectCard";
// --- DUMMY DATA ---
const initialProjects = [
  {
    _id: "1",
    name: "Modern Living Room Revamp",
    type: "3D",
    status: "Finished",
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), // 2 days ago
    thumbnail:
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=600&q=80",
    isFavorite: true,
  },
  {
    _id: "2",
    name: "Kitchen Floorplan Setup",
    type: "2D",
    status: "Working",
    createdAt: new Date(Date.now() - 5 * 3600000).toISOString(), // 5 hours ago
    thumbnail:
      "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=600&q=80",
    isFavorite: false,
  },
  {
    _id: "3",
    name: "Master Bedroom Ideas",
    type: "3D",
    status: "Draft",
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(), // 1 week ago
    thumbnail:
      "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=600&q=80",
    isFavorite: false,
  },
  {
    _id: "4",
    name: "Patio Layout V2",
    type: "2D",
    status: "Finished",
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(), // 1 month ago
    thumbnail:
      "https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=600&q=80",
    isFavorite: true,
  },
  {
    _id: "5",
    name: "Home Office Expansion",
    type: "3D",
    status: "Working",
    createdAt: new Date().toISOString(),
    thumbnail:
      "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=600&q=80",
    isFavorite: false,
  },
];

const MyProjectsPage = () => {
  const navigate = useNavigate();

  // --- STATE ---
  const [projects, setProjects] = useState(initialProjects);
  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  // --- FILTERING LOGIC ---
  const filteredProjects = projects.filter((project) => {
    const matchesType = filterType === "All" || project.type === filterType;
    const matchesStatus =
      filterStatus === "All" || project.status === filterStatus;
    return matchesType && matchesStatus;
  });

  // --- HANDLERS ---
  const handleToggleFavorite = (e, targetProject) => {
    e.stopPropagation();
    // Optimistically update the UI for the dummy data
    setProjects((prevProjects) =>
      prevProjects.map((p) =>
        p._id === targetProject._id ? { ...p, isFavorite: !p.isFavorite } : p,
      ),
    );
    // When connected to backend, you would make your axios.put() call here!
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
              My Projects
            </h1>
            <p className="mt-2 text-lg text-gray-500">
              Manage, edit, and view your design spaces.
            </p>
          </div>
          {/* <button
            onClick={() => navigate("/create-project")}
            className="bg-sky-500 hover:bg-sky-600 text-white px-6 py-3 rounded-xl font-bold shadow-sm transition-all flex items-center gap-2 w-fit"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 4v16m8-8H4"
              ></path>
            </svg>
            New Project
          </button> */}
          <button
            onClick={() => setIsProjectModalOpen(true)}
            className="btn-primary"
          >
            <IconAdd />
            New Project
          </button>
        </div>

        {/* FILTERING BAR */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm mb-8 flex flex-wrap gap-6 items-center">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">
              Type:
            </span>
            <div className="flex gap-2">
              {["All", "2D", "3D"].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors border ${
                    filterType === type
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="hidden md:block w-px h-8 bg-gray-200"></div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">
              Status:
            </span>
            <div className="flex flex-wrap gap-2">
              {["All", "Finished", "Working", "Draft"].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors border ${
                    filterStatus === status
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* PROJECT GRID */}
        {filteredProjects.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-gray-300">
            <svg
              className="mx-auto h-16 w-16 text-gray-300 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <h3 className="text-xl font-bold text-gray-900 mb-1">
              No projects found
            </h3>
            <p className="text-gray-500">
              Try adjusting your filters or create a new project.
            </p>
            {(filterType !== "All" || filterStatus !== "All") && (
              <button
                onClick={() => {
                  setFilterType("All");
                  setFilterStatus("All");
                }}
                className="mt-4 text-sky-500 font-semibold hover:text-sky-600"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project._id}
                project={project}
                onCardClick={() => navigate(`/projects/${project._id}`)}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        )}
      </div>
      {/* SELECTION MODAL LAYER */}
      {isProjectModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsProjectModalOpen(false)}
        >
          <div
            className="relative w-full max-w-4xl overflow-hidden bg-white rounded-2xl shadow-xl border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Create New Project
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Select the design workflow that fits your needs.
                </p>
              </div>
              <button
                onClick={() => setIsProjectModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-50"
              >
                <span className="text-xl font-semibold">&times;</span>
              </button>
            </div>

            {/* Workflow Selection Cards */}
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card 1: 2D Image Transformation */}
              <button
                onClick={() => {
                  setIsProjectModalOpen(false);
                  navigate("/upload");
                }}
                className="flex flex-col text-left p-5 rounded-xl border-2 border-gray-100 hover:border-indigo-600 hover:bg-indigo-50/30 transition-all duration-200 group"
              >
                <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z"
                    />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                  2D Style Generation
                </h4>
                <p className="text-sm text-gray-500 mt-2 flex-grow">
                  Upload an existing photo of your space and transform it
                  instantly into a brand new aesthetic layout using AI.
                </p>
              </button>

              <button
                onClick={() => {
                  setIsProjectModalOpen(false);
                  navigate("/planner");
                }}
                className="flex flex-col text-left p-5 rounded-xl border-2 border-gray-100 hover:border-emerald-600 hover:bg-emerald-50/30 transition-all duration-200 group"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-14.25v14.25"
                    />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">
                  3D Room Planner
                </h4>
                <p className="text-sm text-gray-500 mt-2 flex-grow">
                  Build a room blueprint from scratch, draw custom dimensions,
                  configure architectural details, and arrange floor layouts.
                </p>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const IconAdd = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M12 4v16m8-8H4"
    ></path>
  </svg>
);

export default MyProjectsPage;
