import React from 'react';

const SearchBar = ({ value, onChange, placeholder = "Search plugins..." }) => {
  return (
    <div className="relative w-full">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e?.target?.value)}
        placeholder={placeholder}
        className="w-full bg-background-card border-2 border-border-secondary rounded-lg px-4 py-3 text-base text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-background focus:border-transparent transition-all duration-200"
      />
      <svg
        className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary pointer-events-none"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    </div>
  );
};

export default SearchBar;
