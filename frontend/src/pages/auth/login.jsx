import React, { useRef, useState } from 'react';
import '../../styles/auth/login.css';
import axios from '../../config/axios.config';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../utils/authContext.jsx';

const LoginModal = () => {

    const [loginMessage, setLoginMessage] = useState('');
    const [isMessageVisible, setIsMessageVisible] = useState(false);
    const [isSuccessFullLogin, setIsSuccessFullLogin] = useState(false);
    const { login } = useAuth();


    const formData = useRef({
        email: '',
        password: ''
    });

    const navigate = useNavigate();
    const location = useLocation();
    const navigateTo = location?.state?.from || "/dashboard";

    const handleChange = (e) => {
        formData.current[e?.target?.name] = e?.target?.value;
        setIsMessageVisible((prev) => false);
        setLoginMessage((p) => '');

    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('/auth/login', formData.current);

            if (res?.data?.success) {

                login(res.data.user);

                setIsSuccessFullLogin((p) => true);
                setIsMessageVisible((p) => true);
                setLoginMessage((p) => 'Logged in successfully');
                setTimeout(() => {
                    navigate(navigateTo);
                }, 1500);
            }

        } catch (e) {
            console.log("badr", e)
            setIsSuccessFullLogin((p) => false);
            setIsMessageVisible((p) => true);
            setLoginMessage((p) => e?.response?.data?.message || "internal server error");

        }
    }



    return (
        <main className="auth-page">
            <div className="auth-noise" />
            <nav className="auth-nav" aria-label="Authentication navigation">
                <Link to="/" className="auth-brand">IntelliRoom</Link>
                <Link to="/signUp" className="auth-nav-link">Join Now</Link>
            </nav>

            <section className="auth-shell">
                <div className="auth-visual" aria-hidden="true">
                    <img src="/images/manifesto_full_room.jpg" alt="" />
                    <div className="auth-visual-overlay" />
                    <div className="auth-visual-copy">
                        <span className="auth-kicker">AI Interior Studio</span>
                        <h1>Your Space Reimagined</h1>
                        <p>Return to your saved concepts, renders, and room plans.</p>
                    </div>
                </div>

                <div className="auth-panel">
                    {isMessageVisible && <div className={"auth-message " + (isSuccessFullLogin ? 'auth-message--success' : 'auth-message--error')}>{loginMessage}</div>}
                    <span className="auth-kicker">Welcome Back</span>
                    <h2 className="auth-title">Access your studio</h2>
                    <p className="auth-subtitle">Sign in to continue designing with IntelliRoom.</p>

                    <div className="auth-socials">
                        <button type="button" className="auth-social-button">
                            <span>G</span>
                            Google
                        </button>
                        <button type="button" className="auth-social-button">
                            <span>f</span>
                            Facebook
                        </button>
                    </div>

                    <div className="auth-divider"><span>or use email</span></div>

                    <form className="auth-form" onSubmit={handleSubmit}>
                        <div className="auth-field">
                            <label>Email</label>
                        <input
                            type="email"
                            name="email"
                            placeholder="your@email.com"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                        </div>
                        <div className="auth-field">
                            <label>Password</label>
                        <input
                            type="password"
                            name="password"
                            placeholder="********"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                        </div>

                        <button type="submit" className="auth-submit">Sign In</button>
                    </form>

                    <p className="auth-switch">
                        Don't have an account? <Link to="/signUp">Sign Up</Link>
                    </p>
                </div>
            </section>
        </main>
    );
};

export default LoginModal;
