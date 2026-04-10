import { useState } from "react";
import "./Checkout.css";
import { WalletIcon, InstaPayIcon, CardIcon, ShieldIcon, SparkleIcon, CheckIcon, ArrowIcon, LockIcon, RefreshIcon } from "../../components/common/icons";
import Header from "../../pages/dashboard/Header";
import Footer from "../../components/common/Footer";


export default function Checkout() {
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [cardholderName, setCardholderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [confirming, setConfirming] = useState(false);

  const formatCardNumber = (val) => {
    const digits = val.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  };

  const formatExpiry = (val) => {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) return digits.slice(0, 2) + " / " + digits.slice(2);
    return digits;
  };

  const handleConfirm = () => {
    setConfirming(true);
    setTimeout(() => setConfirming(false), 2000);
  };

  return (
    <div className="checkout-page">
      {/* Nav */}
      <Header />

      {/* Main Content */}
      <main className="co-main">
        {/* Left Panel */}
        <section className="co-left-panel">
          <div>
            <h1 className="checkout-title">Checkout</h1>
            <p className="checkout-subtitle">Elevate your space with our premium AI generation engine.</p>
          </div>

          <div>
            <label className="co-section-label">PAYMENT METHOD</label>
            <div className="payment-methods">
              <button
                className={`method-btn ${paymentMethod === "card" ? "active" : ""}`}
                onClick={() => setPaymentMethod("card")}
              >
                <span className="method-icon"><CardIcon /></span>
                <span className="method-name">CARD</span>
              </button>

              <button
                className={`method-btn ${paymentMethod === "instapay" ? "active" : ""}`}
                onClick={() => setPaymentMethod("instapay")}
              >
                <span className="method-icon"><InstaPayIcon /></span>
                <span className="method-name">INSTAPAY</span>
              </button>

              <button
                className={`method-btn ${paymentMethod === "wallet" ? "active" : ""}`}
                onClick={() => setPaymentMethod("wallet")}
              >
                <span className="method-icon"><WalletIcon /></span>
                <span className="method-name">WALLET</span>
              </button>

              <button
                className={`method-btn ${paymentMethod === "apple" ? "active" : ""}`}
                onClick={() => setPaymentMethod("apple")}
              >
                <span className="method-icon ios-icon">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <text x="2" y="15" fontFamily="system-ui,-apple-system" fontSize="11" fontWeight="500" fill="currentColor">iOS</text>
                  </svg>
                </span>
                <span className="method-name">APPLE PAY</span>
              </button>

              <button
                className={`method-btn ${paymentMethod === "google" ? "active" : ""}`}
                onClick={() => setPaymentMethod("google")}
              >
                <span className="method-icon">
                  <svg width="22" height="18" viewBox="0 0 22 18" fill="none">
                    <path d="M3 5H19V13H3z" stroke="currentColor" strokeWidth="1.1" fill="none" rx="2" />
                    <path d="M7 9H15" stroke="currentColor" strokeWidth="1.1" />
                  </svg>
                </span>
                <span className="method-name">GOOGLE PAY</span>
              </button>
            </div>
          </div>

          {paymentMethod === "card" && (
            <div className="card-form">
              <div className="co-form-group">
                <label className="co-form-label">CARDHOLDER NAME</label>
                <input
                  className="co-form-input"
                  type="text"
                  placeholder="Full name on card"
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value)}
                />
              </div>
              <div className="co-form-group">
                <label className="co-form-label">CARD NUMBER</label>
                <div className="co-input-with-icon">
                  <span className="co-input-icon"><CardIcon /></span>
                  <input
                    className="co-form-input padded"
                    type="text"
                    placeholder="1234 1234 1234 1234"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  />
                </div>
              </div>
              <div className="co-form-row">
                <div className="co-form-group">
                  <label className="co-form-label">EXPIRY DATE</label>
                  <input
                    className="co-form-input"
                    type="text"
                    placeholder="MM / YY"
                    value={expiry}
                    onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  />
                </div>
                <div className="co-form-group">
                  <label className="co-form-label">CVC CODE</label>
                  <input
                    className="co-form-input"
                    type="text"
                    placeholder="···"
                    maxLength={4}
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  />
                </div>
              </div>
            </div>
          )}

          {paymentMethod === "instapay" && (
            <div className="alt-payment-placeholder">
              <p>You will be shown a QR code to scan using Instapay.</p>
            </div>
          )}

          {paymentMethod === "wallet" && (
            <div className="alt-payment-placeholder">
              <p>You will be redirected to complete payment via wallet.</p>
            </div>
          )}

          {paymentMethod === "apple" && (
            <div className="alt-payment-placeholder">
              <p>You will be redirected to complete payment via Apple Pay.</p>
            </div>
          )}

          {paymentMethod === "google" && (
            <div className="alt-payment-placeholder">
              <p>You will be redirected to complete payment via Google Pay.</p>
            </div>
          )}

          <div className="security-note">
            <span className="security-icon"><ShieldIcon /></span>
            <span>Your payment is encrypted and handled securely via 256-bit SSL technology.</span>
          </div>
        </section>

        {/* Right Panel */}
        <aside className="co-right-panel">
          <div className="plan-header">
            <div className="plan-icon">
              <SparkleIcon />
            </div>
            <div>
              <h2 className="plan-name">Pro Plan</h2>
              <p className="plan-billing">BILLED MONTHLY</p>
            </div>
          </div>

          <ul className="plan-features">
            {[
              "Unlimited High-Resolution Renders",
              "Advanced Lighting & Material Controls",
              "Priority Cloud Processing",
              "Full Commercial License",
            ].map((feature) => (
              <li key={feature} className="feature-item">
                <span className="feature-check"><CheckIcon /></span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <div className="price-breakdown">
            <div className="price-row">
              <span>Subscription Fee</span>
              <span>$29.00</span>
            </div>
            <div className="price-row">
              <span>Applicable Tax (8%)</span>
              <span>$2.32</span>
            </div>
          </div>

          <div className="total-row">
            <span className="total-label">TOTAL PAYMENT</span>
            <span className="total-amount">$31.32</span>
          </div>

          <button
            className={`confirm-btn ${confirming ? "confirming" : ""}`}
            onClick={handleConfirm}
          >
            <span>{confirming ? "PROCESSING..." : "CONFIRM PURCHASE"}</span>
            {!confirming && <ArrowIcon />}
          </button>

          <p className="secure-checkout-note">SECURE CHECKOUT POWERED BY INDUSTRY LEADERS.</p>

          <div className="trust-badges">
            <div className="trust-badge">
              <LockIcon />
              <span>SECURE PAYMENT</span>
            </div>
            <div className="trust-badge">
              <RefreshIcon />
              <span>MONEY BACK</span>
            </div>
          </div>
        </aside>
      </main>
          <Footer />

    </div>
  );
}
