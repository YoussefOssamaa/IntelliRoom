export const checkLoggedIn = (isLoggedIn, navigate, navigateTo) => {
    if (isLoggedIn) {
        navigate(navigateTo);
    } else {
        navigate("/login", { state: { from: navigateTo } });
    }
}


