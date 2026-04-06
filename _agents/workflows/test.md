---
description: Chạy test suite Vitest cho Vellum và hiển thị coverage report
---

# Test Workflow

// turbo-all

## Bước 1: Chạy unit tests
```bash
cd /Users/henry/Projects/loomfx && npx vitest run --reporter=verbose
```

## Bước 2: Chạy tests với coverage
```bash
cd /Users/henry/Projects/loomfx && npx vitest run --coverage
```

## Bước 3: Kiểm tra coverage threshold
- Target: ≥ 80% overall coverage
- Services: ≥ 90% coverage
- Components: ≥ 75% coverage
- Hooks: ≥ 85% coverage

## Khi test fail
- Đọc error output để xác định root cause
- Fix test hoặc code tương ứng
- Chạy lại bước 1 để xác nhận
