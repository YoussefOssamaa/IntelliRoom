import React from 'react';

const SearchInput = ({ value, onChange, placeholder = "Search...", className = "" }) => {
  return (
    <div className={`relative w-full ${className}`}>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2 border border-[#e0e0e0] rounded-xl focus:ring-2 focus:ring-text-accent outline-none text-sm bg-white"
      />
      <svg
        className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </div>
  );
};

export default SearchInput;