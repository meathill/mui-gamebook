'use client';

import { useState } from 'react';

interface StarRatingProps {
  onRate: (rating: number) => void;
  disabled?: boolean;
}

/**
 * 五星评分组件
 */
export default function StarRating({ onRate, disabled = false }: StarRatingProps) {
  const [hoveredRating, setHoveredRating] = useState(0);
  const [selectedRating, setSelectedRating] = useState(0);

  function handleClick(rating: number) {
    if (disabled) return;
    setSelectedRating(rating);
    onRate(rating);
  }

  const stars = [1, 2, 3, 4, 5];

  return (
    <div className="flex gap-2 justify-center">
      {stars.map((star) => (
        <button
          key={star}
          onClick={() => handleClick(star)}
          onMouseEnter={() => !disabled && setHoveredRating(star)}
          onMouseLeave={() => !disabled && setHoveredRating(0)}
          disabled={disabled}
          className={`text-4xl transition-transform ${
            disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-125'
          }`}
          aria-label={`评 ${star} 星`}>
          {(hoveredRating || selectedRating) >= star ? '⭐' : '☆'}
        </button>
      ))}
    </div>
  );
}
