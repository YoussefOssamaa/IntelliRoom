import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Package } from 'lucide-react';

const SearchInput = ({ 
  value, 
  onChange, 
  placeholder = "Search...", 
  className = "", 
  delay = 300,
  searchResults = null, 
  isSearching = false,
  onResultClick = null,
  onSearchSubmit = null 
}) => {
  // We keep a local state to allow the input field to update instantly as the user types.
  const [localValue, setLocalValue] = useState(value || '');
  const [isFocused, setIsFocused] = useState(false);
  const wrapperRef = useRef(null);

  // Keep the local state in sync if the parent changes the 'value' prop directly
  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  // This is the debounced function that actually notifies the parent component
  const debouncedOnChange = useCallback(
    (currentValue) => {
      // We pass a mock event object to maintain compatibility with your existing onChange handlers
      onChange({ target: { value: currentValue } });
    },
    [onChange]
  );

  useEffect(() => {
    // Set a timer to execute the debounced function after the specified delay
    const timerId = setTimeout(() => {
      // Only notify the parent if the local value actually differs from the prop value
      if (localValue !== value) {
         debouncedOnChange(localValue);
      }
    }, delay);

    // Cleanup function: If the user types again before the delay finishes, 
    // clear the previous timer and start a new one. This is the core of debouncing!
    return () => clearTimeout(timerId);
  }, [localValue, value, delay, debouncedOnChange]);

  // Handle clicking outside the component to close the dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    // Update the local state instantly for a snappy UI
    setLocalValue(e.target.value);
  };

  // --- NEW: Detect "Enter" key press ---
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && localValue.trim().length > 0) {
      setIsFocused(false);
      if (onSearchSubmit) onSearchSubmit(localValue);
    }
  };

  const handleItemClick = (item) => {
    if (onResultClick) {
      onResultClick(item);
    }
    setIsFocused(false);
  };

  // --- SAFETY FALLBACK: Local Filtering ---
  // Just in case the backend returns all products instead of filtering by the query, 
  // we do a secondary strict filter here on the frontend so the UI always looks correct.
  const filteredResults = searchResults 
    ? searchResults.filter(item => {
        const searchStr = localValue.toLowerCase().trim();
        const nameMatch = item.name && item.name.toLowerCase().includes(searchStr);
        const brandMatch = item.brand && item.brand.toLowerCase().includes(searchStr);
        return nameMatch || brandMatch;
      })
    : null;

  // Only show the dropdown if the user is focused, has typed something, 
  // and we either have filtered results or are currently searching
  const showDropdown = isFocused && localValue.trim().length > 0 && (filteredResults !== null || isSearching);

  return (
    <div ref={wrapperRef} className={`relative w-full ${className}`}>
      <input
        type="text"
        value={localValue}
        onChange={handleInputChange}
        onFocus={() => setIsFocused(true)}
        onKeyDown={handleKeyDown} 
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

      {/* --- The Dropdown Menu --- */}
      {showDropdown && (
        <div className="absolute top-full left-0 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-lg z-50 overflow-hidden max-h-96 flex flex-col">
          {isSearching ? (
            <div className="p-4 text-center text-sm text-gray-500 animate-pulse">
              Searching...
            </div>
          ) : (
            <>
              {/* Scrollable Results List */}
              <ul className="divide-y divide-gray-100 overflow-y-auto">
                {filteredResults && filteredResults.length > 0 ? (
                  filteredResults.map((result) => (
                    <li 
                      key={result._id} 
                      onClick={() => handleItemClick(result)}
                      className="p-3 hover:bg-gray-50 cursor-pointer flex items-center gap-3 transition-colors"
                    >
                      {/* Thumbnail Image */}
                      {/* {result.media?.primaryImage ? (
                        <img src={result.media.primaryImage} alt={result.name} className="w-10 h-10 object-cover rounded-md border border-gray-200" />
                      ) : (
                        <div className="w-10 h-10 bg-gray-100 rounded-md border border-gray-200 flex items-center justify-center">
                          <Package className="w-5 h-5 text-gray-400" />
                        </div>
                      )} */}
                      
                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{result.name}</p>
                        {result.brand && (
                          <p className="text-xs text-gray-500 truncate">{result.brand}</p>
                        )}
                      </div>
                      
                      {/* Price */}
                      {result.pricing?.currentPrice && (
                        <div className="text-sm font-bold text-gray-900">
                          ${result.pricing.currentPrice.toFixed(2)}
                        </div>
                      )}
                    </li>
                  ))
                ) : (
                  <li className="p-4 text-center text-sm text-gray-500">
                    No exact matches found for "{localValue}"
                  </li>
                )}
              </ul>
              
              <div 
                onClick={() => {
                  setIsFocused(false);
                  if (onSearchSubmit) onSearchSubmit(localValue);
                }}
                className="p-3 bg-gray-50 hover:bg-sky-50 cursor-pointer flex items-center justify-center gap-2 border-t border-gray-200 text-sky-600 font-bold transition-colors sticky bottom-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                See all results for "{localValue}"
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchInput;