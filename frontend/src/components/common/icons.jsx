export const CardIcon = () => (
  <svg width="28" height="20" viewBox="0 0 28 20" fill="none">
    <rect x="0.5" y="0.5" width="27" height="19" rx="3.5" stroke="currentColor" strokeOpacity="0.3"/>
    <rect y="5" width="28" height="5" fill="currentColor" fillOpacity="0.15"/>
    <rect x="3" y="13" width="8" height="2" rx="1" fill="currentColor" fillOpacity="0.4"/>
    <rect x="13" y="13" width="5" height="2" rx="1" fill="currentColor" fillOpacity="0.4"/>
  </svg>
);

export const ApplePayIcon = () => (
  <svg width="40" height="16" viewBox="0 0 40 16" fill="none">
    <text x="0" y="13" fontFamily="system-ui, -apple-system" fontSize="14" fontWeight="600" fill="currentColor">Pay</text>
  </svg>
);

export const GooglePayIcon = () => (
  <svg width="44" height="18" viewBox="0 0 44 18" fill="none">
    <text x="0" y="14" fontFamily="system-ui" fontSize="13" fontWeight="500" fill="currentColor">GPay</text>
  </svg>
);

export const SparkleIcon = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
    <path d="M11 2L12.5 8.5L19 11L12.5 13.5L11 20L9.5 13.5L3 11L9.5 8.5L11 2Z" fill="white"/>
    <path d="M17 2L17.8 5.2L21 6L17.8 6.8L17 10L16.2 6.8L13 6L16.2 5.2L17 2Z" fill="white" opacity="0.7"/>
  </svg>
);

export const ShieldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 1L2 3.5V8C2 11.5 4.5 14.5 8 15.5C11.5 14.5 14 11.5 14 8V3.5L8 1Z" stroke="currentColor" strokeWidth="1.2" fill="none"/>
    <path d="M5.5 8L7 9.5L10.5 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const LockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="2" y="6" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M4.5 6V4.5C4.5 3.12 5.62 2 7 2C8.38 2 9.5 3.12 9.5 4.5V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
);

export const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2.5 7C2.5 4.5 4.5 2.5 7 2.5C8.5 2.5 9.8 3.2 10.6 4.3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    <path d="M11.5 7C11.5 9.5 9.5 11.5 7 11.5C5.5 11.5 4.2 10.8 3.4 9.7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    <path d="M9.5 2.5L11 4.5L13 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M4.5 11.5L3 9.5L1 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2.5 7L5.5 10L11.5 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const ArrowIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);





export const InstaPayIcon = ({ size = 40, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="InstaPay"
    role="img"
  >
    {/* Background — soft purple tint */}
    <rect width="40" height="40" rx="10" fill="#dddddd" fillOpacity="0" />
 
    {/* "i" stem — purple */}
    <rect x="7" y="16" width="4" height="13" rx="1.5" fill="#b5b4b4" />
    {/* "i" dot */}
    <rect x="7" y="11" width="4" height="3.5" rx="1.5" fill="#b5b4b4" />
 
    {/* Three chevron arrows — orange, stepping right */}
    {/* Arrow 1 (leftmost, lightest) */}
    <path
      d="M14 13L18.5 20L14 27"
      stroke="#bab7b4"
      strokeWidth="2.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      opacity="0.45"
    />
    {/* Arrow 2 (middle) */}
    <path
      d="M18 13L22.5 20L18 27"
      stroke="#dddddd"
      strokeWidth="2.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      opacity="0.72"
    />
    {/* Arrow 3 (rightmost, full) */}
    <path
      d="M22 13L26.5 20L22 27"
      stroke="#bdbdbd"
      strokeWidth="2.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
 
    {/* "P" shape — purple, right side */}
    <path
      d="M28 13H31.5C33.4 13 35 14.6 35 16.5C35 18.4 33.4 20 31.5 20H28V13Z"
      fill="#dcdada"
    />
    <rect x="28" y="13" width="3.5" height="14" rx="1" fill="#dcdada" />
  </svg>
);



export const WalletIcon = ({ size = 40, color = "currentColor", className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="Wallet"
    role="img"
  >
    <rect width="40" height="40" rx="10" fill={color} fillOpacity="0" />
    <rect x="7" y="13" width="26" height="18" rx="3.5" stroke={color} strokeWidth="1.8" fill="none" />
    <path
      d="M11 13V11C11 9.9 11.9 9 13 9H27C28.1 9 29 9.9 29 11V13"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      fill="none"
    />
    <rect x="23" y="18" width="10" height="8" rx="2.5" stroke={color} strokeWidth="1.5" fill={color} fillOpacity="0.12" />
    <circle cx="28" cy="22" r="1.6" fill={color} />
  </svg>
);
