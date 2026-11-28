(() => {
  const defaultQuestions = [
    { question: '2, 4, 6, 8, ?', options: ['9', '10', '11', '12'], answer: 1, hint: 'Mỗi bước tăng thêm cùng một lượng.', explanation: 'Mỗi lần tăng thêm 2: 8 + 2 = 10.' },
    { question: '5, 10, 15, ?, 25', options: ['18', '19', '20', '22'], answer: 2, hint: 'Tìm số được cộng thêm sau mỗi bước.', explanation: 'Dãy số tăng thêm 5 sau mỗi bước.' },
    { question: '3, 6, 12, 24, ?', options: ['36', '42', '48', '52'], answer: 2, hint: 'Thử xem số sau có gấp mấy lần số trước.', explanation: 'Mỗi số gấp đôi số đứng trước: 24 × 2 = 48.' },
    { question: '100, 90, ?, 70, 60', options: ['75', '80', '85', '90'], answer: 1, hint: 'Quan sát số bị giảm đi bao nhiêu sau mỗi bước.', explanation: 'Mỗi bước giảm đi 10.' },
    { question: '1, 4, 9, ?, 25', options: ['12', '14', '16', '18'], answer: 2, hint: 'Thử liên hệ dãy với bình phương của các số tự nhiên.', explanation: 'Đây là các số chính phương; số còn thiếu là 16.' },
    { question: '2, 5, 8, 11, ?', options: ['12', '13', '14', '15'], answer: 2, hint: 'Tìm số được cộng thêm ở mỗi bước.', explanation: 'Mỗi lần cộng thêm 3.' },
    { question: '1, 2, 4, 7, 11, ?', options: ['15', '16', '17', '18'], answer: 1, hint: 'Hiệu giữa hai số liên tiếp tăng dần từng đơn vị.', explanation: 'Các bước tăng lần lượt 1, 2, 3, 4; tiếp theo tăng 5, được 16.' },
    { question: '64, 32, 16, ?, 4', options: ['6', '7', '8', '10'], answer: 2, hint: 'So sánh mỗi số với số đứng trước nó.', explanation: 'Mỗi số bằng một nửa số đứng trước.' }
  ];

  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  function makeButton(text, className, action) {
    const button = element('button', className, text);
    button.type = 'button';
    button.addEventListener('click', action);
    return button;
  }

  function startGame(questions) {
    if (!Array.isArray(questions) || !questions.length || questions.some((question) => (
      typeof question?.question !== 'string'
      || !Array.isArray(question.options)
      || !Number.isInteger(question.answer)
      || question.answer < 0
      || question.answer >= question.options.length
    ))) return;

    let index = 0;
    let score = 0;
    let correctCount = 0;
    let lives = 3;
    let timeLeft = 25;
    let timer = null;
    let locked = false;
    let started = false;
    let paused = true;
    let hintUsed = false;

    const root = element('main', 'detective-assignment-preview');
    const top = element('header', 'detective-preview-top');
    const back = element('a', '', '← Quay lại');
    back.href = '/learn';
    top.append(back, element('strong', '', 'MATHJOY · TOÁN VUI MỖI NGÀY'), element('span', 'detective-preview-score', '⭐ 0'));

    const hero = element('section', 'detective-preview-hero');
    const heroCopy = document.createElement('div');
    heroCopy.append(element('small', '', 'GIẢI MÃ · QUAN SÁT · SUY LUẬN'), element('h1', '', 'Thám tử tìm quy luật'));
    const conan = document.createElement('img');
    conan.src = '/public/img/conan.png';
    conan.alt = '';
    hero.append(heroCopy, conan);

    const stats = element('div', 'detective-preview-stats');
    const roundStat = element('span', 'detective-preview-stat');
    const livesStat = element('span', 'detective-preview-stat');
    const timerStat = element('span', 'detective-preview-stat detective-preview-timer');
    stats.append(roundStat, livesStat, timerStat);

    const progress = element('div', 'detective-preview-progress');
    const progressValue = document.createElement('span');
    progress.append(progressValue);

    const panel = element('section', 'detective-preview-panel');
    const title = element('h2', '', 'Mật mã số học');
    const sequence = element('div', 'detective-preview-sequence');
    const prompt = element('p', 'detective-preview-question', 'Số nào phù hợp với dấu hỏi?');
    const choices = element('div', 'detective-preview-answers');
    const feedback = element('p', 'detective-preview-feedback');
    feedback.setAttribute('role', 'status');
    feedback.setAttribute('aria-live', 'polite');
    const hint = element('p', 'detective-preview-hint');
    hint.hidden = true;
    hint.setAttribute('role', 'status');
    hint.setAttribute('aria-live', 'polite');
    const actions = element('div', 'detective-preview-actions');
    const hintButton = makeButton('💡 Mở gợi ý', '', showHint);
    const pauseButton = makeButton('⏸ Tạm dừng', '', pauseGame);
    const restartButton = makeButton('↻ Chơi lại', '', confirmRestart);
    const nextButton = makeButton('Mật mã tiếp theo →', '', nextQuestion);
    nextButton.hidden = true;
    actions.append(hintButton, pauseButton, restartButton, nextButton);
    panel.append(title, sequence, prompt, choices, feedback, hint, actions);

    const method = element('aside', 'detective-preview-method');
    method.append(
      element('small', '', 'MẸO GIẢI MÃ'),
      element('h2', '', 'Đọc dãy số, tìm quy luật'),
      element('p', '', 'So sánh các số liền kề để tìm bước tăng, giảm hoặc phép nhân.')
    );

    root.append(top, hero, stats, progress, panel, method);
    document.body.replaceChildren(root);
    if (window.MathJoyAssignmentPreview?.active) document.body.classList.add('assignment-preview-mode');

    function stopTimer() {
      window.clearInterval(timer);
      timer = null;
    }

    function updateTimer() {
      timerStat.textContent = `⏱ ${timeLeft}s`;
      timerStat.classList.toggle('is-urgent', timeLeft <= 5 && !locked);
    }

    function startTimer() {
      stopTimer();
      updateTimer();
      timer = window.setInterval(() => {
        if (paused || locked) return;
        timeLeft -= 1;
        updateTimer();
        if (timeLeft <= 0) answer(null);
      }, 1000);
    }

    function showOverlay(mode) {
      stopTimer();
      paused = true;
      const overlay = element('div', 'detective-preview-overlay');
      const dialog = element('section', 'detective-preview-dialog');
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
      const titleText = mode === 'pause' ? 'Tạm dừng giải mã' : mode === 'restart' ? 'Làm lại từ đầu?' : 'Bắt đầu giải mã?';
      const bodyText = mode === 'pause'
        ? 'Thời gian đã dừng. Tiếp tục khi con sẵn sàng.'
        : mode === 'restart'
          ? 'Tiến trình hiện tại sẽ được đặt lại để bắt đầu bộ mật mã mới.'
          : `Con sẽ giải ${questions.length} mật mã. Mỗi mật mã có 25 giây.`;
      dialog.append(element('h2', '', titleText), element('p', '', bodyText));
      const mainAction = makeButton(mode === 'pause' ? 'Tiếp tục' : mode === 'restart' ? 'Bắt đầu lại' : 'Nhận nhiệm vụ', 'is-primary', () => {
        overlay.remove();
        if (mode === 'restart' || mode === 'start') {
          index = 0;
          score = 0;
          correctCount = 0;
          lives = 3;
          started = true;
          render();
        }
        paused = false;
        startTimer();
      });
      dialog.append(mainAction);
      if (mode === 'restart') dialog.append(makeButton('Tiếp tục chơi', '', () => { overlay.remove(); paused = false; startTimer(); }));
      overlay.append(dialog);
      root.append(overlay);
    }

    function render() {
      stopTimer();
      root.replaceChildren(top, hero, stats, progress, panel, method);
      locked = false;
      hintUsed = false;
      timeLeft = 25;
      const question = questions[index];
      roundStat.textContent = `Mật mã ${index + 1}/${questions.length}`;
      livesStat.textContent = `❤️ ${lives} mạng`;
      top.querySelector('.detective-preview-score').textContent = `⭐ ${score}`;
      progressValue.style.width = `${(index / questions.length) * 100}%`;
      feedback.textContent = '';
      feedback.className = 'detective-preview-feedback';
      hint.textContent = '';
      hint.hidden = true;
      hintButton.disabled = false;
      nextButton.hidden = true;
      updateTimer();
      sequence.replaceChildren(...question.question.split(',').map((token) => {
        const value = token.trim();
        return element('span', value === '?' ? 'is-missing' : '', value);
      }));
      choices.replaceChildren(...question.options.map((option, optionIndex) => {
        const button = makeButton(String(option), '', () => answer(optionIndex));
        return button;
      }));
      if (started && !paused) startTimer();
    }

    function showHint() {
      if (!started || paused || locked || hintUsed) return;
      hintUsed = true;
      hint.textContent = questions[index].hint || 'So sánh các số liền kề để tìm bước tăng, giảm hoặc phép nhân.';
      hint.hidden = false;
      hintButton.disabled = true;
    }

    function answer(optionIndex) {
      if (!started || paused || locked) return;
      locked = true;
      stopTimer();
      const question = questions[index];
      const correct = optionIndex === question.answer;
      const bonus = correct && !hintUsed ? 5 : 0;
      if (correct) {
        correctCount += 1;
        score += 100 + bonus;
      } else {
        lives -= 1;
      }
      [...choices.children].forEach((button, buttonIndex) => {
        button.disabled = true;
        if (buttonIndex === question.answer) button.classList.add('is-correct');
        else if (optionIndex !== null && buttonIndex === optionIndex) button.classList.add('is-wrong');
      });
      feedback.textContent = `${optionIndex === null ? 'Hết giờ! ' : correct ? 'Chính xác! ' : 'Cùng xem lại nhé. '}${question.explanation || ''}${bonus ? ' Thưởng không dùng gợi ý: +5 điểm.' : ''}`;
      feedback.classList.add(correct ? 'is-good' : 'is-bad');
      top.querySelector('.detective-preview-score').textContent = `⭐ ${score}`;
      livesStat.textContent = `❤️ ${lives} mạng`;
      hintButton.disabled = true;
      nextButton.textContent = index === questions.length - 1 || lives === 0 ? 'Xem kết quả →' : 'Mật mã tiếp theo →';
      nextButton.hidden = false;
      updateTimer();
    }

    function nextQuestion() {
      if (!locked) return;
      index += 1;
      if (index >= questions.length || lives === 0) {
        stopTimer();
        started = false;
        progressValue.style.width = '100%';
        const finish = element('section', 'detective-preview-finish');
        finish.append(
          element('div', '', '🔐🏆'),
          element('h2', '', 'Đã phá giải mật mã!'),
          element('p', '', `Con giải đúng ${correctCount}/${questions.length} mật mã và đạt ${score} điểm.`),
          makeButton('Chơi lại', 'is-primary', () => {
            index = 0;
            score = 0;
            correctCount = 0;
            lives = 3;
            started = true;
            paused = true;
            render();
            paused = false;
            startTimer();
          })
        );
        root.replaceChildren(top, hero, finish);
        return;
      }
      render();
    }

    function pauseGame() {
      if (!started || paused || locked) return;
      showOverlay('pause');
    }

    function confirmRestart() {
      if (!started || locked) return;
      showOverlay('restart');
    }

    render();
    showOverlay('start');
  }

  if (window.MathJoyAssignmentPreview?.active) {
    window.addEventListener('mathjoy-assignment-preview', (event) => {
      if (event.detail?.gameType === 'detective-pattern') startGame(event.detail.questions);
    });
  } else {
    startGame(defaultQuestions);
  }
})();
