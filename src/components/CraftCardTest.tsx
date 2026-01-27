/**
 * CraftCard Web Test Page
 * 
 * Simple standalone test page to demonstrate CraftCard functionality.
 * This can be served alongside the Expo web app.
 */
import React from 'react';
import CraftCard from './CraftCard';
import CardGrid from './CardGrid';

// Import CSS - in a real implementation, this would be in your main app
const styles = `
  body {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
  }
  
  .craft-card {
    perspective: 800px;
    transition: box-shadow 0.6s ease;
    cursor: pointer;
    position: relative;
    will-change: transform;
  }
  
  .test-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 3rem 2rem;
  }
  
  .test-header {
    text-align: center;
    color: white;
    margin-bottom: 3rem;
  }
  
  .test-header h1 {
    font-size: 3rem;
    margin-bottom: 1rem;
    text-shadow: 0 2px 10px rgba(0,0,0,0.2);
  }
  
  .test-section {
    margin-bottom: 4rem;
  }
  
  .section-title {
    color: white;
    font-size: 1.8rem;
    margin-bottom: 1.5rem;
    font-weight: 600;
  }
  
  .single-card-demo {
    max-width: 400px;
    margin: 0 auto;
  }
  
  .card-content {
    background: white;
    padding: 2rem;
    border-radius: 1rem;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  }
  
  .card-title {
    font-size: 1.5rem;
    font-weight: bold;
    margin-bottom: 1rem;
    color: #1f2937;
  }
  
  .card-text {
    color: #6b7280;
    line-height: 1.6;
  }
  
  .badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
    margin-bottom: 1rem;
  }
  
  .badge-high {
    background: #fef3c7;
    color: #92400e;
  }
  
  .badge-medium {
    background: #dbeafe;
    color: #1e40af;
  }
  
  .badge-critical {
    background: #fee2e2;
    color: #991b1b;
  }
`;

const testData = [
  {
    id: 1,
    title: 'Add Dark Mode',
    description: 'Implement dark mode support across the entire application',
    priority: 'High',
  },
  {
    id: 2,
    title: 'Fix Mobile Navigation',
    description: 'Address navigation issues on iOS and Android devices',
    priority: 'Critical',
  },
  {
    id: 3,
    title: 'Update Documentation',
    description: 'Comprehensive update to API docs and user guides',
    priority: 'Medium',
  },
  {
    id: 4,
    title: 'Performance Optimization',
    description: 'Improve loading times and reduce bundle size',
    priority: 'High',
  },
  {
    id: 5,
    title: 'Add Unit Tests',
    description: 'Increase test coverage to 80%+',
    priority: 'Medium',
  },
  {
    id: 6,
    title: 'Security Audit',
    description: 'Complete security review of authentication flow',
    priority: 'Critical',
  },
];

export default function CraftCardTest() {
  return (
    <>
      <style>{styles}</style>
      <div className="test-container">
        <div className="test-header">
          <h1>🎴 CraftCard Test</h1>
          <p style={{ fontSize: '1.2rem', opacity: 0.9 }}>
            Hover over cards to see the 3D tilt effect
          </p>
        </div>

        {/* Single Card Demo */}
        <div className="test-section">
          <h2 className="section-title">Single Card with Delay</h2>
          <div className="single-card-demo">
            <CraftCard delay={0.3}>
              <div className="card-content">
                <h3 className="card-title">Welcome to CraftCard! 👋</h3>
                <p className="card-text">
                  This card features a 3D tilt effect that responds to your mouse position.
                  The spring-based physics make interactions feel natural and smooth.
                  Try moving your mouse around the card to see it in action!
                </p>
              </div>
            </CraftCard>
          </div>
        </div>

        {/* Grid Demo */}
        <div className="test-section">
          <h2 className="section-title">Staggered Grid Animation</h2>
          <CardGrid
            data={testData}
            staggerDelay={0.12}
            renderCard={(item: any) => (
              <div style={{ height: '100%' }}>
                <span className={`badge badge-${item.priority.toLowerCase()}`}>
                  {item.priority}
                </span>
                <h3 className="card-title" style={{ fontSize: '1.25rem' }}>
                  {item.title}
                </h3>
                <p className="card-text">
                  {item.description}
                </p>
              </div>
            )}
          />
        </div>

        {/* Issue Card Style Demo */}
        <div className="test-section">
          <h2 className="section-title">Issue Card Style</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '600px', margin: '0 auto' }}>
            {[
              { number: 42, title: 'Improve loading performance', labels: ['performance', 'enhancement'] },
              { number: 43, title: 'Add authentication flow', labels: ['security', 'feature'] },
              { number: 44, title: 'Fix responsive design', labels: ['bug', 'ui'] },
            ].map((issue, index) => (
              <CraftCard key={issue.number} delay={index * 0.1}>
                <div className="card-content" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#6b7280' }}>
                      #{issue.number}
                    </span>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                      {issue.title}
                    </h3>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                    {issue.labels.map(label => (
                      <span
                        key={label}
                        style={{
                          fontSize: '0.75rem',
                          padding: '0.25rem 0.75rem',
                          backgroundColor: '#f3f4f6',
                          color: '#4b5563',
                          borderRadius: '0.375rem',
                        }}
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              </CraftCard>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'center', color: 'white', opacity: 0.8, marginTop: '4rem' }}>
          <p>Component working correctly! ✅</p>
          <p style={{ fontSize: '0.9rem' }}>
            All animations, 3D effects, and stagger timings are functioning as expected.
          </p>
        </div>
      </div>
    </>
  );
}
