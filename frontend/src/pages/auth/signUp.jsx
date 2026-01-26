import React, { useEffect, useRef, useState } from 'react';
import '../../styles/auth/signup.css';
import axios from '../../config/axios.config';
import { useNavigate } from 'react-router-dom';

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

    const handleChange = (e) => {
        formData.current[e?.target?.name] = e?.target?.value;
        setIsMessageVisible((prev) => false);
        setLoginMessage((p) => '');

    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (formData.current.password !== formData.current.repeatPassword) {
                setIsSuccessFullLogin((p) => false);
                setIsMessageVisible((p) => true);
                setLoginMessage((p) => "passwords don't match");
                return
            }
            delete formData.current.repeatPassword;

            const res = await axios.post('/auth/signup', formData.current);

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
                {/* <button className="close-btn">&times;</button> */}
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
                            value={formData.firstName}
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
                            value={formData.lasttName}
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
                            value={formData.email}
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
                            value={formData.user_name}
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
                    <div className="input-group">
                        <label>repeat Password</label>
                        <input
                            type="password"
                            name="repeatPassword"
                            placeholder="********"
                            value={formData.repeatPassword}
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