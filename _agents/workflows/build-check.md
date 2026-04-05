---
description: Kiểm tra lint, type-check và build production bundle cho LoomFX
---

# Build Check Workflow

// turbo-all

## Bước 1: TypeScript type checking
```bash
cd /Users/henry/Projects/loomfx && npx tsc --noEmit
```

## Bước 2: ESLint
```bash
cd /Users/henry/Projects/loomfx && npx eslint src/ --ext .ts,.tsx
```

## Bước 3: Build production
```bash
cd /Users/henry/Projects/loomfx && npm run build
```

## Bước 4: Kiểm tra output
```bash
cd /Users/henry/Projects/loomfx && ls -lah dist/ && du -sh dist/
```

## Kết quả mong đợi
- TypeScript: 0 errors
- ESLint: 0 errors, 0 warnings
- Build: thành công, output trong `dist/`
- Bundle size: < 500KB (gzipped)
