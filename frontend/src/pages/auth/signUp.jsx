import React, { useEffect, useRef, useState } from 'react';
import '../../styles/auth/signup.css';
import axios from '../../config/axios.config';
import { useNavigate } from 'react-router-dom';
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
        <div className="overlay">
            <div className="login-card">
                {isMessageVisible && (
                    <div
                        ref={messageRef}
                        className={"message-banner " + (isSuccessFullLogin ? 'success-message' : 'error-message')}
                    >
                        {loginMessage}
                    </div>
                )}
                <h2>Become an artist!</h2>
                <p className="subtitle">Sign up to start designing</p>

                <div className="social-btns">
                    <button className="btn google">
                        <img src="https://www.bing.com/th/id/OIP.AfKMLf4rKX7EqOSAVpujIQHaEK?w=336&h=211&c=8&rs=1&qlt=90&r=0&o=6&pid=3.1&rm=2" alt="Google" />
                        continue with Google
                    </button>
                    <button className="btn facebook">
                        <img src="https://www.bing.com/th/id/OIP.VgfWevmVdjRKHG8bfhpVsgHaHa?w=245&h=211&c=8&rs=1&qlt=90&r=0&o=6&pid=3.1&rm=2" alt="Google" />
                        continue with Facebook
                    </button>
                </div>
                <br></br>
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>first name</label>
                        <input
                            type="input"
                            name="firstName"
                            placeholder="badr"
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="input-group">
                        <label>last name</label>
                        <input
                            type="input"
                            name="lastName"
                            placeholder="sayed"
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="input-group">
                        <label>Email</label>
                        <input
                            type="email"
                            name="email"
                            placeholder="your@email.com"
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="input-group">
                        <label>user name</label>
                        <input
                            type="input"
                            name="user_name"
                            placeholder="badr21"
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label>Password</label>
                        <input
                            type="password"
                            name="password"
                            placeholder="********"
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="input-group">
                        <label>repeat Password</label>
                        <input
                            type="password"
                            name="repeatPassword"
                            placeholder="********"
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <button type="submit" className="sign-in-btn">Sign up</button>
                </form>
                <br></br>

                <p className="signup-text">
                    Already have an account? <a href="/login">Login</a>
                </p>
            </div>
        </div>
    );
};

export default SignUpModal;