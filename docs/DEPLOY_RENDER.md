# Deploy miễn phí lên Render

Ứng dụng phục vụ React và API Express trong cùng một Web Service. Supabase vẫn dùng project hiện có. File `render.yaml` chọn gói Free và Node.js 22.

## Các bước

1. Đưa code cùng `render.yaml` lên repository GitHub của bạn. Không commit `.env`.
2. Đăng nhập https://dashboard.render.com, chọn **New → Blueprint**, kết nối repository và chọn branch chứa cấu hình.
3. Điền `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` từ môi trường của bạn. Khóa service role chỉ nhập trong môi trường backend của Render.
4. `OLLAMA_BASE_URL` phải là địa chỉ của một máy chạy Ollama mà Render truy cập được. `http://localhost:11434` trên Render không phải máy cá nhân của bạn. Nếu chưa có máy AI, có thể dùng giá trị đó để deploy phần web trước; chức năng tạo câu hỏi và chatbot phụ thuộc Ollama sẽ chưa hoạt động. Không công khai cổng Ollama cá nhân trực tiếp khi chưa có cơ chế kiểm soát truy cập.
5. Nếu môi trường hiện tại có tùy chỉnh `KB_STORAGE_BUCKET`, `KB_STORAGE_PREFIX`, model hoặc các biến khác trong `.env.example`, thêm giá trị tương ứng vào Environment trên Render. Không sao chép biến `PORT` của máy local; để Render cấp cổng.
6. Xác nhận gói **Free**, tạo Blueprint và chờ deploy. Build dùng `npm ci --include=dev && npm run build`; start dùng `npm run serve`.
7. Lấy URL HTTPS Render cấp. Trong Supabase **Authentication → URL Configuration**, đặt **Site URL** là URL này và thêm `https://<ten-app>.onrender.com/auth/callback` vào **Redirect URLs**. Nếu dùng Google, giữ callback của Supabase trong Google Cloud theo hướng dẫn README.
8. Mở `/health`, đăng nhập, tải bài học, thử các vai trò và một chức năng AI nếu đã cấu hình máy Ollama. `/health` chỉ xác nhận HTTP server hoạt động, không kiểm tra kết nối Supabase hay Ollama.

## Giới hạn

- Render Free ngủ sau 15 phút không có truy cập; lần mở tiếp theo có thể phải chờ khoảng một phút. Có giới hạn giờ chạy, băng thông và build: https://render.com/docs/free.
- Gói Free của Render không đủ tài nguyên để chạy các model Ollama 3B/8B của dự án. Muốn giữ AI local miễn phí, cần một máy riêng đang bật và kết nối được từ backend qua giải pháp có kiểm soát truy cập, hoặc thay backend AI bằng nhà cung cấp khác rồi kiểm tra lại tạo câu hỏi và embedding.
- Deploy web không tự áp dụng SQL migration hoặc tải tài liệu lên Supabase. Chuẩn bị database và Storage theo README trước khi kiểm tra đầy đủ.
- Tệp ghi trên Render không bền vững. Dữ liệu lâu dài cần nằm trong Supabase.
