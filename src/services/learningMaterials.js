import mammoth from 'mammoth';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = pdfWorker;

export function getLessonSourceCode(lesson) {
  for (const sourceName of [lesson.source_filename, lesson.source_path]) {
    const filename = typeof sourceName === 'string' ? sourceName.split(/[\\/]/).pop() : '';
    const match = filename.match(/^C(\d+)B(\d+)(?=$|[ _.-])/i);
    if (match) {
      const codedChapterNumber = Number(match[1]);
      const lessonNumber = Number(match[2]);
      const chapterNumber = lessonNumber >= 1 && lessonNumber <= 6
        ? 1
        : lessonNumber >= 7 && lessonNumber <= 9
          ? 2
          : lessonNumber >= 10 && lessonNumber <= 16
            ? 3
            : codedChapterNumber;
      return { chapterNumber, codedChapterNumber, lessonNumber };
    }
  }
  return null;
}

export function deduplicateLessonsBySourceNumber(lessons) {
  const uniqueLessons = new Map();
  lessons.forEach((lesson, index) => {
    const sourceCode = getLessonSourceCode(lesson);
    const key = sourceCode ? `lesson-${sourceCode.lessonNumber}` : `lesson-${lesson.id || index}`;
    const existing = uniqueLessons.get(key);
    if (!existing || sourceCode?.codedChapterNumber === sourceCode?.chapterNumber) {
      uniqueLessons.set(key, lesson);
    }
  });
  return Array.from(uniqueLessons.values());
}

export function getLessonDisplayTitle(lesson) {
  const sourceCode = getLessonSourceCode(lesson);
  return sourceCode ? `Bài ${sourceCode.lessonNumber}` : lesson.title;
}

export function getLessonChapterName(lesson) {
  const sourceCode = getLessonSourceCode(lesson);
  return sourceCode ? `Chương ${sourceCode.chapterNumber}` : lesson.topic?.trim() || 'Chưa phân chương';
}

const docxTags = new Set([
  'a', 'b', 'blockquote', 'br', 'code', 'del', 'div', 'em', 'h1', 'h2', 'h3',
  'h4', 'h5', 'h6', 'hr', 'i', 'img', 'li', 'ol', 'p', 'pre', 's', 'span',
  'strong', 'sub', 'sup', 'table', 'tbody', 'td', 'th', 'thead', 'tr', 'u', 'ul'
]);
const discardedDocxTags = new Set(['iframe', 'object', 'script', 'style', 'svg', 'math']);

function safeDocxStyle(style) {
  const safeStyles = [];
  for (const declaration of style.split(';')) {
    const separator = declaration.indexOf(':');
    if (separator < 0) continue;
    const property = declaration.slice(0, separator).trim().toLowerCase();
    const value = declaration.slice(separator + 1).trim().toLowerCase();
    if (property === 'text-align' && ['left', 'center', 'right', 'justify'].includes(value)) {
      safeStyles.push(`${property}:${value}`);
    } else if (['color', 'background-color'].includes(property)
      && /^(#[\da-f]{3,8}|rgba?\([\d.%\s,]+\)|[a-z]{1,20})$/i.test(value)) {
      safeStyles.push(`${property}:${value}`);
    } else if (property === 'font-size' && /^\d+(?:\.\d+)?(?:px|pt|em|rem|%)$/i.test(value)) {
      safeStyles.push(`${property}:${value}`);
    } else if (property === 'font-weight' && /^(normal|bold|[1-9]00)$/.test(value)) {
      safeStyles.push(`${property}:${value}`);
    } else if (property === 'font-style' && ['normal', 'italic', 'oblique'].includes(value)) {
      safeStyles.push(`${property}:${value}`);
    } else if (property === 'text-decoration' && /^(none|underline|line-through|overline)$/.test(value)) {
      safeStyles.push(`${property}:${value}`);
    }
  }
  return safeStyles.join(';');
}

function sanitizeDocxHtml(html) {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const cleanNode = (node) => {
    if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent || '');
    if (node.nodeType !== Node.ELEMENT_NODE) return null;

    const tag = node.tagName.toLowerCase();
    if (discardedDocxTags.has(tag)) return null;
    const cleanChildren = Array.from(node.childNodes).map(cleanNode).filter(Boolean);
    if (!docxTags.has(tag)) {
      const wrapper = document.createDocumentFragment();
      cleanChildren.forEach((child) => wrapper.append(child));
      return wrapper;
    }

    const clean = document.createElement(tag);
    if (tag === 'img') {
      const source = node.getAttribute('src') || '';
      if (!/^data:image\/(?:png|jpe?g|gif|webp|bmp);base64,[\da-z+/=]+$/i.test(source)) return null;
      clean.setAttribute('src', source);
      clean.setAttribute('alt', (node.getAttribute('alt') || '').slice(0, 500));
      for (const dimension of ['width', 'height']) {
        const value = node.getAttribute(dimension);
        if (value && /^\d{1,4}$/.test(value)) clean.setAttribute(dimension, value);
      }
    } else if (tag === 'a') {
      const href = node.getAttribute('href') || '';
      try {
        const url = new URL(href, window.location.origin);
        if (['http:', 'https:', 'mailto:'].includes(url.protocol)) {
          clean.setAttribute('href', href);
          clean.setAttribute('target', '_blank');
          clean.setAttribute('rel', 'noopener noreferrer');
        }
      } catch {
        // Drop invalid links while keeping their text.
      }
    } else if (tag === 'td' || tag === 'th') {
      for (const attribute of ['colspan', 'rowspan']) {
        const value = node.getAttribute(attribute);
        if (value && /^\d{1,2}$/.test(value) && Number(value) > 0) clean.setAttribute(attribute, value);
      }
    }

    const style = safeDocxStyle(node.getAttribute('style') || '');
    if (style) clean.setAttribute('style', style);
    cleanChildren.forEach((child) => clean.append(child));
    return clean;
  };

  const container = document.createElement('div');
  Array.from(parsed.body.childNodes).map(cleanNode).filter(Boolean).forEach((node) => container.append(node));
  return container.innerHTML;
}

export async function renderDocxHtml(arrayBuffer) {
  const result = await mammoth.convertToHtml({ arrayBuffer }, {
    convertImage: mammoth.images.imgElement((image) => image.read('base64').then((data) => ({
      src: `data:${image.contentType};base64,${data}`
    })))
  });
  return sanitizeDocxHtml(result.value);
}

export async function extractLearningText(file) {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (['txt', 'md', 'csv', 'json'].includes(extension)) return file.text();
  if (extension === 'docx') {
    return (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value;
  }
  if (extension === 'pdf') {
    const pdf = await getDocument({ data: await file.arrayBuffer() }).promise;
    const pages = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => item.str).join(' '));
    }
    return pages.join('\n');
  }
  throw new Error('Chỉ hỗ trợ PDF, DOCX, TXT hoặc Markdown.');
}
