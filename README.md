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
   - Tài khoản đăng ký với vai trò **Giáo viên** có thể mở `http://localhost:3000/teacher` để thêm, sửa, xoá và xuất bản bài học.
   - Trang học sinh chỉ hiển thị các bài học đã được giáo viên xuất bản.

8. Chạy server:

   ```bash
   npm start
   ```

9. Mở trình duyệt tại:

   ```text
   http://localhost:3000
   ```

   Trang đăng nhập/đăng ký: `http://localhost:3000/auth`

## MVC authentication

- `views/auth.html` và `public/auth.*`: giao diện LearnHub và logic form.
- `routes/authRoutes.js`: định tuyến `/api/auth/login` và `/api/auth/register`.
- `controllers/authController.js`: kiểm tra input và định dạng response.
- `models/userModel.js`: giao tiếp với Supabase Auth.
- `supabase/002_create_lessons.sql`: bảng bài học và chính sách RLS.
- `views/teacher.html` và `public/teacher.*`: bảng điều khiển bài học của giáo viên.

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
   