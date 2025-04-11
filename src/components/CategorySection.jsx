import React from "react";

export const CategorySection = ({
  categories,
}) => {
  return (
    <div className="category-section">
      {categories.map((category, index) => (
        <div
          key={index}
          className="category-card"
        >
          <img
            src={category.image}
            alt={category.altText}
            className="category-image"
          />
          <h2 className="category-title">{category.title}</h2>
        </div>
      ))}
    </div>
  );
};

export default CategorySection;
