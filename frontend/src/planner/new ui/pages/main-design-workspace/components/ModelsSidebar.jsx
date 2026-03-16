import React, { useState, useMemo } from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import {
  MODE_3D_VIEW, MODE_3D_FIRST_PERSON, MODE_APPLYING_TEXTURE,
  MODE_DRAWING_ITEM_3D, MODE_DRAGGING_ITEM_3D,
  MODE_DRAWING_HOLE_3D, MODE_DRAGGING_HOLE_3D,
} from '../../../../constants';
import './ModelsSidebar.css';

const ModelsSidebar = ({ isOpen, onClose, catalog, itemsActions, holesActions, textureActions, plannerState }) => {
  const [selectedCategory, setSelectedCategory] = useState('office');
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [expandedSection, setExpandedSection] = useState('catalog');

  // Get active texture from planner state
  const mode = plannerState ? plannerState.get('mode') : null;
  const textureApplication = plannerState ? plannerState.get('textureApplication') : null;
  const activeTextureKey = mode === MODE_APPLYING_TEXTURE && textureApplication ? textureApplication.get('textureKey') : null;
  const activeTextureTargetType = mode === MODE_APPLYING_TEXTURE && textureApplication ? textureApplication.get('targetType') : null;

  // Get catalog items and organize them by category
  const catalogItems = useMemo(() => {
    if (!catalog || !catalog.elements) return [];
    
    const items = [];
    const elements = catalog.elements;
    
    for (let key in elements) {
      const element = elements[key];
      // Only include items (not lines, holes, or areas)
      if (element.prototype === 'items' && element.info) {
        // Get category from first tag, or use 'other' as fallback
        const primaryCategory = (element.info.tag && element.info.tag.length > 0) 
          ? element.info.tag[0].toLowerCase() 
          : 'other';
        
        items.push({
          id: key,
          name: element.info.title || key,
          type: key,
          category: primaryCategory,
          tags: element.info.tag || [],
          image: element.info.image || null,
          prototype: 'items'
        });
      }
    }
    
    return items;
  }, [catalog]);

  // Get doors and windows from catalog
  const catalogHoles = useMemo(() => {
    if (!catalog || !catalog.elements) return { doors: [], windows: [] };
    
    const doors = [];
    const windows = [];
    const elements = catalog.elements;
    
    for (let key in elements) {
      const element = elements[key];
      if (element.prototype === 'holes' && element.info) {
        const tags = element.info.tag || [];
        const item = {
          id: key,
          name: element.info.title || element.name || key,
          type: element.name,
          image: element.info.image || null,
          tags: tags,
          prototype: 'holes'
        };
        
        if (tags.some(tag => tag.toLowerCase().includes('door'))) {
          doors.push(item);
        } else if (tags.some(tag => tag.toLowerCase().includes('window'))) {
          windows.push(item);
        }
      }
    }
    
    return { doors, windows };
  }, [catalog]);

  // Get available textures from catalog elements (walls and areas)
  const catalogTextures = useMemo(() => {
    if (!catalog || !catalog.elements) return { wall: [], floor: [] };
    
    const wallTextures = [];
    const floorTextures = [];
    const elements = catalog.elements;
    
    for (let key in elements) {
      const element = elements[key];
      if (element.textures && Object.keys(element.textures).length > 0) {
        const textureEntries = Object.entries(element.textures);
        for (const [texKey, texData] of textureEntries) {
          const textureItem = {
            id: `${key}-${texKey}`,
            textureKey: texKey,
            name: texData.name || texKey,
            image: texData.uri || null,
            sourceElement: key
          };
          
          if (element.prototype === 'lines') {
            textureItem.targetType = 'wall';
            wallTextures.push(textureItem);
          } else if (element.prototype === 'areas') {
            textureItem.targetType = 'floor';
            floorTextures.push(textureItem);
          }
        }
      }
    }
    
    return { wall: wallTextures, floor: floorTextures };
  }, [catalog]);

  // Get icon based on category
  function getCategoryIcon(category) {
    const iconMap = {
      'kitchen': 'UtensilsCrossed',
      'bathroom': 'Bath',
      'livingroom': 'Sofa',
      'bedroom': 'Bed',
      'office': 'Briefcase',
      'lighting': 'Lightbulb',
      'decoration': 'Flower',
      'storage': 'Archive',
      'electronics': 'Tv',
      'furniture': 'Armchair',
      'furnishings': 'Armchair',
      'furnishing': 'Armchair',
      'table': 'Table',
      'security': 'Shield',
      'telecomunication': 'Wifi',
      'metal': 'HardDrive',
      'wood': 'Trees',
      'text': 'Type',
      'image': 'Image',
      'other': 'Package'
    };
    return iconMap[category.toLowerCase()] || 'Package';
  }

  // Generate catalog categories dynamically from catalog items
  const catalogCategories = useMemo(() => {
    const categorySet = new Set();
    catalogItems.forEach(item => {
      if (item.category) {
        categorySet.add(item.category);
      }
    });
    
    return Array.from(categorySet).map(cat => ({
      id: cat,
      label: cat.charAt(0).toUpperCase() + cat.slice(1).replace(/([A-Z])/g, ' $1').trim(),
      icon: getCategoryIcon(cat)
    }));
  }, [catalogItems]);

  const categories = {
    personal: {
      title: 'Personal',
      items: [
        { id: 'recentlyUsed', label: 'Recently Used', icon: 'Clock' },
        { id: 'favorites', label: 'Favorites', icon: 'Star' }
      ]
    },
    explore: {
      title: 'Explore',
      items: [
        { id: 'recommended', label: 'Recommended', icon: 'TrendingUp' },
        { id: 'hot', label: 'Hot', icon: 'Flame' }
      ]
    },
    catalog: {
      title: 'Catalog',
      items: [
        ...catalogCategories.length > 0 ? catalogCategories : [
          { id: 'kitchen', label: 'Kitchen Furniture', icon: 'UtensilsCrossed' },
          { id: 'bathroom', label: 'Bathroom', icon: 'Bath' },
          { id: 'livingRoom', label: 'Living Room', icon: 'Sofa' },
          { id: 'bedroom', label: 'Bedroom', icon: 'Bed' },
          { id: 'office', label: 'Office', icon: 'Briefcase' },
          { id: 'lighting', label: 'Lighting', icon: 'Lightbulb' },
          { id: 'decorations', label: 'Decorations', icon: 'Flower' },
          { id: 'storage', label: 'Storage', icon: 'Archive' },
          { id: 'electronics', label: 'Electronics', icon: 'Tv' }
        ],
        { 
          id: 'construction', 
          label: 'Construction', 
          icon: 'HardHat',
          hasSubcategories: true,
          subcategories: [
            { id: 'doors', label: 'Doors', icon: 'DoorOpen' },
            { id: 'windows', label: 'Windows', icon: 'RectangleHorizontal' },
            { id: 'textures', label: 'Textures', icon: 'Paintbrush' }
          ]
        }
      ]
    }
  };

  // Filter models based on selected category
  const filteredModels = useMemo(() => {
    // Skip filtering for personal/explore categories (empty for now)
    if (['recentlyUsed', 'favorites', 'recommended', 'hot'].includes(selectedCategory)) {
      return [];
    }
    
    // Handle construction subcategories
    if (selectedSubcategory === 'doors') {
      return catalogHoles.doors;
    } else if (selectedSubcategory === 'windows') {
      return catalogHoles.windows;
    } else if (selectedSubcategory === 'textures') {
      // Combine wall and floor textures with a section marker
      return [
        ...catalogTextures.wall.map(t => ({ ...t, prototype: 'texture' })),
        ...catalogTextures.floor.map(t => ({ ...t, prototype: 'texture' }))
      ];
    }
    
    // For catalog categories, filter by category
    return catalogItems.filter(item => item.category === selectedCategory);
  }, [catalogItems, catalogHoles, catalogTextures, selectedCategory, selectedSubcategory]);

  // Handle item click to add to scene
  const handleItemClick = (item) => {

    // Handle texture selection
    if (item.prototype === 'texture') {
      if (textureActions) {
        textureActions.selectTexture(item.textureKey, item.targetType);
      }
      return;
    }

    if (!item.type) {
      return;
    }

    // Check if we're in 3D view mode
    const mode = plannerState ? plannerState.get('mode') : null;
    const isIn3DView = mode === MODE_3D_VIEW || mode === MODE_3D_FIRST_PERSON
      || mode === MODE_DRAWING_ITEM_3D || mode === MODE_DRAGGING_ITEM_3D
      || mode === MODE_DRAWING_HOLE_3D || mode === MODE_DRAGGING_HOLE_3D
      || mode === MODE_APPLYING_TEXTURE;

    if (item.prototype === 'holes') {
      // Handle holes (doors/windows) - they use holesActions
      if (holesActions) {
        if (isIn3DView) {
          // Use 3D hole placement to stay in 3D view
          holesActions.selectToolDrawingHole3D(item.type);
        } else {
          holesActions.selectToolDrawingHole(item.type);
        }
      }
    } else if (item.prototype === 'items') {
      // Handle items - they use itemsActions
      if (itemsActions) {
        if (isIn3DView) {
          itemsActions.selectToolDrawingItem3D(item.type);
        } else {
          itemsActions.selectToolDrawingItem(item.type);
        }
      }
    }
  };

  // Handle category click
  const handleCategoryClick = (categoryId, hasSubcategories) => {
    if (hasSubcategories) {
      // For construction, don't change selected category, just toggle expansion
      if (selectedCategory === categoryId) {
        setSelectedCategory(null);
        setSelectedSubcategory(null);
      } else {
        setSelectedCategory(categoryId);
        setSelectedSubcategory(null);
      }
    } else {
      setSelectedCategory(categoryId);
      setSelectedSubcategory(null);
    }
  };

  // Handle subcategory click
  const handleSubcategoryClick = (subcategoryId) => {
    setSelectedSubcategory(subcategoryId);
  };

  if (!isOpen) return null;

  return (
    <div className="models-sidebar">
      {/* Left Category Browser */}
      <div className="category-browser">
        <div className="sidebar-header">
          <h2 className="sidebar-title">Categories</h2>
          <button onClick={onClose} className="close-btn">
            <Icon name="X" size={20} />
          </button>
        </div>

        <div className="sidebar-content">
          {Object.entries(categories)?.map(([sectionKey, section]) => (
            <div key={sectionKey} className="section-group">
              <button
                onClick={() => setExpandedSection(expandedSection === sectionKey ? null : sectionKey)}
                className="section-header"
              >
                <span className="section-title">{section?.title}</span>
                <Icon
                  name="ChevronDown"
                  size={20}
                  className={`chevron-icon ${expandedSection === sectionKey ? 'rotated' : ''}`}
                />
              </button>

              {expandedSection === sectionKey && (
                <div className="category-list">
                  {section?.items?.map((item) => (
                    <div key={item?.id}>
                      <button
                        onClick={() => handleCategoryClick(item?.id, item?.hasSubcategories)}
                        className={`category-item ${selectedCategory === item?.id || (item?.hasSubcategories && selectedCategory === item?.id) ? 'active' : ''}`}
                      >
                        <Icon name={item?.icon} size={18} />
                        <span className="category-label">{item?.label}</span>
                        {item?.hasSubcategories && (
                          <Icon 
                            name="ChevronDown" 
                            size={16} 
                            className={`subcategory-chevron ${selectedCategory === item?.id ? 'rotated' : ''}`}
                          />
                        )}
                      </button>
                      
                      {/* Subcategories */}
                      {item?.hasSubcategories && selectedCategory === item?.id && (
                        <div className="subcategory-list">
                          {item?.subcategories?.map((sub) => (
                            <button
                              key={sub?.id}
                              onClick={() => handleSubcategoryClick(sub?.id)}
                              className={`subcategory-item ${selectedSubcategory === sub?.id ? 'active' : ''}`}
                            >
                              <Icon name={sub?.icon} size={16} />
                              <span className="subcategory-label">{sub?.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right Model Grid */}
      <div className="models-grid-container">
        <div className="models-grid-header">
          <h3 className="models-grid-title">
            {selectedSubcategory === 'textures' ? 'Textures' : 'Models'}
          </h3>
          {selectedSubcategory === 'textures' && activeTextureKey && (
            <button 
              className="cancel-texture-btn"
              onClick={() => {
                if (textureActions) textureActions.cancelTextureApplication();
              }}
            >
              <Icon name="X" size={14} />
              <span>Cancel</span>
            </button>
          )}
        </div>

        {selectedSubcategory === 'textures' && (
          <div className="texture-instructions">
            {activeTextureKey 
              ? `Click on a ${activeTextureTargetType === 'wall' ? 'wall side' : 'floor'} in 3D view to apply "${activeTextureKey}" texture`
              : 'Select a texture below, then click on a wall side or floor in 3D view to apply it'
            }
          </div>
        )}

        <div className="models-grid">
          {filteredModels?.map((model) => {
            const isTexture = model?.prototype === 'texture';
            const isActiveTexture = isTexture && activeTextureKey === model?.textureKey && activeTextureTargetType === model?.targetType;
            
            return (
              <div 
                key={model?.id} 
                className={`model-card ${isActiveTexture ? 'texture-active' : ''} ${isTexture ? 'texture-card' : ''}`}
                onClick={() => handleItemClick(model)}
                style={{ cursor: 'pointer' }}
              >
                {model?.image ? (
                  <div className="model-image-container">
                    <Image
                      src={model?.image}
                      alt={model?.name}
                      className="model-image"
                    />
                  </div>
                ) : (
                  <div className="model-image-container model-placeholder">
                    <Icon name={isTexture ? 'Paintbrush' : 'Package'} size={40} />
                  </div>
                )}
                <div className="model-info">
                  <h4 className="model-name">{model?.name}</h4>
                  {isTexture && (
                    <span className={`texture-type-badge ${model?.targetType}`}>
                      {model?.targetType === 'wall' ? 'Wall' : 'Floor'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ModelsSidebar;