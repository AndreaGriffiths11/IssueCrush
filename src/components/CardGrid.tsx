import React from 'react';
import CraftCard from './CraftCard';

interface CardGridProps {
  data: any[];
  renderCard?: (item: any, index: number) => React.ReactNode;
  className?: string;
  staggerDelay?: number; // Delay between each card entrance in seconds
}

/**
 * CardGrid - Grid layout with staggered entrance animation
 * 
 * Displays items in a responsive grid with choreographed fade-in effect.
 * Each card appears with a slight delay after the previous one.
 * 
 * @param data - Array of items to display
 * @param renderCard - Optional custom render function for card content
 * @param className - Additional CSS classes for the grid container
 * @param staggerDelay - Delay between each card (default: 0.1s)
 * 
 * @example
 * ```tsx
 * const data = [
 *   { id: 1, title: 'Card 1', content: 'Content 1' },
 *   { id: 2, title: 'Card 2', content: 'Content 2' },
 * ];
 * 
 * <CardGrid 
 *   data={data} 
 *   renderCard={(item) => (
 *     <div>
 *       <h3>{item.title}</h3>
 *       <p>{item.content}</p>
 *     </div>
 *   )}
 * />
 * ```
 */
export default function CardGrid({ 
  data, 
  renderCard, 
  className = '',
  staggerDelay = 0.1 
}: CardGridProps) {
  return (
    <div 
      className={`grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 ${className}`}
      style={{
        display: 'grid',
        gap: '1.5rem',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      }}
    >
      {data.map((item, index) => (
        <CraftCard 
          key={item.id || index} 
          delay={index * staggerDelay}
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-shadow"
        >
          {renderCard ? renderCard(item, index) : (
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                {item.title || `Item ${index + 1}`}
              </h3>
              <p style={{ color: '#666' }}>
                {item.content || item.description || 'No content'}
              </p>
            </div>
          )}
        </CraftCard>
      ))}
    </div>
  );
}
