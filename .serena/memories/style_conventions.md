# Style & Conventions

## Code Style
- **Prettier**: printWidth 100, tabWidth 2, singleQuote, trailingComma es5, endOfLine lf
- **Tailwind CSS v4**: Uses `@tailwindcss/postcss`, CSS-based config in globals.css `@theme` block
- **TypeScript**: Strict mode, path aliases via `@/*`
- **.gitattributes**: Auto CRLF→LF normalization

## Naming Conventions
- Components: PascalCase (e.g., `NaverMap.tsx`, `SpotCard.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useNaverMap.ts`)
- Files: kebab-case for non-components, PascalCase for components

## Patterns
- `"use client"` directive for interactive components
- Supabase client imported from `@/lib/supabase/client`
- Types exported from `@/types`
- Custom colors defined in `@theme` block in globals.css
