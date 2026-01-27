/**
 * CraftCard Demo - Example usage of CraftCard component
 * 
 * This file demonstrates how to use the CraftCard component with staggered animations.
 * For web-based React projects using Expo.
 */

import React from 'react';
import CraftCard from './CraftCard';
import CardGrid from './CardGrid';
import './CraftCard.css'; // Import global styles

// Example data
const sampleData = [
  {
    id: 1,
    title: 'Feature Request',
    description: 'Add dark mode support to the application',
    priority: 'High',
  },
  {
    id: 2,
    title: 'Bug Fix',
    description: 'Fix navigation issue on mobile devices',
    priority: 'Critical',
  },
  {
    id: 3,
    title: 'Documentation',
    description: 'Update API documentation with new endpoints',
    priority: 'Medium',
  },
  {
    id: 4,
    title: 'Performance',
    description: 'Optimize image loading performance',
    priority: 'High',
  },
];

/**
 * Example 1: Single CraftCard with custom delay
 */
export function SingleCardExample() {
  return (
    <div style={{ padding: '2rem', maxWidth: '400px', margin: '0 auto' }}>
      <CraftCard delay={0.2} className="bg-white rounded-lg shadow-md p-6">
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          Single Card Example
        </h2>
        <p style={{ color: '#666' }}>
          This card has a 3D tilt effect on hover and a choreographed fade-in entrance.
          Try hovering over it to see the spring-based animations in action!
        </p>
      </CraftCard>
    </div>
  );
}

/**
 * Example 2: CardGrid with staggered entrance
 */
export function GridExample() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem', textAlign: 'center' }}>
        Staggered Card Grid
      </h1>
      <CardGrid
        data={sampleData}
        staggerDelay={0.1}
        renderCard={(item: any) => (
          <>
            <div style={{ 
              display: 'inline-block',
              padding: '0.25rem 0.75rem',
              backgroundColor: item.priority === 'Critical' ? '#dc2626' : 
                              item.priority === 'High' ? '#f59e0b' : '#6b7280',
              color: 'white',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: '600',
              marginBottom: '1rem',
            }}>
              {item.priority}
            </div>
            <h3 style={{ 
              fontSize: '1.25rem', 
              fontWeight: 'bold', 
              marginBottom: '0.5rem',
              color: '#111827',
            }}>
              {item.title}
            </h3>
            <p style={{ color: '#6b7280', lineHeight: '1.6' }}>
              {item.description}
            </p>
          </>
        )}
      />
    </div>
  );
}

/**
 * Example 3: Manual CraftCard usage with custom content
 */
export function CustomContentExample() {
  const issues = [
    { id: 1, number: 42, title: 'Improve loading performance' },
    { id: 2, number: 43, title: 'Add authentication flow' },
    { id: 3, number: 44, title: 'Fix responsive design issues' },
  ];

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem' }}>
        Custom Card Layout
      </h1>
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '1rem',
        maxWidth: '600px',
        margin: '0 auto',
      }}>
        {issues.map((issue, index) => (
          <CraftCard 
            key={issue.id} 
            delay={index * 0.15}
            style={{
              padding: '1.5rem',
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              border: '1px solid #e5e7eb',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: '#6b7280',
              }}>
                #{issue.number}
              </span>
              <h3 style={{ 
                fontSize: '1.125rem', 
                fontWeight: '600',
                color: '#111827',
              }}>
                {issue.title}
              </h3>
            </div>
          </CraftCard>
        ))}
      </div>
    </div>
  );
}

/**
 * Main Demo Component - Combine all examples
 */
export default function CraftCardDemo() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '2rem 0' }}>
      <SingleCardExample />
      <div style={{ margin: '4rem 0' }} />
      <GridExample />
      <div style={{ margin: '4rem 0' }} />
      <CustomContentExample />
    </div>
  );
}
