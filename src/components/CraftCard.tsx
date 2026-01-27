import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface CraftCardProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * CraftCard - A 3D tilt card with spring animations and choreographed fade-in
 * 
 * Features:
 * - 3D perspective tilt effect on mouse move
 * - Spring-based hover animation with scale
 * - Choreographed fade-in entrance with stagger support
 * - Smooth transitions with physics-based animations
 * 
 * @param children - Card content
 * @param delay - Delay in seconds for staggered entrance animation
 * @param className - Additional CSS classes (Tailwind or custom)
 * @param style - Inline styles to apply to the card
 */
export default function CraftCard({ children, delay = 0, className = '', style = {} }: CraftCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Mouse position tracking
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Spring configuration for smooth, natural motion
  const springConfig = { stiffness: 150, damping: 20, mass: 0.5 };

  // 3D rotation based on mouse position
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [7.5, -7.5]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-7.5, 7.5]), springConfig);

  // Scale for hover effect
  const scale = useSpring(1, springConfig);

  // Handle mouse move for 3D tilt effect
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Calculate normalized position (-0.5 to 0.5)
    const normalizedX = (e.clientX - centerX) / (rect.width / 2);
    const normalizedY = (e.clientY - centerY) / (rect.height / 2);

    mouseX.set(normalizedX);
    mouseY.set(normalizedY);
  };

  // Handle mouse enter
  const handleMouseEnter = () => {
    setIsHovered(true);
    scale.set(1.05);
  };

  // Handle mouse leave - reset to neutral position
  const handleMouseLeave = () => {
    setIsHovered(false);
    scale.set(1);
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      className={`craft-card ${className}`}
      style={{
        perspective: 800,
        scale,
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
        ...style,
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      // Entrance animation with stagger support
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.6,
        delay: delay,
        ease: [0.22, 1, 0.36, 1], // Custom easing for smooth entrance
      }}
      whileHover={{
        boxShadow: isHovered
          ? '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 30px -5px rgba(0, 0, 0, 0.1)'
          : '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        transition: { duration: 0.3 },
      }}
    >
      {children}
    </motion.div>
  );
}
