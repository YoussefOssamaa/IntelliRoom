import React, { useState, useEffect } from "react";
import axios from "../../config/axios.config";
import { useNavigate } from "react-router-dom";
import "./DashboardPage.css";
import Header from "./Header";
import Bohemian from "./Bohemian.jpg";
import Navigation from "../../components/common/Navigation";
import { useAuth } from "../../utils/authContext";


export default function DashboardPage() {
  const navigate = useNavigate();

  // User State
  const [isUserLoading, setIsUserLoading] = useState(true);


  const { isLoggedIn, user, logout } = useAuth();


  // Projects State
  const [isProjectsLoading, setIsProjectsLoading] = useState(true);
  const [projects, setProjects] = useState([]);



  // Fetch Generated Images
  useEffect(() => {
    const fetchProjectsData = async () => {
      try {
        // delay removed
        const response = await axios.get("/generatedImage", {
          withCredentials: true,
        });
        if (response.data) {
          setProjects(response.data);
        }
      } catch (error) {
        console.error("Error fetching projects data:", error);
      } finally {
        setIsProjectsLoading(false);
      }
    };
    fetchProjectsData();
  }, []);

  //user can add and remove projects from favorite list
  const handleToggleFavorite = async (e, project) => {
    e.stopPropagation(); // Prevents the card from navigating to the project page

    const newFavoriteStatus = !project.isFavorite;

    //change the star locally
    setProjects((prevProjects) =>
      prevProjects.map((p) =>
        p._id === project._id ? { ...p, isFavorite: newFavoriteStatus } : p,
      ),
    );

    try {
      //Send the update to the database
      await axios.put(
        `/generatedImage/${project._id}`,
        {
          ...project, // Keep the existing image URLs and prompts safe
          isFavorite: newFavoriteStatus,
        },
        { withCredentials: true },
      );
    } catch (error) {
      console.error("Failed to update favorite status:", error);
      //If the backend fails, revert the star back to its original state
      setProjects((prevProjects) =>
        prevProjects.map((p) =>
          p._id === project._id ? { ...p, isFavorite: project.isFavorite } : p,
        ),
      );
    }
  };

  const getStatusClass = (status) => {
    if (status === "Completed") return "status-completed";
    if (status === "Rendering") return "status-rendering";
    return "status-draft";
  };


  return (
    <>
      <div>
        <Navigation user />
      </div>

      <div
        className="dashboard-layout pt-20 "  >
        <div className="content-wrapper">
          {/* SIDEBAR NAVIGATION */}
          <aside className="sidebar">
            <ul className="nav-list">
              <li className="nav-item active">
                <IconDashboard />
                <span>Overview</span>
              </li>
              <li onClick={() => navigate("/projects")} className="nav-item">
                <IconFolder />
                <span>My Projects</span>
              </li>
              <li onClick={() => navigate("/ecomm")} className="nav-item">
                <IconCart />
                <span>Store</span>
              </li>
              <div className="nav-divider"></div>
              <li onClick={() => navigate("/updateProfile")} className="nav-item">
                <IconPerson />
                <span>Profile Settings</span>
              </li>
            </ul>
          </aside>

          {/* MAIN CONTENT AREA */}
          <main className="main-area">

            {/* Welcome Section */}
            <div className="welcome-section">
              <div>
                {/* 🚀 APP SHELL: Welcome Skeletons */}

                <>
                  <h1 className="welcome-title">Hello, {user.firstName || "user"}</h1>
                  <p className="welcome-subtitle">Here is what's happening with your designs today.</p>
                </>

              </div>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
              {/* 🚀 APP SHELL: Stat Card Skeletons */}

              <>


                {/* Credits Card */}
                <div className="stat-card">
                  <span className="stat-label">Credit Balance</span>
                  <div className="stat-value text-green-700">{user.credits}</div>
                  <p className="text-sm text-gray-600 mt-2">Available for plugin purchases</p>
                  <button className="btn-text !px-0 mt-4 w-fit text-sm">Get More Credits</button>
                </div>



                <div className="stat-card">
                  {/* Container Heading */}
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-4">
                    Create New Project
                  </h2>

                  {/* Grid wrapper matching standard dashboard spacing */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Option 1: AI Studio */}
                    <div className="stat-card">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="stat-label">AI Generation</span>
                          <h2 className="text-xl font-bold">AI Studio</h2>
                        </div>
                        {/* Kept your exact wrapper class layout naming */}
                        <div className="marketplace-icon-wrapper">
                          <IconAIStudio />
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 my-4">
                        Generate instant concepts, styles, and interior variations using advanced AI guidance.
                      </p>
                      <button
                        onClick={() => navigate('/create/ai-studio')}
                        className="btn-secondary w-full sm:w-auto"
                      >
                        Launch Studio
                      </button>
                    </div>

                    {/* Option 2: Architect Mode */}
                    <div className="stat-card">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="stat-label">Precision Layout</span>
                          <h2 className="text-xl font-bold">Architect Mode</h2>
                        </div>
                        <div className="marketplace-icon-wrapper">
                          <IconBlueprint />
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 my-4">
                        Build structural floor plans, exact measurements, and professional blueprints from scratch.
                      </p>
                      <button
                        onClick={() => navigate('/create/architect')}
                        className="btn-secondary w-full sm:w-auto"
                      >
                        Start Building
                      </button>
                    </div>

                  </div>
                </div>



                {/* Marketplace Card */}
                <div className="stat-card">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="stat-label">Marketplace</span>
                      <h2 className="text-xl font-bold">Explore</h2>
                    </div>
                    <div className="marketplace-icon-wrapper">
                      <IconStore />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 my-4">Discover new designs, styles, and furnitures for your designs.</p>
                  <button onClick={() => navigate('/ecomm')} className="btn-secondary">Browse</button>
                </div>






              </>
            </div>

            {/* Recent Projects Section */}
            <div className="section-wrapper">
              <div className="section-header">
                <h2 className="section-title">Recent Projects</h2>
                <button
                  onClick={() => navigate("/projects")}
                  className="btn-text"
                >
                  View All Projects
                </button>
              </div>

              <div className="projects-grid">
                {/* localized Loading State */}
                {isProjectsLoading ? (
                  [1, 2, 3, 4, 5, 6].map((index) => (
                    <div
                      key={index}
                      className="project-card flex flex-col overflow-hidden bg-white shadow-sm border border-gray-100 animate-pulse"
                    >
                      {/* The Image Placeholder */}
                      <div className="h-40 w-full bg-gray-200"></div>

                      {/* The Text Info Placeholder */}
                      <div className="p-4 flex flex-col gap-3">
                        {/* Title line */}
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>

                        {/* Meta data line (Date and Star) */}
                        <div className="flex justify-between items-center mt-2">
                          <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                          <div className="w-5 h-5 bg-gray-200 rounded-full"></div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : projects.length === 0 ? (
                  <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-xl shadow-sm border border-gray-100">
                    You haven't generated any designs yet! Click "New Project" to
                    start.
                  </div>
                ) : (
                  projects.slice(0, 9).map((project) => (
                    <div
                      key={project._id}
                      className="project-card group cursor-pointer"
                      onClick={() => navigate(`/projects/${project._id}`)}
                    >
                      <div className="project-image-wrapper h-40 w-full overflow-hidden  bg-gray-100">
                        <img
                          src={project.generatedImageUrl}
                          alt={project.inputPrompt || "AI Generated Interior"}
                          className="w-full h-full object-cover !rounded-none transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                      <div className="project-info p-4">
                        <h3
                          className="project-title truncate"
                          title={project.inputPrompt}
                        >
                          {project.inputPrompt || "Custom Design"}
                        </h3>
                        <div className="project-meta flex justify-between items-center mt-2">
                          <span className="text-sm text-gray-500">
                            {new Date(project.createdAt).toLocaleDateString()}
                          </span>

                          <button
                            onClick={(e) => handleToggleFavorite(e, project)}
                            className="focus:outline-none z-10 p-1"
                            title={
                              project.isFavorite
                                ? "Remove from favorites"
                                : "Add to favorites"
                            }
                          >
                            <IconStar isFavorite={project.isFavorite} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>


          </main>
        </div>
      </div>
    </>
  );
}

// SVG Icons Component Library
const IconDashboard = () => (
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
      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
    ></path>
  </svg>
);
const IconFolder = () => (
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
      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
    ></path>
  </svg>
);
const IconFolderLarge = () => (
  <svg
    className="w-16 h-16"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
    ></path>
  </svg>
);
const IconPeople = () => (
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
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
    ></path>
  </svg>
);
const IconLightbulb = () => (
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
      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
    ></path>
  </svg>
);

const IconCart = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);


const IconPerson = () => (
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
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
    ></path>
  </svg>
);
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
const IconStore = () => (
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
      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
    ></path>
  </svg>
);
const IconArrowRight = () => (
  <svg
    className="w-4 h-4 ml-1"
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
);
const IconStar = ({ isFavorite }) => (
  <svg
    className={`w-6 h-6 transition-all duration-300 ease-in-out cursor-pointer active:scale-90 ${isFavorite
      ? "text-yellow-400 fill-current scale-110"
      : "text-gray-400 fill-transparent hover:text-yellow-400 hover:scale-110"
      }`}
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
    ></path>
  </svg>
);



const IconAIStudio = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l-.813-5.096A4 4 0 005.096 12.813L0 12l5.096-.813a4 4 0 003.091-3.091L9 3l.813 5.096a4 4 0 003.091 3.091L18 12l-5.096.813a4 4 0 00-3.091 3.091zM19.5 7.5L19 10l-.5-2.5L16 7l2.5-.5L19 4l.5 2.5L22 7l-2.5.5z" />
  </svg>
);

const IconBlueprint = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
  </svg>
);