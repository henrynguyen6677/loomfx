---
description: Tạo Svelte component mới theo chuẩn project LoomFX (component + test)
---

# Add Component Workflow

## Usage
Tạo component mới cho LoomFX. Đặt tên PascalCase.

## Steps

1. Xác định folder target dựa trên loại component:
   - `src/lib/components/layout/` — layout components (Header, MainLayout)
   - `src/lib/components/recording/` — recording UI (RecordingToolbar, WebcamBubble, etc.)
   - `src/lib/components/settings/` — settings components
   - `src/lib/components/common/` — shared components (Button, Modal, Toast)

2. Tạo file Svelte component `{ComponentName}.svelte`:
```svelte
<script lang="ts">
  // Props using Svelte 5 runes
  interface Props {
    label?: string;
  }

  let { label = 'default' }: Props = $props();

  // Reactive state using $state()
  let count = $state(0);

  // Derived values using $derived()
  const doubled = $derived(count * 2);
</script>

<div class="component-name" id="component-name">
  <p>{label}: {doubled}</p>
</div>

<style>
  .component-name {
    /* Use CSS custom properties from design system */
    padding: var(--space-4);
    border-radius: var(--radius-md);
    background: var(--color-surface);
  }
</style>
```

3. Tạo file test `tests/unit/{ComponentName}.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ComponentName from '$lib/components/{folder}/ComponentName.svelte';

describe('ComponentName', () => {
  it('renders correctly', () => {
    render(ComponentName, { props: { label: 'test' } });
    expect(screen.getByText(/test/i)).toBeTruthy();
  });
});
```

4. Run tests:
```bash
cd /Users/henry/Projects/loomfx && npm run test:unit -- --run
```

## Rules
- Luôn dùng **Svelte 5 runes** (`$state`, `$derived`, `$effect`, `$props`)
- Mỗi component phải có một `id` attribute duy nhất cho testing
- Style phải dùng CSS custom properties từ `global.css`
- Luôn viết test cho component logic
