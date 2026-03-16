import React from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import { useTranslator } from '../../../../translator/TranslatorContext';
import './GallerySidebar.css';

const GallerySidebar = ({ isOpen, onClose }) => {
  const { t } = useTranslator();
  const galleryDesigns = [
    {
      id: 1,
      title: 'Modern Living Room',
      designer: 'Sarah Johnson',
      votes: 1247,
      image: "https://images.unsplash.com/photo-1722348672102-9bf32c1b95ab",
      imageAlt: 'Spacious modern living room with gray sectional sofa, marble coffee table, and floor-to-ceiling windows'
    },
    {
      id: 2,
      title: 'Minimalist Bedroom',
      designer: 'Michael Chen',
      votes: 892,
      image: "https://images.unsplash.com/photo-1718894071528-1108a094cc78",
      imageAlt: 'Serene minimalist bedroom with white bedding, wooden platform bed, and natural light streaming through windows'
    },
    {
      id: 3,
      title: 'Industrial Kitchen',
      designer: 'Emma Rodriguez',
      votes: 1534,
      image: "https://images.unsplash.com/photo-1609767090084-ad5348a00fad",
      imageAlt: 'Contemporary industrial kitchen with exposed brick walls, stainless steel appliances, and marble countertops'
    },
    {
      id: 4,
      title: 'Cozy Home Office',
      designer: 'David Park',
      votes: 678,
      image: "https://images.unsplash.com/photo-1675848311787-d2706fce4aed",
      imageAlt: 'Warm home office space with wooden desk, ergonomic chair, bookshelves, and plants near window'
    },
    {
      id: 5,
      title: 'Luxury Bathroom',
      designer: 'Lisa Anderson',
      votes: 1123,
      image: "https://images.unsplash.com/photo-1648475233136-e291e7bed05a",
      imageAlt: 'Elegant luxury bathroom with freestanding bathtub, marble tiles, and modern fixtures'
    },
    {
      id: 6,
      title: 'Open Concept Dining',
      designer: 'James Wilson',
      votes: 945,
      image: "https://images.unsplash.com/photo-1722248240765-cba73bf26b54",
      imageAlt: 'Bright open concept dining area with wooden table, modern chairs, and pendant lighting'
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="gallery-sidebar">
      <div className="sidebar-header">
        <h2 className="sidebar-title">{t('Design Gallery')}</h2>
        <button onClick={onClose} className="close-btn">
          <Icon name="X" size={20} />
        </button>
      </div>
      <div className="gallery-content">
        {galleryDesigns?.map((design) => (
          <div key={design?.id} className="gallery-card">
            <div className="gallery-image-container">
              <Image
                src={design?.image}
                alt={design?.imageAlt}
                className="gallery-image"
              />
            </div>
            <div className="gallery-info">
              <h3 className="gallery-title">{design?.title}</h3>
              <p className="gallery-designer">{t('by')} {design?.designer}</p>
              <div className="gallery-votes">
                <Icon name="ThumbsUp" size={16} />
                <span className="votes-count">{design?.votes?.toLocaleString()} {t('votes')}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GallerySidebar;