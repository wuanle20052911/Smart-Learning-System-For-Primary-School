// Danh mục mẫu trò chơi bài tập Toán. Giáo viên tự soạn nội dung; ví dụ chỉ để gợi ý.
export const BLANK = '___';

export const FLASH_CARD_THEMES = [
  { id: 'garden', name: 'Vườn vui', emoji: '🌿' },
  { id: 'ocean', name: 'Đại dương', emoji: '🌊' },
  { id: 'space', name: 'Vũ trụ', emoji: '🚀' }
];

export const GAME_TEMPLATES = [
  {
    id: 'quiz',
    name: 'Trắc nghiệm',
    description: 'Chuỗi câu hỏi nhiều lựa chọn. Chạm đáp án đúng để qua câu tiếp theo.',
    hint: 'Tính nhanh, so sánh số, bài toán có lời văn ngắn.',
    itemLabel: 'câu hỏi',
    sample: () => [
      { question: '2 345 × 3 = ?', options: ['7 035', '6 935', '7 135', '6 035'], answer: 0 },
      { question: 'Phân số nào lớn hơn 1?', options: ['3/4', '5/5', '7/4', '2/9'], answer: 2 }
    ]
  },
  {
    id: 'match-up',
    name: 'Lật thẻ',
    description: 'Lật từng thẻ, ghi nhớ vị trí rồi ghép phép tính hoặc khái niệm với đáp án.',
    hint: 'Phép tính ↔ kết quả, đổi đơn vị, phân số ↔ cách đọc.',
    itemLabel: 'cặp',
    sample: () => [
      { question: '125 × 8', answer: '1 000' },
      { question: '1 tấn', answer: '1 000 kg' },
      { question: '1 giờ 15 phút', answer: '75 phút' },
      { question: '3 thế kỉ', answer: '300 năm' }
    ]
  },
  {
    id: 'group-sort',
    name: 'Phân nhóm',
    description: 'Kéo từng thẻ vào đúng nhóm của nó.',
    hint: 'Chia hết cho 2 / 5, góc nhọn / tù / bẹt, phân số bé hơn / lớn hơn 1.',
    itemLabel: 'thẻ',
    sample: () => {
      const groups = ['Số chẵn', 'Số lẻ'];
      return [
        { question: '1 234', options: groups, answer: 0 },
        { question: '5 677', options: groups, answer: 1 },
        { question: '90 000', options: groups, answer: 0 },
        { question: '3 501', options: groups, answer: 1 }
      ];
    }
  },
  {
    id: 'ordering',
    name: 'Sắp xếp thứ tự',
    description: 'Kéo các thẻ số để xếp theo đúng thứ tự.',
    hint: 'Xếp số, phân số tăng/giảm dần; xếp các bước giải.',
    itemLabel: 'dãy',
    sample: () => [
      { question: 'Xếp các số theo thứ tự từ bé đến lớn', options: ['45 678', '45 768', '45 867', '46 578'] },
      { question: 'Xếp các phân số theo thứ tự từ bé đến lớn', options: ['1/5', '2/5', '4/5', '6/5'] }
    ]
  },
  {
    id: 'sort-numbers',
    name: 'Sắp xếp số tăng dần',
    description: 'Lật trộn các thẻ số rồi xếp lại từ bé đến lớn.',
    hint: 'So sánh số có nhiều chữ số và tìm thứ tự tăng dần.',
    itemLabel: 'dãy số',
    sample: () => [
      { question: 'Xếp các số theo thứ tự từ bé đến lớn', options: ['8 999', '15 230', '45 100', '67 400'] },
      { question: 'Sắp xếp các số sau theo thứ tự tăng dần', options: ['10 001', '19 999', '40 000', '75 000'] }
    ]
  },
  {
    id: 'compare-numbers',
    name: 'So sánh số',
    description: 'So sánh hai số rồi chọn dấu >, < hoặc = phù hợp.',
    hint: 'Bắt đầu từ hàng lớn nhất; nếu bằng nhau thì xét hàng kế tiếp.',
    itemLabel: 'câu hỏi',
    sample: () => [
      { question: '45 678 ___ 45 687', options: ['>', '<', '='], answer: 1 },
      { question: '72 350 ___ 72 305', options: ['>', '<', '='], answer: 0 },
      { question: '30 500 ___ 30 500', options: ['>', '<', '='], answer: 2 }
    ]
  },
  {
    id: 'decode-place-value',
    name: 'Giải mã hàng số',
    description: 'Giải câu đố về hàng, lớp và giá trị của chữ số.',
    hint: 'Xác định vị trí chữ số rồi đọc đúng giá trị theo hàng.',
    itemLabel: 'câu hỏi',
    sample: () => [
      { question: 'Trong số 48 215, chữ số 8 thuộc hàng nào?', options: ['Hàng trăm', 'Hàng nghìn', 'Hàng chục nghìn', 'Hàng đơn vị'], answer: 1 },
      { question: 'Giá trị của chữ số 6 trong số 263 481 là bao nhiêu?', options: ['60', '600', '6 000', '60 000'], answer: 2 },
      { question: 'Chữ số hàng trăm trong số 35 724 là chữ số nào?', options: ['5', '7', '2', '4'], answer: 1 }
    ]
  },
  {
    id: 'cloze',
    name: 'Điền vào chỗ trống',
    description: 'Kéo số từ ngân hàng thẻ thả vào chỗ trống trong câu.',
    hint: 'Đổi đơn vị đo, giá trị chữ số theo hàng, tính chất phép tính.',
    itemLabel: 'câu',
    sample: () => [
      { question: `3 tạ 5 kg = ${BLANK} kg`, answer: ['305'], options: ['35'] },
      { question: `Trong số 873 205, chữ số 7 thuộc hàng ${BLANK}, lớp ${BLANK}.`, answer: ['chục nghìn', 'nghìn'], options: ['trăm nghìn', 'đơn vị'] }
    ]
  },
  {
    id: 'find-match',
    name: 'Tìm đáp án',
    description: 'Một câu hỏi hiện lên, chạm vào đáp án khớp để loại bỏ nó cho đến khi hết.',
    hint: 'Tính nhẩm, đổi đơn vị nhanh.',
    itemLabel: 'cặp',
    sample: () => [
      { question: '36 : 4', answer: '9' },
      { question: '7 × 8', answer: '56' },
      { question: '1/2 của 30', answer: '15' },
      { question: '1 000 – 1', answer: '999' }
    ]
  },
  {
    id: 'open-box',
    name: 'Mở hộp bí mật',
    description: 'Chạm vào từng hộp để mở ra một câu hỏi bất ngờ bên trong.',
    hint: 'Ôn tập nhẹ nhàng, mỗi hộp một câu.',
    itemLabel: 'hộp',
    sample: () => [
      { question: 'Số liền sau của 99 999 là?', options: ['100 000', '99 998', '10 000', '999 999'], answer: 0 },
      { question: 'Góc lớn hơn góc vuông và bé hơn góc bẹt là góc gì?', options: ['Góc nhọn', 'Góc tù', 'Góc bẹt'], answer: 1 }
    ]
  },
  {
    id: 'gameshow',
    name: 'Đấu trường tính số',
    description: 'Trắc nghiệm có đồng hồ đếm ngược, hai quyền trợ giúp và sao thưởng khi trả lời nhanh.',
    hint: 'Ôn tập cuối chương cho học sinh thích thử thách.',
    itemLabel: 'câu hỏi',
    sample: () => [
      { question: 'Trung bình cộng của 12, 15 và 18 là?', options: ['15', '14', '16', '45'], answer: 0 },
      { question: '450 × 20 = ?', options: ['900', '9 000', '90 000', '4 500'], answer: 1 }
    ]
  },
  {
    id: 'digit-arrange',
    name: 'Xếp chữ số tạo số',
    description: 'Kéo các thẻ chữ số vào đúng vị trí để tạo thành số theo yêu cầu.',
    hint: 'Lập số lớn nhất / bé nhất, viết số theo cách đọc.',
    itemLabel: 'câu',
    sample: () => [
      { question: 'Dùng các chữ số 3, 0, 7, 5 lập số lớn nhất', answer: '7530' },
      { question: 'Viết số: Hai mươi nghìn không trăm linh sáu', answer: '20006' }
    ]
  },
  {
    id: 'flash-cards',
    name: 'Thẻ ghi nhớ',
    description: 'Lật thẻ để xem đáp án rồi tự đánh dấu đã nhớ hoặc cần ôn thêm.',
    hint: 'Ôn bảng nhân, từ vựng Toán và các quy tắc quan trọng.',
    itemLabel: 'thẻ',
    sample: () => [
      { question: '7 × 8', answer: '56' },
      { question: '1 km', answer: '1 000 m' },
      { question: 'Chu vi hình vuông', answer: 'Độ dài một cạnh × 4' }
    ]
  },
  {
    id: 'detective-pattern',
    name: 'Thám tử tìm quy luật',
    description: 'Quan sát dãy số, tìm quy luật và chọn số còn thiếu.',
    hint: 'Nhập các số cách nhau bằng dấu phẩy và dùng ? cho số cần tìm.',
    itemLabel: 'mật mã',
    sample: () => [
      { question: '2, 4, 6, 8, ?', options: ['9', '10', '11', '12'], answer: 1, explanation: 'Mỗi lần tăng thêm 2: 8 + 2 = 10.' },
      { question: '3, 6, 12, 24, ?', options: ['36', '42', '48', '52'], answer: 2, explanation: 'Mỗi số gấp đôi số đứng trước: 24 × 2 = 48.' },
      { question: '100, 90, ?, 70, 60', options: ['75', '80', '85', '90'], answer: 1, explanation: 'Mỗi bước giảm đi 10.' },
      { question: '1, 4, 9, 16, ?', options: ['20', '24', '25', '36'], answer: 2, explanation: 'Đây là các số chính phương; số tiếp theo là 5² = 25.' }
    ]
  }
];

export const GAME_BY_ID = Object.fromEntries(GAME_TEMPLATES.map((game) => [game.id, game]));

export function shuffle(items, seed = Math.random) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(seed() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

// Trộn nhưng tránh trả lại đúng thứ tự ban đầu (nếu có thể) để trò chơi không bị lộ đáp án.
export function shuffleAway(items) {
  if (items.length < 2) return [...items];
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const result = shuffle(items);
    if (result.some((item, index) => item !== items[index])) return result;
  }
  return [...items.slice(1), items[0]];
}
