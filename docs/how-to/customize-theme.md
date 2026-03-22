# How to Customize the Theme

IssueCrush supports light and dark themes with customizable colors.

## Theme Files

- `src/theme/themes.ts` - Theme definitions
- `src/theme/ThemeContext.tsx` - Theme provider and hook

## Quick Customization

Edit `src/theme/themes.ts`:

````typescript
export const lightTheme: Theme = {
  background: '#FFFFFF',
  surface: '#F5F5F5',
  primary: '#0366D6',    // Change primary color
  secondary: '#586069',
  text: '#24292E',
  textSecondary: '#586069',
  border: '#E1E4E8',
  error: '#D73A49',
  success: '#28A745',
  warning: '#FFC107',
};
````

## Create Custom Theme

Add a new theme variant:

````typescript
export const oceanTheme: Theme = {
  background: '#0A192F',
  surface: '#112240',
  primary: '#64FFDA',
  // ... other colors
};
````

## Apply Theme

In `App.tsx`:

````typescript
import { oceanTheme } from './src/theme/themes';

<ThemeProvider theme={oceanTheme}>
  {/* app content */}
</ThemeProvider>
````

## Related Documentation

- [Components Reference](../reference/components/)
- [Architecture Overview](../reference/architecture/overview.md)
