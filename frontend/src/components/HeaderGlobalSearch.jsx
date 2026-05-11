import React, { useState, useEffect } from 'react';
import axios from '../config/axios.config';
import SearchInput from './common/SearchInput';
import { useDebounce } from '../hooks/useDebounce';

const HeaderGlobalSearch = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // 🚀 The Magic: This variable only updates 300ms AFTER the user stops typing
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    const fetchResults = async () => {
      if (!debouncedQuery) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      try {
        // Only hits the API once the typing pauses!
        const response = await axios.get(`/search?q=${debouncedQuery}`);
        if (response.data.success) {
          setResults(response.data.data);
        }
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsSearching(false);
      }
    };

    fetchResults();
  }, [debouncedQuery]); // Re-runs ONLY when the debounced query changes

  return (
    <div className="relative w-full max-w-lg">
      {/* Reusing our Dumb UI component! */}
      <SearchInput 
        value={query} 
        onChange={(e) => setQuery(e.target.value)} 
        placeholder="Search products, categories..." 
      />

      {/* Floating Results Dropdown */}
      {query && (
        <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-xl shadow-lg border border-[#e0e0e0] z-50 p-2">
          {isSearching ? (
            <div className="p-4 text-center text-sm text-gray-500">Searching...</div>
          ) : results.length > 0 ? (
            results.map(product => (
              <div key={product._id} className="p-2 hover:bg-gray-50 cursor-pointer rounded-lg">
                <div className="font-bold text-sm text-text-primary">{product.name}</div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-sm text-gray-500">No results found for "{query}"</div>
          )}
        </div>
      )}
    </div>
  );
};

export default HeaderGlobalSearch;