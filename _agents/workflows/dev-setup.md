---
description: Khởi tạo môi trường phát triển Vellum, cài đặt dependencies và khởi chạy dev server
---

# Dev Setup Workflow

// turbo-all

## Steps

1. Install dependencies
```bash
cd /Users/henry/Projects/loomfx && npm install
```

2. Sync SvelteKit types
```bash
cd /Users/henry/Projects/loomfx && npx svelte-kit sync
```

3. Type check
```bash
cd /Users/henry/Projects/loomfx && npm run check
```

4. Start dev server
```bash
cd /Users/henry/Projects/loomfx && npm run dev -- --port 5173
```

5. Open browser at http://localhost:5173

## Notes
- Dự án sử dụng **SvelteKit** + TypeScript + `@sveltejs/adapter-static`
- Dev server chạy trên port 5173
- SSR đã bị tắt (`ssr = false` trong `+layout.ts`) vì app dùng browser-only APIs (getDisplayMedia, WebCodecs, etc.)
