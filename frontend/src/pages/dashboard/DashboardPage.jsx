import React, { useState, useEffect } from "react";
import axios from "../../config/axios.config";
import { useNavigate } from "react-router-dom";
import "./DashboardPage.css";
import Navigation from "../../components/common/Navigation";
import { useAuth } from "../../utils/authContext";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  /*
    const [isProjectsLoading, setIsProjectsLoading] = useState(true);
    const [projects, setProjects] = useState([]);*/

  const [isGeneratedImagesLoading, setIsGeneratedImagesLoading] = useState(true);
  const [generatedImages, setGeneratedImages] = useState([]);


  const [isArchitectProjectLoading, setIsArchitectProjectLoading] = useState(true);
  const [architectProjects, setArchitectProjects] = useState([]);

  // View All States
  const [showAllGenerated, setShowAllGenerated] = useState(false);
  const [showAllArchitect, setShowAllArchitect] = useState(false);

  useEffect(() => {
    const fetchGeneratedImagesData = async () => {
      try {
        const response = await axios.get("/generatedImage", { withCredentials: true });
        if (response.data) setGeneratedImages(response.data);
      } catch (error) {
        console.error("Error fetching generated images data:", error);
      } finally {
        setIsGeneratedImagesLoading(false);
      }
    };

    const fetchArchitectProjectsData = async () => {
      try {
        const response = await axios.get("/design2D3D", { withCredentials: true });
        if (response.data) setArchitectProjects(response.data);
      } catch (error) {
        console.error("Error fetching architect projects data:", error);
      } finally {
        setIsArchitectProjectLoading(false);
      }
    };
    fetchGeneratedImagesData();
    fetchArchitectProjectsData();
  }, []);

  /* ── Toggle favourite ── */
  const handleGeneratedImageToggleFavorite = async (e, project) => {
    e.stopPropagation();
    const newFav = !project.isFavorite;
    setGeneratedImages((prev) =>
      prev.map((p) => (p._id === project._id ? { ...p, isFavorite: newFav } : p))
    );
    try {
      await axios.put(
        `/generatedImage/${project._id}`,
        { ...project, isFavorite: newFav },
        { withCredentials: true }
      );
    } catch {
      setGeneratedImages((prev) =>
        prev.map((p) => (p._id === project._id ? { ...p, isFavorite: project.isFavorite } : p))
      );
    }
  };

  const handleArchitectProjectFavorite = async (e, project) => {
    e.stopPropagation();
    const newFav = !project.isFavorite;
    setArchitectProjects((prev) =>
      prev.map((p) => (p._id === project._id ? { ...p, isFavorite: newFav } : p))
    );
    try {
      await axios.put(
        `/design2D3D/${project._id}`,
        { ...project, isFavorite: newFav },
        { withCredentials: true }
      );
    } catch {
      setArchitectProjects((prev) =>
        prev.map((p) => (p._id === project._id ? { ...p, isFavorite: project.isFavorite } : p))
      );
    }
  };




  const handleGeneratedImageDelete = async (e, project) => {
    e.stopPropagation();
    const confirmDelete = window.confirm("Are you sure you want to delete this generated image?");
    if (!confirmDelete) return;
    try {
      await axios.delete(`/generatedImage/${project._id}`, { withCredentials: true });
      setGeneratedImages((prev) => prev.filter((p) => p._id !== project._id));
    } catch (error) {
      console.error("Error deleting generated image:", error);
    }
  };

  const handleArchitectProjectDelete = async (e, project) => {
    e.stopPropagation();
    const confirmDelete = window.confirm("Are you sure you want to delete this project?");
    if (!confirmDelete) return;
    try {
      await axios.delete(`/design2D3D/${project._id}`, { withCredentials: true });
      setArchitectProjects((prev) => prev.filter((p) => p._id !== project._id));
    } catch (error) {
      console.error("Error deleting architect project:", error);
    }
  };







  return (
    <>
      <Navigation />

      <div className="dashboard-layout pt-[72px]">
        <div className="content-wrapper">

          {/* ── SIDEBAR ── */}
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
              <li onClick={() => navigate("/upload")} className="nav-item">
                <IconAIStudio />
                <span>AI Studio</span>
              </li>
              <li onClick={() => navigate("/planner")} className="nav-item">
                <IconBlueprint />
                <span>Architect</span>
              </li>
              <li onClick={() => navigate("/ecomm")} className="nav-item">
                <IconCart />
                <span>Shop</span>
              </li>
              <div className="nav-divider" />
              <li onClick={() => navigate("/updateProfile")} className="nav-item">
                <IconPerson />
                <span>Settings</span>
              </li>
            </ul>
          </aside>

          {/* ── MAIN ── */}
          <main className="main-area">

            {/* Welcome */}
            <div className="welcome-section">
              <p className="welcome-eyebrow">Dashboard</p>
              <h1 className="welcome-title">
                Hello, <span>{user?.firstName.toUpperCase() || "there"}</span>
              </h1>
              <p className="welcome-subtitle">
                Here's what's happening with your designs today.
              </p>
            </div>

            {/* Stats Row */}
            <div className="stats-grid">

              {/* Credits */}
              <div className="stat-card">
                <span className="stat-label">Credit Balance</span>
                <div className="stat-value stat-value-accent">{user?.credits ?? "—"}</div>
                <p className="credits-hint">Available for generations</p>
                <button
                  onClick={() => navigate("/pricingPlans")}
                  className="btn-text"
                  style={{ marginTop: "1rem" }}
                >
                  Get more credits →
                </button>
              </div>



              {/* {Projects} count */}
              <div className="stat-card">
                <span className="stat-label">Total Designs</span>
                <div className="stat-value">
                  {isGeneratedImagesLoading || isArchitectProjectLoading
                    ? "—"
                    : generatedImages.length + architectProjects.length}
                </div>

                <p className="credits-hint" style={{ marginTop: "0.25rem" }}>
                  {isGeneratedImagesLoading || isArchitectProjectLoading ? (
                    "Loading breakdown..."
                  ) : (
                    `${generatedImages.length}\u00A0AI Studio\u00A0\u00A0\u00A0|\u00A0\u00A0\u00A0${architectProjects.length}\u00A0Architect`
                  )}
                </p>

                <button
                  onClick={() => navigate("/projects")}
                  className="btn-text"
                  style={{ marginTop: "1rem" }}
                >
                  View all →
                </button>
              </div>



              {/* Marketplace teaser */}
              <div className="stat-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span className="stat-label">Marketplace</span>
                  <div className="marketplace-icon-wrapper">
                    <IconStore />
                  </div>
                </div>
                <p style={{ marginTop: "0.75rem", fontSize: "0.85rem", color: "var(--carbon-60)", flex: 1 }}>
                  Discover furniture, styles, and premium design assets.
                </p>
                <button
                  onClick={() => navigate("/ecomm")}
                  className="btn-secondary"
                  style={{ marginTop: "1rem" }}
                >
                  Browse Shop
                </button>
              </div>
            </div>

            {/* Quick Actions — Create New */}
            <div className="section-wrapper">
              <div className="section-header">
                <div>
                  <p className="section-eyebrow">Create</p>
                  <h2 className="section-title">Start a New Project</h2>
                </div>
              </div>
              <div className="quick-actions-grid">

                {/* AI Studio */}
                <div className="action-card" onClick={() => navigate("/upload")}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <p className="stat-label">AI Generation</p>
                      <p className="action-card-title">AI Studio</p>
                    </div>
                    <div className="marketplace-icon-wrapper">
                      <IconAIStudio />
                    </div>
                  </div>
                  <p className="action-card-desc">
                    Generate instant concepts, styles, and interior variations using
                    advanced AI guidance.
                  </p>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate("/upload"); }}
                    className="btn-accent"
                    style={{ alignSelf: "flex-start" }}
                  >
                    Launch Studio
                  </button>
                </div>

                {/* Architect Mode */}
                <div className="action-card" onClick={() => navigate("/planner")}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <p className="stat-label">Precision Layout</p>
                      <p className="action-card-title">Architect Mode</p>
                    </div>
                    <div className="marketplace-icon-wrapper">
                      <IconBlueprint />
                    </div>
                  </div>
                  <p className="action-card-desc">
                    Build structural floor plans, exact measurements, and professional
                    blueprints from scratch.
                  </p>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate("/planner"); }}
                    className="btn-secondary"
                    style={{ alignSelf: "flex-start" }}
                  >
                    Start Building
                  </button>
                </div>
              </div>
            </div>

            {/* Recent Projects */}
            <div className="section-wrapper">
              <div className="section-header">
                <div>
                  <p className="section-eyebrow">Recents</p>
                  <h2 className="section-title">Recent AI Studio Projects</h2>
                </div>
                <button onClick={() => setShowAllGenerated(!showAllGenerated)} className="btn-text">
                  {showAllGenerated ? "View Less ↑" : "View All ↓"}
                </button>
              </div>

              <div className="projects-grid">
                {isGeneratedImagesLoading ? (
                  [1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="project-card" style={{ cursor: "default" }}>
                      <div className="project-image-wrapper">
                        <div className="skeleton-block" style={{ width: "100%", height: "100%" }} />
                      </div>
                      <div className="project-info">
                        <div className="skeleton-block" style={{ height: "14px", width: "70%", marginBottom: "8px" }} />
                        <div className="skeleton-block" style={{ height: "10px", width: "40%" }} />
                      </div>
                    </div>
                  ))
                ) : generatedImages.length === 0 ? (
                  <div className="empty-state">
                    No designs yet — launch the AI Studio to get started.
                  </div>
                ) : (
                  generatedImages.slice(0, showAllGenerated ? generatedImages.length : 6).map((project) => (
                    <div
                      key={project._id}
                      className="project-card group"
                      onClick={() => navigate(`/generatedImages/${project._id}`)}
                    >
                      <div className="project-image-wrapper">
                        <img
                          src={project.generatedImageUrl}
                          alt={project.inputPrompt || "AI Generated Interior"}
                        />
                      </div>
                      <div className="project-info">
                        <h3 className="project-title" title={project.inputPrompt}>
                          {project.inputPrompt || "Custom Design"}
                        </h3>
                        <div className="project-meta">
                          <span className="project-date">
                            {new Date(project.createdAt).toLocaleDateString("en-GB", {
                              day: "2-digit", month: "short", year: "numeric",
                            })}
                          </span>
                          <div className="project-actions">
                            <button
                              onClick={(e) => handleGeneratedImageToggleFavorite(e, project)}
                              className="project-action-btn"
                              title={project.isFavorite ? "Remove from favourites" : "Add to favourites"}
                            >
                              <IconStar isFavorite={project.isFavorite} />
                            </button>
                            <button
                              onClick={(e) => handleGeneratedImageDelete(e, project)}
                              className="project-action-btn delete-btn"
                              title="Delete project"
                            >
                              <IconTrash />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>




            {/* Recent Architect Projects */}
            <div className="section-wrapper">
              <div className="section-header">
                <div>
                  <p className="section-eyebrow">Recents</p>
                  <h2 className="section-title">Recent Architect Projects</h2>
                </div>
                <button onClick={() => setShowAllArchitect(!showAllArchitect)} className="btn-text">
                  {showAllArchitect ? "View Less ↑" : "View All ↓"}
                </button>
              </div>

              <div className="projects-grid">
                {isArchitectProjectLoading ? (
                  [1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="project-card" style={{ cursor: "default" }}>
                      <div className="project-image-wrapper">
                        <div className="skeleton-block" style={{ width: "100%", height: "100%" }} />
                      </div>
                      <div className="project-info">
                        <div className="skeleton-block" style={{ height: "14px", width: "70%", marginBottom: "8px" }} />
                        <div className="skeleton-block" style={{ height: "10px", width: "40%" }} />
                      </div>
                    </div>
                  ))
                ) : architectProjects.length === 0 ? (
                  <div className="empty-state">
                    No designs yet — launch the Architect Mode to get started.
                  </div>
                ) : (
                  architectProjects.slice(0, showAllArchitect ? architectProjects.length : 6).map((project) => (
                    <div
                      key={project._id}
                      className="project-card group"
                      onClick={() => navigate(`/2D3DProjects/${project._id}`)}
                    >
                      <div className="project-image-wrapper">
                        <img
                          src={project.thumbnailUrl}
                          alt={project.title || "Architect Project"}
                        />
                      </div>
                      <div className="project-info">
                        <h3 className="project-title" title={project.title}>
                          {project.title || "Architect Project"}
                        </h3>
                        <div className="project-meta">
                          <span className="project-date">
                            {new Date(project.createdAt).toLocaleDateString("en-GB", {
                              day: "2-digit", month: "short", year: "numeric",
                            })}
                          </span>
                          <div className="project-actions">
                            <button
                              onClick={(e) => handleArchitectProjectFavorite(e, project)}
                              className="project-action-btn"
                              title={project.isFavorite ? "Remove from favourites" : "Add to favourites"}
                            >
                              <IconStar isFavorite={project.isFavorite} />
                            </button>
                            <button
                              onClick={(e) => handleArchitectProjectDelete(e, project)}
                              className="project-action-btn delete-btn"
                              title="Delete project"
                            >
                              <IconTrash />
                            </button>
                          </div>
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

/* ══════════════════════════════════
   SVG Icon Library
══════════════════════════════════ */
const IconDashboard = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);
const IconFolder = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
  </svg>
);
const IconCart = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);
const IconPerson = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);
const IconStore = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);
const IconStar = ({ isFavorite }) => (
  <svg
    className={`w-5 h-5 transition-all duration-200 ${isFavorite ? "fill-current" : "fill-transparent hover:fill-current"
      }`}
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
    style={{ color: isFavorite ? "var(--accent)" : "var(--carbon-30)" }}
  >
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
);
const IconAIStudio = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M9.813 15.904L9 21l-.813-5.096A4 4 0 005.096 12.813L0 12l5.096-.813a4 4 0 003.091-3.091L9 3l.813 5.096a4 4 0 003.091 3.091L18 12l-5.096.813a4 4 0 00-3.091 3.091zM19.5 7.5L19 10l-.5-2.5L16 7l2.5-.5L19 4l.5 2.5L22 7l-2.5.5z" />
  </svg>
);
const IconBlueprint = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
  </svg>
);
const IconTrash = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);