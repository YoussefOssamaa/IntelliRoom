import React, { useState, useEffect } from "react";
import axios from "../../config/axios.config";
import { useNavigate } from "react-router-dom";
import "./DashboardPage.css";
import Header from "./Header";
import Bohemian from "./Bohemian.jpg";

export default function DashboardPage() {
  const navigate = useNavigate();

  // User State
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [userData, setUserData] = useState({
    name: "User.",
    plan: "Not available",
    designsUsed: 12, // Keeping hardcoded for now
    designsLimit: 20, // Keeping hardcoded for now
    credits: 0,
  });

  // Projects State
  const [isProjectsLoading, setIsProjectsLoading] = useState(true);
  const [projects, setProjects] = useState([]);

  // Hardcoded Styles State
  const [designStyles] = useState([
    {
      id: 1,
      name: "Minimalist Zen",
      desc: "Clean lines and calming neutrals.",
      img: "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=600&q=80",
    },
    {
      id: 2,
      name: "Industrial Loft",
      desc: "Raw brick, metal, and wood.",
      img: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=600&q=80",
    },
    {
      id: 3,
      name: "Bohemian Chic",
      desc: "Vibrant colors and organic textures.",
      img: Bohemian,
    },
    {
      id: 4,
      name: "Scandinavian",
      desc: "Functional, simple, and bright.",
      img: "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&w=600&q=80",
    },
    {
      id: 5,
      name: "Modern Luxury",
      desc: "Sleek finishes and bold accents.",
      img: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=600&q=80",
    },
  ]);

  // Fetch User Data
  useEffect(() => {
    const fetchUserData = async () => {
      try {

        //delay
        // await new Promise((resolve) => setTimeout(resolve, 4000));
        const response = await axios.get("/dashboard", {
          withCredentials: true,
        });
        if (response.data && response.data.user_name) {
          const dbUser = response.data;
          setUserData((prevState) => ({
            ...prevState,
            name: dbUser.user_name,
            plan: dbUser.plan
              ? dbUser.plan.charAt(0).toUpperCase() + dbUser.plan.slice(1)
              : "Free",
            credits: dbUser.credits,
            profilePicture: dbUser.profilePicture || null,
            initial: (dbUser.firstName || dbUser.user_name)
              .charAt(0),
          }));
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setIsUserLoading(false);
      }
    };
    fetchUserData();
  }, []);

  // Fetch Generated Images
  useEffect(() => {
    const fetchProjectsData = async () => {
      try {
        // delay
        await new Promise((resolve) => setTimeout(resolve, 4000));
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

  // Full screen loader ONLY waits for User Data now
  // if (isUserLoading) {
    // return (
      // <div className="flex items-center justify-center min-h-screen bg-[#f8f9fa]">
      //   <div className="relative flex items-center justify-center">
      //     <div className="w-24 h-24 rounded-full border-4 border-[#e0e0e0] border-t-[#00e676] animate-spin"></div>
      //     <span className="absolute text-sm font-bold text-[#333333] animate-pulse">
      //       Loading
      //     </span>
      //   </div>
      // </div>
      // <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f172a] relative overflow-hidden">
      //           {/* The Architectural Grid Background */}
      //           <div 
      //               className="absolute inset-0 opacity-20" 
      //               style={{ 
      //                   backgroundImage: 'linear-gradient(#38bdf8 1px, transparent 1px), linear-gradient(90deg, #38bdf8 1px, transparent 1px)', 
      //                   backgroundSize: '40px 40px' 
      //               }}
      //           ></div>

      //           <div className="relative z-10 flex flex-col items-center">
      //               {/* The Drawing House SVG */}
      //               <svg className="w-24 h-24 text-sky-400 animate-pulse" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
      //                   <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path>
      //                   <path strokeLinecap="round" strokeLinejoin="round" d="M9 22V12h6v10"></path>
      //               </svg>

      //               {/* Thematic Loading Bar & Text */}
      //               <div className="mt-8 flex flex-col items-center w-64">
      //                   <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
      //                       <div className="h-full bg-sky-400 w-1/2 animate-pulse rounded-full"></div>
      //                   </div>
      //                   <span className="mt-4 text-sm font-medium text-sky-400 tracking-widest uppercase animate-pulse">
      //                       Drafting Studio...
      //                   </span>
      //               </div>
      //           </div>
      //       </div>
    // );
  // }

  return (
    <div className="dashboard-layout">
      <div className="header-wrapper">
        <Header user={userData} />
      </div>

      <div className="content-wrapper">
        {/* SIDEBAR NAVIGATION */}
        <aside className="sidebar">
          <ul className="nav-list">
            <li className="nav-item active">
              <IconDashboard />
              <span>Overview</span>
            </li>
            <li className="nav-item">
              <IconFolder />
              <span>My Projects</span>
            </li>
            <li className="nav-item">
              <IconStar />
              <span>My Plugins</span>
            </li>
            <li className="nav-item">
              <IconPeople />
              <span>Community</span>
            </li>
            <li className="nav-item">
              <IconLightbulb />
              <span>Learn</span>
            </li>
            <div className="nav-divider"></div>
            <li className="nav-item">
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
                            {isUserLoading ? (
                                <>
                                    <div className="h-10 w-64 bg-gray-200 rounded-lg animate-pulse mb-2"></div>
                                    <div className="h-5 w-96 bg-gray-200 rounded-lg animate-pulse"></div>
                                </>
                            ) : (
                                <>
                                    <h1 className="welcome-title">Hello, {userData.name}</h1>
                                    <p className="welcome-subtitle">Here is what's happening with your designs today.</p>
                                </>
                            )}
                        </div>
                        <button className="btn-primary">
                            <IconAdd />
                            New Project
                        </button>
                    </div>

                    {/* Stats Grid */}
                    <div className="stats-grid">
                        {/* 🚀 APP SHELL: Stat Card Skeletons */}
                        {isUserLoading ? (
                            <>
                                <div className="stat-card h-40 bg-white border border-gray-100 shadow-sm animate-pulse flex flex-col justify-between">
                                    <div className="h-4 w-32 bg-gray-200 rounded"></div>
                                    <div className="h-8 w-16 bg-gray-200 rounded"></div>
                                    <div className="h-2 w-full bg-gray-100 rounded-full mt-4"></div>
                                </div>
                                <div className="stat-card h-40 bg-white border border-gray-100 shadow-sm animate-pulse flex flex-col justify-between">
                                    <div className="h-4 w-24 bg-gray-200 rounded"></div>
                                    <div className="h-8 w-12 bg-gray-200 rounded"></div>
                                    <div className="h-4 w-32 bg-gray-200 rounded mt-4"></div>
                                </div>
                                <div className="stat-card h-40 bg-white border border-gray-100 shadow-sm animate-pulse flex flex-col justify-between">
                                    <div className="flex justify-between">
                                        <div className="h-4 w-24 bg-gray-200 rounded"></div>
                                        <div className="h-6 w-6 bg-gray-200 rounded-full"></div>
                                    </div>
                                    <div className="h-8 w-full bg-gray-200 rounded mt-4"></div>
                                    <div className="h-10 w-24 bg-gray-200 rounded mt-4"></div>
                                </div>
                            </>
                        ) : (
                            /* Your Real Stat Cards Go Here! */
                            <>
                                {/* Plan Card */}
                                <div className="stat-card">
                                    <span className="stat-label">Plan Usage ({userData.plan})</span>
                                    <div className="stat-value">
                                        {userData.designsUsed} <span className="text-[0.5em] text-gray-400">/ {userData.designsLimit}</span>
                                    </div>
                                    <div className="progress-track">
                                        <div className="progress-fill" style={{ width: `${(userData.designsUsed / userData.designsLimit) * 100}%` }}></div>
                                    </div>
                                    <span className="text-xs text-gray-500">
                                        {userData.designsLimit - userData.designsUsed} generations remaining
                                    </span>
                                </div>

                                {/* Credits Card */}
                                <div className="stat-card">
                                    <span className="stat-label">Credit Balance</span>
                                    <div className="stat-value text-green-700">{userData.credits}</div>
                                    <p className="text-sm text-gray-600 mt-2">Available for plugin purchases</p>
                                    <button className="btn-text !px-0 mt-4 w-fit text-sm">Get More Credits</button>
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
                                    <button onClick={() => navigate('/marketplace')} className="btn-secondary">Browse</button>
                                </div>
                            </>
                        )}
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

          {/* Discover Styles Section */}
          <div className="section-wrapper">
            <div className="section-header">
              <h2 className="section-title">Discover Styles</h2>
              <button className="btn-text">
                View All <IconArrowRight />
              </button>
            </div>
            <div className="styles-scroll-container">
              {designStyles.map((style) => (
                <div key={style.id} className="style-card group">
                  <div className="style-image-wrapper">
                    <img
                      src={style.img}
                      alt={style.name}
                      className="w-full h-full object-cover !rounded-none"
                    />
                  </div>
                  <div className="style-info">
                    <h3 className="style-title">{style.name}</h3>
                    <p className="style-desc">{style.desc}</p>
                    <button className="btn-text !px-0 text-sm">
                      Try this style
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
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
    className={`w-6 h-6 transition-all duration-300 ease-in-out cursor-pointer active:scale-90 ${
      isFavorite
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
