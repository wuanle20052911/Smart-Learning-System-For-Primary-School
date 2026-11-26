(() => {
  const previewMode = new URLSearchParams(window.location.search).get('assignmentPreview') === '1'
    && window.parent !== window;
  if (!previewMode) return;

  document.documentElement.dataset.assignmentPreview = 'pending';
  const style = document.createElement('style');
  style.textContent = 'html[data-assignment-preview="pending"] body { visibility: hidden !important; }';
  document.head.appendChild(style);

  window.MathJoyAssignmentPreview = { active: true };
  window.addEventListener('message', (event) => {
    if (event.source !== window.parent || event.origin !== window.location.origin) return;
    const data = event.data;
    if (!data || data.type !== 'mathjoy-assignment-preview' || !Array.isArray(data.questions)) return;

    window.dispatchEvent(new CustomEvent('mathjoy-assignment-preview', { detail: data }));
    document.documentElement.dataset.assignmentPreview = 'ready';
  });
  document.addEventListener('click', (event) => {
    const link = event.target.closest?.('a[href="/learn"]');
    if (!link) return;
    event.preventDefault();
    window.parent.postMessage({ type: 'mathjoy-assignment-preview-close' }, window.location.origin);
  });
})();
