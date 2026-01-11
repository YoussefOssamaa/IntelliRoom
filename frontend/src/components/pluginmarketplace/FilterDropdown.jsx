import React, { useState, useRef, useEffect } from 'react';

const FilterDropdown = ({ value, onChange, options }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef?.current && !dropdownRef?.current?.contains(event?.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options?.find(opt => opt?.value === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex justify-between items-center w-full bg-background-card border-2 border-border-secondary rounded-lg px-4 py-3 text-base text-text-primary hover:border-primary-background transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-background"
      >
        <span>{selectedOption?.label || 'Select filter'}</span>
        <svg
          className={`w-4 h-4 text-text-secondary transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute z-10 w-full mt-2 bg-background-card border-2 border-border-secondary rounded-lg shadow-lg overflow-hidden">
          {options?.map((option) => (
            <button
              key={option?.value}
              onClick={() => {
                onChange(option?.value);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-3 text-left text-base transition-colors duration-150 ${
                value === option?.value
                  ? 'bg-primary-background text-primary-foreground'
                  : 'text-text-primary hover:bg-background-overlay'
              }`}
            >
              {option?.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default FilterDropdown;
