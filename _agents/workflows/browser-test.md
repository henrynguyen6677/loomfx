---
description: Chạy recording flow trên browser thật, kiểm tra UI và chụp screenshots
---

# Browser Test Workflow

Kiểm tra recording flow hoàn chỉnh trên trình duyệt.

## Bước 1: Đảm bảo dev server đang chạy
```bash
cd /Users/henry/Projects/loomfx && npm run dev
```

## Bước 2: Mở browser và navigate
Sử dụng browser_subagent để:
1. Mở `http://localhost:5173`
2. Chụp screenshot trang chủ

## Bước 3: Test Recording Flow
Sử dụng browser_subagent để:
1. Click nút "Start Recording"
2. Xác nhận permission prompts xuất hiện
3. Verify live preview hiển thị
4. Verify webcam bubble hiển thị (nếu enabled)
5. Verify timer đang đếm
6. Chụp screenshot khi đang recording

## Bước 4: Test Stop & Save
Sử dụng browser_subagent để:
1. Click nút "Stop"
2. Verify video preview player xuất hiện
3. Verify download/save option có sẵn
4. Chụp screenshot kết quả

## Bước 5: Test Edge Cases
Sử dụng browser_subagent để:
1. Test recording khi từ chối webcam
2. Test recording khi từ chối microphone
3. Test pause/resume flow
4. Chụp screenshots cho mỗi case

## Kết quả mong đợi
- Không có console errors
- UI responsive, không bị đơ
- Video file được tạo thành công
- Tất cả screenshots được lưu để review
