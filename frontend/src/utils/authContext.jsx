import React , { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true);

    useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedIsLoggedIn = localStorage.getItem("isLoggedIn");

    if (storedUser && storedIsLoggedIn === "true") {
      setUser(JSON.parse(storedUser));
      setIsLoggedIn(true);

    }
    setLoading(false);
  }, []);

    const formatUser = (backendUserData) => {
        return {
            email: backendUserData.email,
            firstName: backendUserData.firstName,
            lastName: backendUserData.lastName,
            user_name: backendUserData.user_name,
            plan: backendUserData.plan,
            credits: backendUserData.credits
        }
    }   


    const login = (backendUserData) => {
        const formattedUser = formatUser(backendUserData);
        setIsLoggedIn(true);
        setUser(formattedUser);

        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("user", JSON.stringify(formattedUser));


    }

    const logout = () => {
        setIsLoggedIn(false);
        setUser(null);
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("user");

    }
    

    return (
        <AuthContext.Provider value={{ isLoggedIn, user, loading, login, logout }}>
            {!loading ? children:(
                <div className="flex h-screen w-screen items-center justify-center bg-cream font-body text-text-primary">
                    Loading Application...
                </div>

            ) }
        </AuthContext.Provider>
    );
}


export const useAuth = () => useContext(AuthContext);