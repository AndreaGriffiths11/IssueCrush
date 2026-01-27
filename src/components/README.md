# CraftCard Component

A drop-in 3D tilt card component with spring animations and choreographed fade-in effects.

## Features

- ✨ **3D Tilt Effect** - Cards tilt based on mouse position with smooth spring physics
- 🎯 **Spring Hover Animation** - Smooth scale and shadow transitions on hover
- 🎬 **Choreographed Fade-in** - Staggered entrance animations for multiple cards
- 🎨 **Tailwind-Ready** - Works with Tailwind CSS or custom CSS
- ⚡ **Performance** - Optimized with hardware acceleration and `will-change`

## Installation

```bash
npm install framer-motion
# Tailwind CSS is optional but recommended
```

## Quick Start

### Single Card

```tsx
import CraftCard from './components/CraftCard';
import './components/CraftCard.css'; // Import styles

function MyComponent() {
  return (
    <CraftCard delay={0.2}>
      <h2>My Card Title</h2>
      <p>Card content goes here...</p>
    </CraftCard>
  );
}
```

### Card Grid with Staggered Animation

```tsx
import { CardGrid } from './components';
import './components/CraftCard.css';

function MyGrid() {
  const data = [
    { id: 1, title: 'Card 1', content: 'Content 1' },
    { id: 2, title: 'Card 2', content: 'Content 2' },
    { id: 3, title: 'Card 3', content: 'Content 3' },
  ];

  return (
    <CardGrid
      data={data}
      staggerDelay={0.1}
      renderCard={(item) => (
        <>
          <h3>{item.title}</h3>
          <p>{item.content}</p>
        </>
      )}
    />
  );
}
```

## API Reference

### CraftCard

Props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `React.ReactNode` | required | Card content |
| `delay` | `number` | `0` | Delay in seconds for entrance animation |
| `className` | `string` | `''` | Additional CSS classes |

### CardGrid

Props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `any[]` | required | Array of items to display |
| `renderCard` | `(item, index) => React.ReactNode` | optional | Custom render function for card content |
| `className` | `string` | `''` | Additional CSS classes for the grid |
| `staggerDelay` | `number` | `0.1` | Delay between each card entrance in seconds |

## Styling

### With Tailwind CSS

```tsx
<CraftCard className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl">
  {/* content */}
</CraftCard>
```

### With Custom CSS

If you don't use Tailwind, the component includes base styles in `CraftCard.css`:

```css
.craft-card {
  perspective: 800px;
  transition: box-shadow 0.6s ease;
  cursor: pointer;
  position: relative;
  will-change: transform;
}
```

You can add your own styles on top:

```tsx
<CraftCard 
  className="my-custom-card"
  style={{
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '12px',
  }}
>
  {/* content */}
</CraftCard>
```

## Advanced Examples

### Custom Stagger Timing

```tsx
const cards = ['Card 1', 'Card 2', 'Card 3'];

{cards.map((card, i) => (
  <CraftCard key={i} delay={i * 0.15}>
    <h3>{card}</h3>
  </CraftCard>
))}
```

### Issue Cards (IssueCrush Style)

```tsx
<CraftCard delay={0.2} className="bg-white rounded-lg p-6 shadow-lg">
  <div className="flex items-center gap-4">
    <span className="text-gray-500 font-bold">#{issue.number}</span>
    <h3 className="text-lg font-semibold">{issue.title}</h3>
  </div>
  <p className="mt-2 text-gray-600">{issue.description}</p>
</CraftCard>
```

## Browser Compatibility

- Modern browsers with CSS 3D transforms support
- Chrome, Firefox, Safari, Edge (latest versions)
- Gracefully degrades on older browsers (animations disabled)

## Platform Support

**Note:** This component uses `framer-motion` which is **web-only**. For React Native apps:

- Use this component only for web builds (e.g., `expo start --web`)
- For native platforms, consider alternatives like:
  - `moti` - Framer Motion-like animations for React Native
  - `react-native-reanimated` - Low-level animation library

## Performance Tips

1. Limit the number of cards rendered at once (use pagination or virtualization for large lists)
2. The component uses `will-change` for optimized GPU acceleration
3. Spring animations are physics-based and efficient
4. Mouse tracking is throttled via requestAnimationFrame (built into framer-motion)

## Demo

See `CraftCardDemo.tsx` for complete working examples including:

- Single card usage
- Grid layout with staggered animations
- Custom content rendering
- Different styling approaches

## License

MIT
