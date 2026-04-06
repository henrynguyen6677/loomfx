---
description: Tạo service class mới theo pattern dự án Vellum (interface + class + test)
---

# Add Service Workflow

Tạo một service mới theo chuẩn dự án. Yêu cầu 2 tham số:
- `SERVICE_NAME`: Tên service (PascalCase, ví dụ: `ScreenCaptureService`)
- `SERVICE_DIR`: Thư mục chứa (ví dụ: `capture`, `compositor`, `encoding`, `storage`)

## Bước 1: Tạo file service
Tạo file `src/services/{SERVICE_DIR}/{SERVICE_NAME}.ts` với template:

```ts
/**
 * {SERVICE_NAME}
 * 
 * Responsibility: [mô tả ngắn gọn]
 * 
 * Dependencies: [liệt kê dependencies]
 */

export interface I{SERVICE_NAME} {
  // Define public interface
  init(): Promise<void>;
  dispose(): void;
}

export class {SERVICE_NAME} implements I{SERVICE_NAME} {
  private _isInitialized = false;

  async init(): Promise<void> {
    if (this._isInitialized) return;
    // Initialization logic
    this._isInitialized = true;
  }

  dispose(): void {
    // Cleanup logic
    this._isInitialized = false;
  }
}
```

## Bước 2: Tạo file test
Tạo file `tests/unit/{SERVICE_NAME}.test.ts` với template:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { {SERVICE_NAME} } from '../../src/services/{SERVICE_DIR}/{SERVICE_NAME}';

describe('{SERVICE_NAME}', () => {
  let service: {SERVICE_NAME};

  beforeEach(() => {
    service = new {SERVICE_NAME}();
  });

  afterEach(() => {
    service.dispose();
  });

  it('initializes successfully', async () => {
    await service.init();
    // Add assertions
  });

  it('cleans up on dispose', () => {
    service.dispose();
    // Add assertions
  });
});
```

## Bước 3: Export
Thêm export vào `src/services/{SERVICE_DIR}/index.ts` (tạo file nếu chưa có):
```ts
export { {SERVICE_NAME} } from './{SERVICE_NAME}';
export type { I{SERVICE_NAME} } from './{SERVICE_NAME}';
```

## Bước 4: Verify
// turbo
```bash
cd /Users/henry/Projects/loomfx && npx tsc --noEmit
```
