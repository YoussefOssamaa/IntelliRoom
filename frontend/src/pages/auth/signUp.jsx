import React, { useEffect, useRef, useState } from 'react';
import '../../styles/auth/signup.css';
import axios from '../../config/axios.config';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../utils/authContext.jsx';

const SignUpModal = () => {

    const [loginMessage, setLoginMessage] = useState('');
    const [isMessageVisible, setIsMessageVisible] = useState(false);
    const [isSuccessFullLogin, setIsSuccessFullLogin] = useState(false);
    const messageRef = useRef(null);
    const formData = useRef({
        email: '',
        password: '',
        repeatPassword: '',
        firstName: '',
        lastName: '',
        user_name: ''
    });

    const navigate = useNavigate();
    const { login } = useAuth();

    const handleChange = (e) => {
        formData.current[e?.target?.name] = e?.target?.value;
        setIsMessageVisible((prev) => false);
        setLoginMessage((p) => '');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const { repeatPassword, ...submitData } = formData.current;

            if (submitData.password !== repeatPassword) {
                setIsSuccessFullLogin((p) => false);
                setIsMessageVisible((p) => true);
                setLoginMessage((p) => "passwords don't match");
                return;
            }

            const res = await axios.post('auth/signup', submitData);

            if (res?.data?.success) {
                login(res.data.user);
                setIsSuccessFullLogin((p) => true);
                setIsMessageVisible((p) => true);
                setLoginMessage((p) => 'Logged in successfully');
                setTimeout(() => {
                    navigate('/dashboard');
                }, 1500);
            }

        } catch (error) {
            setIsSuccessFullLogin((p) => false);
            setIsMessageVisible((p) => true);
            if (error.response) {
                console.error("Backend Error Data:", error.response.data);
                setLoginMessage((p) => error.response.data.message || "Signup failed");
            } else {
                console.error("Error Message:", error.message);
                setLoginMessage((p) => error.message || "Network error");
            }
        }
    }

    useEffect(() => {
        if (isMessageVisible && messageRef.current) {
            messageRef.current.scrollIntoView({
                behavior: 'smooth', // حركة ناعمة
                block: 'start'      // يخلي الرسالة في أعلى الكارد
            });
        }
    }, [isMessageVisible]);

    return (
        <main className="auth-page">
            <div className="auth-noise" />
            <nav className="auth-nav" aria-label="Authentication navigation">
                <Link to="/" className="auth-brand">IntelliRoom</Link>
                <Link to="/login" className="auth-nav-link">Access</Link>
            </nav>

            <section className="auth-shell auth-shell--signup">
                <div className="auth-visual" aria-hidden="true">
                    <img src="/images/livable_sofa_scene.jpg" alt="" />
                    <div className="auth-visual-overlay" />
                    <div className="auth-visual-copy">
                        <span className="auth-kicker">Start Designing</span>
                        <h1>Build rooms that feel ready to live in</h1>
                        <p>Create projects, generate concepts, and refine every detail in one studio.</p>
                    </div>
                </div>

                <div className="auth-panel auth-panel--signup">
                {isMessageVisible && (
                    <div
                        ref={messageRef}
                        className={"auth-message " + (isSuccessFullLogin ? 'auth-message--success' : 'auth-message--error')}
                    >
                        {loginMessage}
                    </div>
                )}
                <span className="auth-kicker">Join IntelliRoom</span>
                <h2 className="auth-title">Create your studio</h2>
                <p className="auth-subtitle">Save projects, organize designs, and unlock the AI workspace.</p>

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

                <form className="auth-form auth-form--signup" onSubmit={handleSubmit}>
                    <div className="auth-field">
                        <label>First name</label>
                        <input
                            type="input"
                            name="firstName"
                            placeholder="Nour"
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="auth-field">
                        <label>Last name</label>
                        <input
                            type="input"
                            name="lastName"
                            placeholder="Hassan"
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="auth-field">
                        <label>Email</label>
                        <input
                            type="email"
                            name="email"
                            placeholder="your@email.com"
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="auth-field">
                        <label>Username</label>
                        <input
                            type="input"
                            name="user_name"
                            placeholder="nour.studio"
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
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="auth-field">
                        <label>Repeat password</label>
                        <input
                            type="password"
                            name="repeatPassword"
                            placeholder="********"
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <button type="submit" className="auth-submit">Sign up</button>
                </form>

                <p className="auth-switch">
                    Already have an account? <Link to="/login">Login</Link>
                </p>
                </div>
            </section>
        </main>
    );
};

export default SignUpModal;
