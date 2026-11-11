import React from 'react';
import './CategoryGrid.css';

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  isActive: boolean;
}

interface CategoryGridProps {
  categories: Category[];
  onCategorySelect: (category: Category) => void;
}

export const CategoryGrid: React.FC<CategoryGridProps> = ({
  categories,
  onCategorySelect
}) => {
  return (
    <div className="category-grid">
      <div className="category-header">
        <h3 className="section-title">What are you craving?</h3>
      </div>
      
      <div className="category-tiles">
        {categories.map((category) => (
          <button
            key={category.id}
            className={`category-tile ${!category.isActive ? 'disabled' : ''}`}
            onClick={() => category.isActive && onCategorySelect(category)}
            style={{
              backgroundColor: category.color
            }}
            disabled={!category.isActive}
            aria-label={`Browse ${category.name}`}
          >
            <div className="category-icon">
              <span className="icon-emoji">{category.icon}</span>
            </div>
            <span className="category-name">{category.name}</span>
            
            {!category.isActive && (
              <div className="coming-soon-badge">
                <span>Soon</span>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};