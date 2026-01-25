import React, { useRef, useState } from 'react';
import '../../styles/auth/login.css';
import axios from '../../config/axios.config';
import { useNavigate } from 'react-router-dom';

const LoginModal = () => {

    const [loginMessage, setLoginMessage] = useState('');
    const [isMessageVisible, setIsMessageVisible] = useState(false);
    const [isSuccessFullLogin, setIsSuccessFullLogin] = useState(false);

    const formData = useRef({
        email: '',
        password: ''
    });

    const navigate = useNavigate();
    
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
                setIsSuccessFullLogin((p) => true);
                setIsMessageVisible((p) => true);
                setLoginMessage((p) => 'Logged in successfully');
                setTimeout(() => {
                    navigate('/dashboard'); 
                }, 1500);
            }

        } catch (e) {
            console.log("badr",e)
            setIsSuccessFullLogin((p) => false);
            setIsMessageVisible((p) => true);
            setLoginMessage((p) => e?.response?.data?.message || "internal server error");

        }
    }



    return (
        <div className="overlay">
            <div className="login-card">
                {/* <button className="close-btn">&times;</button> */}
                {isMessageVisible && <div className={"message-banner " + (isSuccessFullLogin ? 'success-message' : 'error-message')}>{loginMessage}</div>}
                <h2>Welcome Back</h2>
                <p className="subtitle">Sign in to continue designing</p>

                <div className="social-btns">
                    <button className="btn google">
                        <img src="https://www.bing.com/th/id/OIP.AfKMLf4rKX7EqOSAVpujIQHaEK?w=336&h=211&c=8&rs=1&qlt=90&r=0&o=6&pid=3.1&rm=2" alt="Google" />
                        Sign in with Google
                    </button>
                    <button className="btn facebook">
                        <img src="https://www.bing.com/th/id/OIP.VgfWevmVdjRKHG8bfhpVsgHaHa?w=245&h=211&c=8&rs=1&qlt=90&r=0&o=6&pid=3.1&rm=2" alt="Google" />
                        Sign in with Facebook
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
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
                    <div className="input-group">
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

                    <button type="submit" className="sign-in-btn">Sign In</button>
                </form>

                <p className="signup-text">
                    Don't have an account? <a href="/signup">Sign Up</a>
                </p>
            </div>
        </div>
    );
};

export default LoginModal;