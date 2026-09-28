import mammoth from 'mammoth';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = pdfWorker;

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
