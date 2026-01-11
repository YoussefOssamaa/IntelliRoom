import React from 'react';

const PluginCard = ({ 
  title, 
  author, 
  rating, 
  reviewCount, 
  price, 
  isFree, 
  imageGradient = true,
  votes
}) => {
  return (
    <div className="bg-background-card rounded-lg flex flex-col transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      <div className={`relative ${
        imageGradient 
          ? 'bg-gradient-to-r from-purple-200 via-purple-300 to-purple-200' 
          : 'bg-background-card'
      } border-2 border-border-secondary rounded-t-lg p-4 h-[150px] flex justify-end items-start`}>
        <button
          className={isFree ? 'btn-accent' : 'btn-primary'}
          style={{ padding: '4px 10px' }}
        >
          {isFree ? 'Free' : `${price} Credits`}
        </button>
      </div>
      <div className="p-6 flex flex-col gap-3">
        <h3 className="text-lg font-bold leading-xl text-text-primary">
          {title}
        </h3>
        <p className="text-sm font-normal leading-sm text-text-secondary">
          by {author}
        </p>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <img src="/images/img_18x14.png" alt="Rating" className="w-3.5 h-[18px]" />
            <span className="text-sm font-normal leading-sm text-text-primary ml-2">{rating}</span>
            <span className="text-sm font-normal leading-sm text-text-secondary">({reviewCount})</span>
          </div>
          <span className="text-base font-bold leading-base text-text-accent">
            {isFree ? 'Free' : `${price} Credits`}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PluginCard;
