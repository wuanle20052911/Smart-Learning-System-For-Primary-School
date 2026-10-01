# Smart Learning System for Primary School

Dự án web tạo bộ câu hỏi ôn tập cho học sinh tiểu học bằng trí tuệ nhân tạo local qua Ollama.

## Tính năng

- Tạo tự động câu hỏi trắc nghiệm từ nội dung đầu vào
- Hỗ trợ upload file văn bản `.txt`, `.docx`, `.pdf` hoặc nhập nội dung thủ công
- Sinh câu hỏi theo chủ đề và số lượng yêu cầu
- Tự động kiểm tra và lọc câu hỏi không hợp lệ
- Xuất câu hỏi ra file HTML hoặc TXT
- Chạy hoàn toàn local, không cần API key

## Yêu cầu hệ thống

- Node.js 18+
- Ollama đã được cài đặt
- RAM đủ để chạy model local (khuyến nghị model `deepseek-r1:8b` trên máy mạnh)

## Cài đặt

1. Cài đặt Ollama tại: https://ollama.com/download
2. Mở terminal và bắt đầu Ollama:

   ```bash
   ollama serve
   ```

3. Pull model dùng cho dự án:

   ```bash
   ollama pull deepseek-r1:8b
   ```

4. Cài đặt dependency của project:

   ```bash
   npm install
   ```

5. Tạo hoặc chỉnh file `.env` theo mẫu:

   ```env
   PORT=3000
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=deepseek-r1:8b
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   ```

   Ollama tạo câu hỏi theo luồng để tránh timeout khi model cần thời gian khởi động hoặc sinh nội dung dài. Nếu vẫn gặp timeout, kiểm tra Ollama tại `http://localhost:11434` và đảm bảo model trong `OLLAMA_MODEL` đã được tải.

6. Tạo bảng profile người dùng trong Supabase:

   - Mở **SQL Editor** trong Supabase.
   - Chạy nội dung file `supabase/001_create_users.sql`.
   - Supabase Auth vẫn quản lý mật khẩu trong `auth.users`; bảng `public.users` chỉ lưu profile và role.

7. Tạo bảng bài học:

   - Trong **SQL Editor**, chạy tiếp nội dung file `supabase/002_create_lessons.sql`.
   - Nếu đã có tài khoản giáo viên từ trước, chạy thêm `supabase/003_sync_existing_user_roles.sql` để đồng bộ role.
   - Chạy `supabase/004_add_lesson_content.sql` để thêm nơi lưu nội dung Word/PDF của từng bài học.
   - Nếu bấm lưu vẫn bị lỗi quyền, chạy thêm `supabase/005_fix_lesson_policies.sql`.
   - Chạy `supabase/006_create_quiz_attempts.sql` để lưu lịch sử làm bài và cho phép giáo viên theo dõi kết quả.
   - Nếu đã chạy các migration trước đó, chạy thêm `supabase/009_store_quiz_answers.sql` để lưu đề, đáp án đã chọn và các câu trả lời sai.
   - Chạy `supabase/010_add_profile_details.sql` để cho phép học sinh cập nhật họ tên, giới tính và ngày sinh; lớp học chỉ được hiển thị.
   - Chạy `supabase/011_add_student_to_class.sql` để giáo viên thêm học sinh vào lớp bằng email.
   - Chạy `supabase/007_create_mvp_learning.sql` để tạo lớp học, môn/chủ đề/kỹ năng, bài tập, câu hỏi và lượt nộp bài.
   - Nếu gặp lỗi `infinite recursion detected in policy for relation classes/class_members`, chạy thêm `supabase/008_fix_class_rls_recursion.sql`.
   - Chạy `supabase/016_create_feedback.sql` để giáo viên xem bài nộp chi tiết và lưu nhận xét cho học sinh.

  - Chạy `supabase/017_lesson_chapters_storage.sql` để liên kết bài học với chương, tạo bucket riêng tư `lesson-materials` và policy đọc các bucket mẫu `Math4`/`Chapter1`.
  - Tài khoản **Giáo viên** mở `http://localhost:3000/teacher` → **Bài học** để chọn môn, tạo chương, thêm, sửa hoặc xóa bài học và chọn nguồn file từ máy hoặc các bucket chương hiện có (`Math4`, `Chapter1`–`Chapter3`). Nội dung bài được lưu trong `public.lessons`; `source_bucket` và `source_path` giữ địa chỉ file để backend mở lại bằng signed URL.
  - Nếu danh sách môn/chương thiếu dữ liệu từ các bài học đã có, chạy `supabase/019_sync_catalog_from_lessons.sql` trong Supabase SQL Editor để đồng bộ `subjects`, `topics` và `lessons.topic_id` từ `lessons.subject`/`lessons.topic`. Có thể chạy lại an toàn sau khi thêm bài học; tải lại trang **Bài học** sau khi chạy.
  - Chạy `supabase/019_backfill_lesson_source_filenames.sql` để điền `source_filename` còn thiếu từ `source_path` cho bài học thuộc `Chapter1`–`Chapter3`.
  - Chạy `supabase/018_create_question_bank.sql` để tạo bảng `questions`, nơi giáo viên lưu và tái sử dụng câu hỏi trong ngân hàng câu hỏi.
  - Chạy `supabase/020_link_questions_to_lessons.sql` để lưu liên kết lesson trên bài tập, từng câu hỏi trong bài tập và câu hỏi ngân hàng; migration cũng gắn lesson cho các câu hỏi thuộc bài tập đã có.
  - Tài khoản đăng ký với vai trò **Giáo viên** có thể mở `http://localhost:3000/teacher` để thêm, sửa, xoá và xuất bản bài học.
  - Trong **Bài tập**, giáo viên chọn một bài học (kể cả bản nháp) làm nguồn, tạo câu hỏi bằng AI local, kiểm tra/chỉnh sửa rồi xuất bản cho lớp. Học sinh chỉ làm các bài tập giáo viên đã giao; API tạo câu hỏi AI chỉ cho phép giáo viên/quản trị viên.
  - Trong mục **Bài tập**, nút **Nạp toàn bộ file mẫu từ Supabase Storage** đọc các file PDF, DOCX, TXT, Markdown, CSV và JSON từ cả hai bucket `Math4` và `Chapter1`; nội dung đã trích xuất được dùng trực tiếp làm nguồn cho AI tạo câu hỏi.

   - Trang học sinh chỉ hiển thị các bài học đã được giáo viên xuất bản.

8. Chạy frontend ở chế độ phát triển:

   ```bash
   npm run dev
   ```

   Vite sẽ chạy tại `http://localhost:5173` và chuyển tiếp các request `/api`
   tới backend ở port `3000`. Trong một terminal khác, chạy backend:

   ```bash
   npm run serve
   ```

   Hoặc chạy cả quy trình production:

   ```bash
   npm start
   ```

9. Mở trình duyệt tại:

   ```text
   http://localhost:3000
   ```

   Trang đăng nhập/đăng ký nằm tại `/` (route `/auth` sẽ chuyển về `/`).

## Kiến trúc ứng dụng

Frontend sử dụng React và Vite:

- `index.html`: entrypoint của Vite.
- `src/main.jsx`: khởi tạo React và render `App`.
- `src/App.jsx`: điều hướng client-side, kiểm tra session và phân quyền.
- `src/pages/AdminPage.jsx`: trang quản trị hệ thống.
- `src/pages/TeacherPage.jsx`: dashboard giáo viên.
- `src/pages/StudentHomePage.jsx`: trang học tập của học sinh.
- `src/pages/AuthPage.jsx`: đăng nhập và đăng ký.
- `src/pages/AccountPage.jsx`: thông tin cá nhân và lịch sử làm bài.
- `src/components/`: các thành phần UI dùng chung như header, thương hiệu và phân quyền.
- `src/features/assignments/`: tạo bài tập AI, bài tập được giao và xử lý nộp bài.
- `src/features/lessons/`: hiển thị bài học và khởi tạo bài tập AI từ bài học.
- `src/services/`: gọi API, đọc session, điều hướng và đăng xuất.
- `src/styles.css`: style dùng chung của ứng dụng React.
- `public/css/`: style theo từng khu vực, được tải theo route.

Backend sử dụng Express theo mô hình routes/controllers/models:

- `routes/authRoutes.js`: định tuyến đăng nhập và API tạo tài khoản giáo viên dành riêng cho quản lý.
- `controllers/authController.js`: kiểm tra input và định dạng response.
- `models/userModel.js`: giao tiếp với Supabase Auth.
- `supabase/002_create_lessons.sql`: bảng bài học và chính sách RLS.
- `supabase/016_create_feedback.sql`: bảng nhận xét bài nộp và chính sách truy cập cho giáo viên/học sinh.
- `server.js`: khởi tạo Express, đăng ký API, phục vụ thư mục `dist` và tài nguyên tĩnh.

Các giao diện HTML/JavaScript cũ trong `views/`, `client/` và `public/js/`
đã được loại bỏ; toàn bộ giao diện hiện tại chạy từ React/Vite.

## API chính

Các API tạo và tải đề yêu cầu access token Supabase trong header
`Authorization: Bearer <access_token>`. Người dùng chưa đăng nhập sẽ được
chuyển tới `/auth`.

### POST /api/generate-quiz

Tạo câu hỏi trắc nghiệm từ `systemPrompt` và `userPrompt`.

Request mẫu:

```json
{
  "systemPrompt": "Bạn là giáo viên tiểu học. Hãy tạo câu hỏi trắc nghiệm theo đúng định dạng JSON.",
  "userPrompt": "Tạo 5 câu hỏi môn Toán lớp 3 về phép cộng và trừ."
}
```

Response mẫu:

```json
{
  "content": [
    {
      "type": "text",
      "text": "[{\"question\":\"...\",\"options\":[\"A\",\"B\",\"C\",\"D\"],\"correctIndex\":0,\"explanation\":\"...\"}]"
    }
  ],
  "raw": {
    "questionsGenerated": 5,
    "requestedCount": 5
  }
}
```

### POST /api/download-quiz

Xuất bộ câu hỏi ra file HTML hoặc TXT.

```json
{
  "quiz": [
    {
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "..."
    }
  ],
  "format": "html",
  "filename": "de-on-tap"
}
```

## Lưu ý

- Dự án đang dùng model local Ollama, không cần API key.
- Nếu Ollama chưa chạy hoặc model chưa được pull, server sẽ trả lỗi rõ ràng.
- Nếu máy bạn mạnh hơn, bạn có thể thay model ở `.env` thành `deepseek-r1:14b` hoặc các model khác phù hợp.
- Bản mặc định hiện đang dùng: `deepseek-r1:8b`.

## Xử lý sự cố

Nếu app không chạy:

```bash
ollama serve
ollama list
```

Nếu model chưa có:

```bash
ollama pull deepseek-r1:8b
```

Sau đó chạy lại:

```bash
npm start
```
   