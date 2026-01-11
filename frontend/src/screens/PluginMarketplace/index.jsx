import React, { useState, useMemo, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import PluginCard from '../../components/pluginmarketplace/PluginCard';
import SearchBar from '../../components/pluginmarketplace/SearchBar';
import FilterDropdown from '../../components/pluginmarketplace/FilterDropdown';
import { getAllPlugins } from '../../services/marketplaceService';

const Marketplace = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState('recent');
  const [plugins, setPlugins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch plugins from backend
  useEffect(() => {
    const fetchPlugins = async () => {
      try {
        setLoading(true);
        const data = await getAllPlugins();
        console.log('Fetched plugins:', data);
        setPlugins(data || []);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch plugins:', err);
        setError('Failed to load plugins. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchPlugins();
  }, []);

  const filterOptions = [
    { value: 'recent', label: 'Most Recent' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'downloads', label: 'Most Downloaded' },
    { value: 'price', label: 'Most Expensive' },
  ];

  // Transform backend data to match frontend structure
  const transformedPlugins = useMemo(() => {
    return plugins.map(plugin => ({
      id: plugin._id,
      title: plugin.plugin_name,
      authorName: plugin.plugin_author?.user_name || 'Unknown',
      rating: plugin.plugin_rating || 0,
      reviewCount: plugin.plugin_reviews || 0,
      price: plugin.plugin_price || 0,
      isFree: plugin.plugin_price === 0,
      downloads: plugin.number_of_downloads || 0,
      date: plugin.createdAt || new Date().toISOString(),
      description: plugin.plugin_description,
      whatIsIncluded: plugin.what_is_included,
    }));
  }, [plugins]);

  // filter and sort plugins
  const filteredPlugins = useMemo(() => {
    let filtered = transformedPlugins.filter(plugin =>
      plugin.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plugin.authorName.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const sorted = [...filtered];
    // sort based on filter
    switch (filterBy) {
      case 'recent':
        sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
        break;
      case 'downloads':
        sorted.sort((a, b) => b.downloads - a.downloads);
        break;
      case 'rating':
        sorted.sort((a, b) => b.rating - a.rating);
        break;
      case 'price':
        sorted.sort((a, b) => b.price - a.price);
        break;
      default:
        break;
    }
    console.log('Filtered and sorted plugins:', sorted);
    return sorted;
  }, [transformedPlugins, searchQuery, filterBy]);
// ---------mock Featured and Trending Plugins - to be replaced with backend data later-------- 
  const featuredPlugins = filteredPlugins.slice(0, 3);
  const trendingPlugins = filteredPlugins.slice(0, 4);

  // Category counts - will be hardcoded for now
  const getCategoryCount = (categoryName) => {
    // this will be updated when backend supports categories
    return 0;
  };

  // ---Loading State--------
  if (loading) {
    return (
      <>
        <Helmet>
          <title>Custom Styles & Plugins</title>
        </Helmet>
        <div className="flex flex-col w-full min-h-screen bg-secondary-background">
          <Header />
          <main className="flex-1 w-full bg-background-main flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-color mx-auto mb-4"></div>
              <p className="text-text-primary">Loading plugins...</p>
            </div>
          </main>
          <Footer />
        </div>
      </>
    );
  }

  // Error State
  if (error) {
    return (
      <>
        <Helmet>
          <title>Custom Styles & Plugins</title>
        </Helmet>
        <div className="flex flex-col w-full min-h-screen bg-secondary-background">
          <Header />
          <main className="flex-1 w-full bg-background-main flex items-center justify-center">
            <div className="text-center">
              <div className="text-red-500 text-5xl mb-4">⚠️</div>
              <p className="text-text-primary text-xl mb-4">{error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="btn-primary"
              >
                Retry
              </button>
            </div>
          </main>
          <Footer />
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Custom Styles & Plugins</title>
        <meta name="description" content="Discover 1000+ custom interior design styles, presets, and AI plugins on IntelliRoom marketplace. Browse free and premium collections from top creators." />
        <meta property="og:title" content="AI Interior Design Marketplace | Custom Styles & Plugins | IntelliRoom" />
        <meta property="og:description" content="Discover 1000+ custom interior design styles, presets, and AI plugins on IntelliRoom marketplace. Browse free and premium collections from top creators." />
      </Helmet>
      <div className="flex flex-col w-full min-h-screen bg-secondary-background">
        <Header />
        
        <main className="flex-1 w-full bg-background-main">
          <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-[46px]">
            {/* top section */}
            <section className="mb-14 sm:mb-16 lg:mb-[56px]">
              <div className="flex flex-col gap-1.5">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-3xl font-bold leading-tight lg:leading-4xl text-text-primary">
                  Community Marketplace
                </h1>
                <p className="text-sm sm:text-base font-normal leading-base text-text-primary">
                  Discover and share custom styles, plugins, and presets
                </p>
              </div>
            </section>

            {/* Browse by Category  */}
            <section className="mb-16 sm:mb-20 lg:mb-[70px]">
              <h2 className="text-lg sm:text-xl md:text-2xl lg:text-2xl font-bold leading-2xl lg:leading-3xl text-text-primary mb-6">
                Browse by Category
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Style Presets */}
                <div className="group relative bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-[2px] overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative bg-background-card rounded-2xl p-6 h-full flex flex-col items-center justify-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-xl flex items-center justify-center transform group-hover:rotate-6 transition-transform duration-300">
                      <img src="/images/img_66x48.png" alt="Style Presets" className="w-10 h-12" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-xl font-bold text-text-primary mb-1">
                        Style Presets
                      </h3>
                      <p className="text-sm font-medium text-text-secondary">
                        {getCategoryCount('Style Presets')} items
                      </p>
                    </div>
                  </div>
                </div>

                {/* Custom Configs */}
                <div className="group relative bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-[2px] overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative bg-background-card rounded-2xl p-6 h-full flex flex-col items-center justify-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-xl flex items-center justify-center transform group-hover:rotate-6 transition-transform duration-300">
                      <img src="/images/img_1.png" alt="Custom Configs" className="w-10 h-12" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-xl font-bold text-text-primary mb-1">
                        Custom Configs
                      </h3>
                      <p className="text-sm font-medium text-text-secondary">
                        {getCategoryCount('Custom Configs')} items
                      </p>
                    </div>
                  </div>
                </div>

                {/* Plugins */}
                <div className="group relative bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-[2px] overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative bg-background-card rounded-2xl p-6 h-full flex flex-col items-center justify-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-400 rounded-xl flex items-center justify-center transform group-hover:rotate-6 transition-transform duration-300">
                      <img src="/images/img_2.png" alt="Plugins" className="w-10 h-12" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-xl font-bold text-text-primary mb-1">
                        Plugins
                      </h3>
                      <p className="text-sm font-medium text-text-secondary">
                        {getCategoryCount('Plugins')} items
                      </p>
                    </div>
                  </div>
                </div>

                {/* Collections */}
                <div className="group relative bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-[2px] overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative bg-background-card rounded-2xl p-6 h-full flex flex-col items-center justify-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-400 rounded-xl flex items-center justify-center transform group-hover:rotate-6 transition-transform duration-300">
                      <img src="/images/img_3.png" alt="Collections" className="w-10 h-12" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-xl font-bold text-text-primary mb-1">
                        Collections
                      </h3>
                      <p className="text-sm font-medium text-text-secondary">
                        {getCategoryCount('Collections')} items
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Become a Creator  */}
            <section className="mb-16 sm:mb-20 lg:mb-[122px]">
              <div className="w-full bg-gradient-to-br from-primary-dark to-primary-background rounded-lg p-7 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 lg:gap-0">
                <div className="flex flex-col gap-1">
                  <h2 className="text-lg sm:text-xl lg:text-xl font-bold leading-2xl text-primary-foreground">
                    Become a Creator
                  </h2>
                  <p className="text-sm sm:text-base font-normal leading-base text-primary-foreground">
                    Share your custom styles and earn credits with every download
                  </p>
                </div>
                <button className="btn-primary" style={{ padding: '8px 22px' }}>
                  Start Creating
                </button>
              </div>
            </section>

            {/* Featured This Week  */}
            <section className="mb-16 sm:mb-20 lg:mb-[64px]">
              <h2 className="text-lg sm:text-xl md:text-2xl lg:text-2xl font-bold leading-2xl lg:leading-3xl text-text-primary mb-4">
                Featured This Week
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {featuredPlugins.map((plugin) => (
                  <PluginCard 
                    key={plugin.id}
                    title={plugin.title} 
                    author={plugin.authorName} 
                    rating={plugin.rating} 
                    reviewCount={plugin.reviewCount} 
                    price={plugin.price} 
                    isFree={plugin.isFree}
                    votes={plugin.votes}
                  />
                ))}
              </div>
            </section>

            {/* Trending Now  */}
            <section className="mb-12 sm:mb-16 lg:mb-[48px]">
              <h2 className="text-lg sm:text-xl md:text-2xl lg:text-2xl font-bold leading-2xl lg:leading-3xl text-text-primary mb-3.5 sm:mb-4 lg:mb-[14px]">
                Trending Now
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                {trendingPlugins.map((plugin) => (
                  <PluginCard 
                    key={plugin.id}
                    title={plugin.title} 
                    author={plugin.authorName} 
                    rating={plugin.rating} 
                    reviewCount={plugin.reviewCount} 
                    price={plugin.price} 
                    isFree={plugin.isFree}
                    votes={plugin.votes}
                  />
                ))}
              </div>
            </section>

            {/* All Items Search and Filters */}
            <section>
              <div className="flex flex-col gap-6">
                <h2 className="text-lg sm:text-xl md:text-2xl lg:text-2xl font-bold leading-2xl lg:leading-3xl text-text-primary">
                  All Items
                </h2>
                
                {/* Search and Filter Controls */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <SearchBar 
                      value={searchQuery}
                      onChange={setSearchQuery}
                      placeholder="Search by name or author..."
                    />
                  </div>
                  <div className="sm:w-64">
                    <FilterDropdown
                      value={filterBy}
                      onChange={setFilterBy}
                      options={filterOptions}
                    />
                  </div>
                </div>

                {/* Results Count */}
                <p className="text-sm text-text-secondary">
                  Showing {filteredPlugins.length} of {transformedPlugins.length} items
                </p>

                {/* Plugin Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                  {filteredPlugins.length > 0 ? (
                    filteredPlugins.map((plugin) => (
                      <PluginCard
                        key={plugin.id}
                        title={plugin.title}
                        author={plugin.authorName}
                        rating={plugin.rating}
                        reviewCount={plugin.reviewCount}
                        price={plugin.price}
                        isFree={plugin.isFree}
                        votes={plugin.votes}
                      />
                    ))
                  ) : (
                    <div className="col-span-4 text-center py-12">
                      <p className="text-text-secondary text-lg">No plugins found. Try adjusting your search or filters.</p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Marketplace;
