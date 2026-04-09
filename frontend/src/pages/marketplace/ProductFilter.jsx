import React, { useState } from 'react';

const FilterSection = ({ title, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border-b border-[#e0e0e0] py-5">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex w-full items-center justify-between text-left focus:outline-none group"
            >
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-widest group-hover:text-text-accent transition-colors">
                    {title}
                </h3>
                <svg
                    className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
            </button>
            
            {/* The content only renders and pushes elements down if isOpen is true */}
            {isOpen && (
                <div className="mt-5 animate-fade-in-down">
                    {children}
                </div>
            )}
        </div>
    );
};


const ProductFilter = ({ 
    categories = ['All', 'Seating', 'Lighting', 'Tables', 'Decor', 'Storage'],
    selectedCategory, 
    setSelectedCategory,
    
    priceRanges = ['All', 'Under $100', '$100 - $500', 'Over $500'],
    priceRange,
    setPriceRange,
    
    inStockOnly,
    setInStockOnly,

    sortOptions = ['Recommended', 'Price: Low to High', 'Price: High to Low', 'Customer Rating', 'Name: A-Z'],
    sortBy,
    setSortBy,

    materials = ['Wood', 'Metal', 'Glass', 'Velvet', 'Leather', 'Boucle'],
    selectedMaterials = [], // Safety net against undefined!
    setSelectedMaterials
}) => {

    const hasActiveFilters = 
        selectedCategory !== 'All' || 
        priceRange !== 'All' || 
        inStockOnly || 
        selectedMaterials.length > 0 ||
        sortBy !== 'Recommended';

    const clearFilters = () => {
        setSelectedCategory('All');
        setPriceRange('All');
        setInStockOnly(false);
        setSelectedMaterials([]);
        setSortBy('Recommended');
    };

    const toggleMaterial = (material) => {
        if (selectedMaterials.includes(material)) {
            setSelectedMaterials(selectedMaterials.filter(m => m !== material));
        } else {
            setSelectedMaterials([...selectedMaterials, material]);
        }
    };

    return (
        <div className="w-full bg-white p-6 rounded-2xl border border-[#e0e0e0] shadow-sm">
            
            {/* Header & Clear Button */}
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-extrabold text-text-primary tracking-tight">Filters</h2>
                {hasActiveFilters && (
                    <button 
                        onClick={clearFilters}
                        className="text-xs font-bold text-gray-400 hover:text-text-accent transition-colors uppercase tracking-wider bg-gray-50 px-3 py-1.5 rounded-md"
                    >
                        Clear All
                    </button>
                )}
            </div>

            {/* 1. Sort Section (Converted from <select> to Accordion!) */}
            <FilterSection title="Sort By" defaultOpen={false}>
                <ul className="space-y-2">
                    {sortOptions.map(option => (
                        <li key={option}>
                            <button 
                                onClick={() => setSortBy(option)}
                                className={`text-sm w-full text-left px-3 py-2 rounded-lg transition-all ${
                                    sortBy === option 
                                        ? 'bg-[#f0fdf4] text-text-accent font-bold' 
                                        : 'text-text-primary hover:bg-gray-50 hover:text-text-accent'
                                }`}
                            >
                                {option}
                            </button>
                        </li>
                    ))}
                </ul>
            </FilterSection>

            {/* 2. Category Section */}
            <FilterSection title="Category" defaultOpen={true}>
                <ul className="space-y-2">
                    {categories.map(category => (
                        <li key={category}>
                            <button 
                                onClick={() => setSelectedCategory(category)}
                                className={`text-sm w-full text-left px-3 py-2 rounded-lg transition-all ${
                                    selectedCategory === category 
                                        ? 'bg-[#f0fdf4] text-text-accent font-bold' 
                                        : 'text-text-primary hover:bg-gray-50 hover:text-text-accent'
                                }`}
                            >
                                {category}
                            </button>
                        </li>
                    ))}
                </ul>
            </FilterSection>

            {/* 3. Material Section */}
            <FilterSection title="Material" defaultOpen={false}>
                <ul className="space-y-3 px-1">
                    {materials.map(material => (
                        <li key={material} className="flex items-center group">
                            <button 
                                onClick={() => toggleMaterial(material)}
                                className="flex items-center w-full focus:outline-none"
                            >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                    selectedMaterials.includes(material) 
                                        ? 'bg-text-accent border-text-accent' 
                                        : 'border-gray-300 bg-white group-hover:border-text-accent'
                                }`}>
                                    {selectedMaterials.includes(material) && (
                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                    )}
                                </div>
                                <span className={`ml-3 text-sm transition-colors ${
                                    selectedMaterials.includes(material) ? 'text-text-accent font-bold' : 'text-text-primary group-hover:text-text-accent'
                                }`}>
                                    {material}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            </FilterSection>

            {/* 4. Price Section */}
            <FilterSection title="Price" defaultOpen={false}>
                <ul className="space-y-3 px-1">
                    {priceRanges.map(range => (
                        <li key={range} className="flex items-center group">
                            <button 
                                onClick={() => setPriceRange(range)}
                                className="flex items-center w-full focus:outline-none"
                            >
                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                                    priceRange === range 
                                        ? 'border-text-accent' 
                                        : 'border-gray-300 bg-white group-hover:border-text-accent'
                                }`}>
                                    {priceRange === range && (
                                        <div className="w-2 h-2 rounded-full bg-text-accent"></div>
                                    )}
                                </div>
                                <span className={`ml-3 text-sm transition-colors ${
                                    priceRange === range ? 'text-text-accent font-bold' : 'text-text-primary group-hover:text-text-accent'
                                }`}>
                                    {range}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            </FilterSection>

            {/* 5. Availability Section */}
            <FilterSection title="Availability" defaultOpen={true}>
                <div className="px-1 pt-1">
                    <label className="flex items-center justify-between cursor-pointer group">
                        <span className={`text-sm transition-colors ${inStockOnly ? 'text-text-accent font-bold' : 'text-text-primary group-hover:text-text-accent'}`}>
                            In Stock Only
                        </span>
                        
                        <div className="relative">
                            <input 
                                type="checkbox" 
                                className="sr-only" 
                                checked={inStockOnly}
                                onChange={() => setInStockOnly(!inStockOnly)}
                            />
                            <div 
                                className={`block w-10 h-6 rounded-full transition-colors duration-300 ${inStockOnly ? '' : 'bg-gray-200'}`}
                                style={inStockOnly ? { backgroundColor: 'var(--color-text-accent, #00e676)' } : {}}
                            ></div>
                            <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 shadow-sm ${inStockOnly ? 'transform translate-x-4' : ''}`}></div>
                        </div>
                    </label>
                </div>
            </FilterSection>
            
        </div>
    );
};

export default ProductFilter;