import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
    Box, Drawer, Toolbar, List, Typography, Divider,
    ListItem, ListItemButton, ListItemIcon, ListItemText,
    CssBaseline, Card, CardContent, Grid, Button, LinearProgress,
    Avatar, IconButton, Badge, Stack
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    Folder as FolderIcon,
    Add as AddIcon,
    Person as PersonIcon,
    Star as StarIcon,
    Notifications as NotificationsIcon,
    Lightbulb as TutorialIcon,
    People as PeopleIcon,
    Storefront as StorefrontIcon
} from '@mui/icons-material';

import './DashboardPage.css';
import Header from './Header';

const drawerWidth = 240;

export default function DashboardPage() {
    const navigate = useNavigate();

    const [userData, setUserData] = useState({
        name: "Alharith",
        plan: "Free",
        designsUsed: 12,
        designsLimit: 20,
        credits: 100
    });

    const [projects, setProjects] = useState([
        { id: 1, name: "Modern Living Room", status: "Draft", date: "2 hours ago" },
        { id: 2, name: "Office Space", status: "Completed", date: "1 day ago" },
        { id: 3, name: "Cozy Bedroom", status: "Rendering", date: "3 days ago" }
    ]);

    const [designStyles] = useState([
        { id: 1, name: "Minimalist Zen", desc: "Clean lines and calming neutrals.", img: "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=600&q=80" },
        { id: 2, name: "Industrial Loft", desc: "Raw brick, metal, and wood.", img: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=600&q=80" },
        { id: 3, name: "Bohemian Chic", desc: "Vibrant colors and organic textures.", img: "https://images.unsplash.com/photo-1616486338812-3dadae4b4f9d?auto=format&fit=crop&w=600&q=80" },
        { id: 4, name: "Scandinavian", desc: "Functional, simple, and bright.", img: "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&w=600&q=80" },
        { id: 5, name: "Modern Luxury", desc: "Sleek finishes and bold accents.", img: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=600&q=80" },
    ]);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <CssBaseline />

            <Box sx={{ position: 'sticky', top: 0, zIndex: 1300 }}>
                <Header user={userData} />
            </Box>

            <Box sx={{ display: 'flex', flexGrow: 1 }}>

                <Drawer
                    variant="permanent"
                    className="dashboard-drawer"
                    sx={{
                        width: drawerWidth,
                        flexShrink: 0,
                        [`& .MuiDrawer-paper`]: {
                            width: drawerWidth,
                            boxSizing: 'border-box',
                            position: 'relative',
                            height: '100%'
                        },
                    }}
                >
                    <Box sx={{ overflow: 'auto' }}>
                        <List>
                            <ListItem disablePadding><ListItemButton selected><ListItemIcon><DashboardIcon /></ListItemIcon><ListItemText primary="Overview" /></ListItemButton></ListItem>
                            <ListItem disablePadding><ListItemButton><ListItemIcon><FolderIcon /></ListItemIcon><ListItemText primary="My Projects" /></ListItemButton></ListItem>
                            <ListItem disablePadding><ListItemButton><ListItemIcon><StarIcon /></ListItemIcon><ListItemText primary="My Plugins" /></ListItemButton></ListItem>
                            <ListItem disablePadding><ListItemButton><ListItemIcon><PeopleIcon /></ListItemIcon><ListItemText primary="Community" /></ListItemButton></ListItem>
                            <ListItem disablePadding><ListItemButton><ListItemIcon><TutorialIcon /></ListItemIcon><ListItemText primary="Learn" /></ListItemButton></ListItem>
                            <Divider sx={{ my: 2 }} />
                            <ListItem disablePadding><ListItemButton><ListItemIcon><PersonIcon /></ListItemIcon><ListItemText primary="Profile Settings" /></ListItemButton></ListItem>
                        </List>
                    </Box>
                </Drawer>

                {/* MAIN CONTENT */}
                <Box component="main" className="dashboard-main">

                    <Box className="welcome-section">
                        <div>
                            <Typography variant="h4" fontWeight="bold">Hello, {userData.name}</Typography>
                            <Typography variant="body1" color="text.secondary">Here is what's happening with your designs today.</Typography>
                        </div>
                        <Button
                            variant="contained"
                            size="large"
                            startIcon={<AddIcon />}
                            className="new-project-btn"
                        >
                            New Project
                        </Button>
                    </Box>

                    {/* STATS GRID */}
                    <Grid container spacing={3} className="section-margin">
                        <Grid item xs={12} sm={4} md={4}>
                            <Card className="stat-card">
                                <CardContent>
                                    <Typography color="text.secondary" gutterBottom>Plan Usage ({userData.plan})</Typography>
                                    <Typography variant="h3" fontWeight="bold">
                                        {userData.designsUsed} <span style={{ fontSize: '0.5em', color: '#888' }}>/ {userData.designsLimit}</span>
                                    </Typography>
                                    <Box className="progress-container">
                                        <Box sx={{ width: '100%', mr: 1 }}>
                                            <LinearProgress
                                                variant="determinate"
                                                value={(userData.designsUsed / userData.designsLimit) * 100}
                                                sx={{ height: 8, borderRadius: 5 }}
                                            />
                                        </Box>
                                    </Box>
                                    <Typography variant="caption" color="text.secondary">
                                        {userData.designsLimit - userData.designsUsed} generations remaining
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} sm={4} md={4}>
                            <Card className="stat-card">
                                <CardContent>
                                    <Typography color="text.secondary" gutterBottom>Credit Balance</Typography>
                                    <Typography variant="h3" fontWeight="bold" className="credit-balance">
                                        {userData.credits}
                                    </Typography>
                                    <Typography variant="body2" sx={{ mt: 1 }}>
                                        Available for plugin purchases
                                    </Typography>
                                    <Button size="small" sx={{ mt: 2 }}>Get More Credits</Button>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} sm={4} md={4}>
                            <Card className="stat-card">
                                <CardContent className="stat-card-content">
                                    <Box className="marketplace-header">
                                        <div>
                                            <Typography color="text.secondary" gutterBottom>Marketplace</Typography>
                                            <Typography variant="h5" fontWeight="bold">Explore</Typography>
                                        </div>
                                        <Avatar className="marketplace-icon">
                                            <StorefrontIcon />
                                        </Avatar>
                                    </Box>
                                    <Typography variant="body2" sx={{ mt: 2, mb: 2, color: 'text.secondary' }}>
                                        Discover new designs, styles, and furnitures for your designs.
                                    </Typography>
                                    <Button
                                        variant="outlined"
                                        fullWidth
                                        onClick={() => navigate('/marketplace')}
                                        className="browse-btn"
                                    >
                                        Browse
                                    </Button>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    {/* RECENT PROJECTS */}
                    <Box className="section-margin">
                        <Box className="section-header">
                            <Typography variant="h5" fontWeight="bold">Recent Projects</Typography>
                            <Button
                                onClick={() => navigate('/projects')}
                                className="view-all-link"
                            >
                                View All Projects
                            </Button>
                        </Box>
                        <Grid container spacing={3}>
                            {projects.map((project) => (
                                <Grid item xs={12} sm={6} md={4} key={project.id}>
                                    <Card className="project-card">
                                        <Box className="card-placeholder-image">
                                            <FolderIcon className="placeholder-icon" />
                                        </Box>
                                        <CardContent>
                                            <Typography variant="h6" fontWeight="bold">{project.name}</Typography>
                                            <Box className="project-meta">
                                                <Typography variant="body2" color="text.secondary">{project.date}</Typography>
                                                <span style={{
                                                    padding: '2px 8px',
                                                    borderRadius: '12px',
                                                    fontSize: '12px',
                                                    backgroundColor: project.status === 'Completed' ? '#e8f5e9' : '#fff3e0',
                                                    color: project.status === 'Completed' ? '#2e7d32' : '#ef6c00'
                                                }}>
                                                    {project.status}
                                                </span>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    </Box>

                    {/* DISCOVER STYLES */}
                    <Box className="section-margin">
                        <Box className="section-header">
                            <Typography variant="h5" fontWeight="bold">Discover Styles</Typography>
                            <Button
                                endIcon={<StorefrontIcon />}
                                className="view-all-link"
                            >
                                View All
                            </Button>
                        </Box>

                        <Box className="scroll-container">
                            {designStyles.map((style) => (
                                <Card key={style.id} className="style-card">
                                    <Box className="style-image-wrapper">
                                        <img
                                            src={style.img}
                                            alt={style.name}
                                            className="style-image"
                                        />
                                    </Box>
                                    <CardContent>
                                        <Typography variant="h6" fontWeight="bold">{style.name}</Typography>
                                        <Typography variant="body2" color="text.secondary" className="style-desc">
                                            {style.desc}
                                        </Typography>
                                        <Button size="small" sx={{ mt: 1, padding: 0 }}>Try this style</Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </Box>
                    </Box>

                </Box>
            </Box>
        </Box>
    );
}