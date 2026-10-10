const crypto = require('crypto');
const { getSupabaseAdminClient } = require('../models/supabaseAdminClient');
const { getSupabaseClient } = require('../models/supabaseClient');

const DEFAULT_BASE_URL = 'http://localhost:11434';
const DEFAULT_EMBEDDING_MODEL = 'nomic-embed-text';
const DEFAULT_STORAGE_BUCKET = 'Math4mdfile';
const DEFAULT_STORAGE_PREFIX = '';
const DEFAULT_CHUNK_SIZE = 900;
const DEFAULT_CHUNK_OVERLAP = 120;
const DEFAULT_TOP_K = 4;
const DEFAULT_MIN_SIMILARITY = 0.35;
const EMBEDDING_DIMENSIONS = 768;
const QUERY_STOP_WORDS = new Set([
  'các', 'cái', 'của', 'cho', 'con', 'để', 'được', 'gì', 'hay', 'hãy', 'là',
  'mà', 'một', 'nào', 'này', 'như', 'ở', 'sao', 'thế', 'thì', 'trong', 'từ',
  'và', 'về', 'với', 'có', 'tại', 'theo', 'bao', 'nhiêu', 'em', 'tôi'
]);

let refreshPromise;

function getBaseUrl() {
  return (process.env.OLLAMA_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
}

function getEmbeddingModel() {
  return process.env.OLLAMA_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL;
}

function getKnowledgeBaseBucket(options = {}) {
  const bucket = options.bucket || process.env.KB_STORAGE_BUCKET || DEFAULT_STORAGE_BUCKET;
  const prefix = options.prefix ?? process.env.KB_STORAGE_PREFIX ?? DEFAULT_STORAGE_PREFIX;
  if (!bucket.trim() || prefix.startsWith('/') || prefix.split('/').includes('..')) {
    throw new Error('KB_STORAGE_BUCKET and KB_STORAGE_PREFIX must identify a valid Supabase Storage folder.');
  }
  return { bucket, prefix: prefix.replace(/^\/+|\/+$/g, '') };
}

function getKnowledgeBaseSource(options = {}) {
  const { bucket, prefix } = getKnowledgeBaseBucket(options);
  return {
    bucket,
    objectPath: prefix,
    sourceFile: prefix ? `${bucket}/${prefix}` : bucket
  };
}

function getTopK() {
  const value = Number(process.env.KB_TOP_K);
  return Number.isInteger(value) && value > 0 ? Math.min(value, 10) : DEFAULT_TOP_K;
}

function getMinimumSimilarity() {
  const value = Number(process.env.KB_MIN_SIMILARITY);
  return Number.isFinite(value) && value >= 0 && value <= 1 ? value : DEFAULT_MIN_SIMILARITY;
}

function splitLongParagraph(paragraph, maxChars, overlapChars) {
  const chunks = [];
  let start = 0;
  while (start < paragraph.length) {
    let end = Math.min(start + maxChars, paragraph.length);
    if (end < paragraph.length) {
      const boundary = paragraph.lastIndexOf(' ', end);
      if (boundary > start) end = boundary;
    }
    chunks.push(paragraph.slice(start, end).trim());
    if (end >= paragraph.length) break;
    start = Math.max(start + 1, end - overlapChars);
    while (start < end && /\s/.test(paragraph[start])) start += 1;
  }
  return chunks;
}

function splitSection(text, maxChars, overlapChars) {
  const chunks = [];
  let current = '';
  for (const paragraph of text.split(/\n\s*\n/).map((value) => value.trim()).filter(Boolean)) {
    if (paragraph.length > maxChars) {
      if (current) chunks.push(current);
      current = '';
      chunks.push(...splitLongParagraph(paragraph, maxChars, overlapChars));
      continue;
    }
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length > maxChars && current) {
      chunks.push(current);
      current = paragraph;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function splitKnowledgeBase(markdown, options = {}) {
  if (typeof markdown !== 'string' || !markdown.trim()) {
    throw new Error('Knowledge base is empty.');
  }
  const maxChars = options.maxChars || DEFAULT_CHUNK_SIZE;
  const overlapChars = options.overlapChars ?? DEFAULT_CHUNK_OVERLAP;
  const headingPattern = /^##\s+(\d+)\.\s+(.+)$/gm;
  const headings = [...markdown.matchAll(headingPattern)];
  const sections = [];

  if (!headings.length) {
    sections.push({ number: '1', title: 'Tài liệu', body: markdown.trim() });
  } else {
    headings.forEach((heading, index) => {
      sections.push({
        number: heading[1],
        title: heading[2].trim(),
        body: markdown.slice(
          heading.index + heading[0].length,
          headings[index + 1]?.index ?? markdown.length
        ).trim()
      });
    });
    const introduction = markdown.slice(0, headings[0].index)
      .replace(/^#\s+.+$/gm, '')
      .trim();
    if (introduction) sections.unshift({ number: '0', title: 'Mở đầu', body: introduction });
  }

  return sections.flatMap((section) => {
    const content = `§${section.number}. ${section.title}\n${section.body}`.trim();
    return splitSection(content, maxChars, overlapChars).map((text, index) => ({
      id: `file-md-s${section.number}-c${index + 1}`,
      text,
      source: {
        file: options.sourceFile || getKnowledgeBaseSource(options).sourceFile,
        sectionNumber: section.number,
        sectionTitle: section.title,
        chunkNumber: index + 1
      }
    }));
  });
}

async function listMarkdownFiles(client, bucket, prefix) {
  const storage = client.storage.from(bucket);
  const files = [];
  const visitFolder = async (folderPath) => {
    const folderFiles = [];
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await storage.list(folderPath, {
        limit: 100,
        offset,
        sortBy: { column: 'name', order: 'asc' }
      });
      if (error) {
        throw new Error(`Could not list Supabase Storage folder ${bucket}/${folderPath}: ${error.message}`);
      }
      if (!Array.isArray(data)) throw new Error(`Supabase Storage returned an invalid listing for ${bucket}/${folderPath}.`);
      folderFiles.push(...data);
      if (data.length < 100) break;
    }
    for (const item of folderFiles) {
      if (item.name === '.emptyFolderPlaceholder') continue;
      const objectPath = [folderPath, item.name].filter(Boolean).join('/');
      if (item.id === null && !item.metadata) {
        await visitFolder(objectPath);
      } else if (/\.md$/i.test(item.name)) {
        files.push(objectPath);
      }
    }
  };
  await visitFolder(prefix);
  return files.sort((left, right) => left.localeCompare(right));
}

async function downloadMarkdown(client, bucket, objectPath) {
  const { data, error } = await client.storage.from(bucket).download(objectPath);
  if (error) {
    throw new Error(`Could not download ${objectPath} from Supabase Storage bucket ${bucket}: ${error.message}`);
  }
  if (!data || typeof data.text !== 'function') {
    throw new Error(`Supabase Storage returned an invalid Markdown file for ${bucket}/${objectPath}.`);
  }
  const markdown = await data.text();
  if (!markdown.trim()) throw new Error(`Knowledge base file ${bucket}/${objectPath} is empty.`);
  return markdown;
}

async function embedTexts(texts, options = {}) {
  const model = options.model || getEmbeddingModel();
  const response = await fetch(`${getBaseUrl()}/api/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: options.signal,
    body: JSON.stringify({ model, input: texts })
  });
  if (!response.ok) {
    const details = (await response.text()).slice(0, 500);
    throw new Error(`Ollama embedding request failed (${response.status}): ${details}`);
  }
  const data = await response.json();
  if (!Array.isArray(data.embeddings) || data.embeddings.length !== texts.length
    || data.embeddings.some((embedding) => !Array.isArray(embedding)
      || embedding.length !== EMBEDDING_DIMENSIONS
      || embedding.some((value) => !Number.isFinite(value)))) {
    throw new Error(
      `Ollama must return ${EMBEDDING_DIMENSIONS}-dimension embeddings for the Supabase vector store.`
    );
  }
  return data.embeddings;
}

async function replaceKnowledgeBase(client, chunks, embeddings, sourceHash, sourceFile, embeddingModel) {
  const { error: deleteMetadataError } = await client
    .from('chatbot_kb_metadata')
    .delete()
    .eq('source_file', sourceFile);
  if (deleteMetadataError) {
    throw new Error(`Could not invalidate the previous Supabase knowledge-base index: ${deleteMetadataError.message}`);
  }
  const { error: deleteChunksError } = await client
    .from('chatbot_kb_chunks')
    .delete()
    .eq('source_file', sourceFile);
  if (deleteChunksError) {
    throw new Error(`Could not replace Supabase knowledge-base chunks: ${deleteChunksError.message}`);
  }

  const rows = chunks.map((chunk, index) => ({
    id: chunk.id,
    content: chunk.text,
    source_file: sourceFile,
    section_number: chunk.source.sectionNumber,
    section_title: chunk.source.sectionTitle,
    chunk_number: chunk.source.chunkNumber,
    embedding: JSON.stringify(embeddings[index])
  }));
  for (let offset = 0; offset < rows.length; offset += 100) {
    const { error } = await client.from('chatbot_kb_chunks').insert(rows.slice(offset, offset + 100));
    if (error) throw new Error(`Could not save Supabase knowledge-base vectors: ${error.message}`);
  }

  const { error: metadataError } = await client.from('chatbot_kb_metadata').insert({
    source_file: sourceFile,
    source_hash: sourceHash,
    embedding_model: embeddingModel,
    chunk_count: chunks.length,
    ingested_at: new Date().toISOString()
  });
  if (metadataError) {
    throw new Error(`Could not save Supabase knowledge-base metadata: ${metadataError.message}`);
  }
}

async function ingestKnowledgeBase(options = {}) {
  const { bucket, prefix } = getKnowledgeBaseBucket(options);
  const client = options.adminClient || getSupabaseAdminClient();
  const embeddingModel = options.model || getEmbeddingModel();
  const objectPaths = await listMarkdownFiles(client, bucket, prefix);

  const storedMetadata = new Map();
  const sourcePrefix = `${bucket}/${prefix ? `${prefix}/` : ''}`;
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client
      .from('chatbot_kb_metadata')
      .select('source_file, source_hash, embedding_model, chunk_count')
      .range(offset, offset + 999);
    if (error) throw new Error(`Could not list Supabase knowledge-base metadata: ${error.message}`);
    if (!Array.isArray(data)) throw new Error('Supabase returned an invalid knowledge-base metadata listing.');
    data.forEach((item) => {
      if (item.source_file.startsWith(sourcePrefix)) storedMetadata.set(item.source_file, item);
    });
    if (data.length < 1000) break;
  }

  const activeSources = new Set();
  let indexedFiles = 0;
  let reusedFiles = 0;
  let chunkCount = 0;
  for (const objectPath of objectPaths) {
    const sourceFile = `${bucket}/${objectPath}`;
    activeSources.add(sourceFile);
    const markdown = await downloadMarkdown(client, bucket, objectPath);
    const chunks = splitKnowledgeBase(markdown, { ...options, sourceFile });
    const sourceHash = crypto.createHash('sha256')
      .update(JSON.stringify({
        markdown,
        maxChars: options.maxChars || DEFAULT_CHUNK_SIZE,
        overlapChars: options.overlapChars ?? DEFAULT_CHUNK_OVERLAP
      }), 'utf8')
      .digest('hex');
    const metadata = storedMetadata.get(sourceFile);
    if (!options.force && metadata?.source_hash === sourceHash
      && metadata.embedding_model === embeddingModel
      && Number(metadata.chunk_count) === chunks.length) {
      reusedFiles += 1;
      chunkCount += chunks.length;
      continue;
    }

    const embeddings = await embedTexts(chunks.map((chunk) => chunk.text), {
      model: embeddingModel,
      signal: options.signal
    });
    await replaceKnowledgeBase(client, chunks, embeddings, sourceHash, sourceFile, embeddingModel);
    indexedFiles += 1;
    chunkCount += chunks.length;
  }

  let deletedFiles = 0;
  for (const sourceFile of storedMetadata.keys()) {
    if (activeSources.has(sourceFile)) continue;
    const { error: chunkError } = await client
      .from('chatbot_kb_chunks')
      .delete()
      .eq('source_file', sourceFile);
    if (chunkError) throw new Error(`Could not remove vectors for deleted Storage file ${sourceFile}: ${chunkError.message}`);
    const { error: metadataError } = await client
      .from('chatbot_kb_metadata')
      .delete()
      .eq('source_file', sourceFile);
    if (metadataError) throw new Error(`Could not remove metadata for deleted Storage file ${sourceFile}: ${metadataError.message}`);
    deletedFiles += 1;
  }

  return {
    bucket,
    fileCount: objectPaths.length,
    chunkCount,
    indexedFiles,
    reusedFiles,
    deletedFiles,
    embeddingModel
  };
}

async function ensureKnowledgeBase(options = {}) {
  if (!refreshPromise) {
    refreshPromise = ingestKnowledgeBase(options).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

function cosineSimilarity(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length || left.length === 0) return 0;
  let dotProduct = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < left.length; index += 1) {
    if (!Number.isFinite(left[index]) || !Number.isFinite(right[index])) return 0;
    dotProduct += left[index] * right[index];
    leftMagnitude += left[index] ** 2;
    rightMagnitude += right[index] ** 2;
  }
  if (!leftMagnitude || !rightMagnitude) return 0;
  return dotProduct / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

function rankChunks(queryEmbedding, chunks, options = {}) {
  const limit = options.limit || getTopK();
  return chunks
    .map((chunk) => ({ ...chunk, similarity: cosineSimilarity(queryEmbedding, chunk.embedding) }))
    .sort((left, right) => right.similarity - left.similarity)
    .slice(0, limit);
}

function hasLexicalEvidence(query, chunks) {
  const queryTerms = (query.toLocaleLowerCase('vi').match(/[\p{L}\p{N}]+/gu) || [])
    .filter((term) => term.length > 1 && !QUERY_STOP_WORDS.has(term));
  if (!queryTerms.length) return false;
  const evidenceTerms = new Set(chunks.flatMap((chunk) => chunk.text.toLocaleLowerCase('vi').match(/[\p{L}\p{N}]+/gu) || []));
  return queryTerms.some((term) => evidenceTerms.has(term));
}

async function retrieveKnowledge(query, options = {}) {
  if (!options.accessToken && !options.userClient) {
    throw new Error('An authenticated Supabase session is required to search the knowledge base.');
  }
  await ensureKnowledgeBase(options);
  const queryEmbedding = (await embedTexts([query], { signal: options.signal }))[0];
  const client = options.userClient || getSupabaseClient(options.accessToken);
  const { data, error } = await client.rpc('match_chatbot_kb_chunks', {
    query_embedding: `[${queryEmbedding.join(',')}]`,
    match_count: options.limit || getTopK()
  });
  if (error) throw new Error(`Supabase vector search failed: ${error.message}`);
  if (!Array.isArray(data)) throw new Error('Supabase vector search returned an invalid response.');

  return data.map((row) => ({
    id: row.id,
    text: row.content,
    source: {
      file: row.source_file,
      sectionNumber: String(row.section_number),
      sectionTitle: row.section_title,
      chunkNumber: row.chunk_number
    },
    similarity: Number(row.similarity)
  }));
}

function sourceLabel(source) {
  return `${source.file} — §${source.sectionNumber} ${source.sectionTitle}, đoạn ${source.chunkNumber}`;
}

function extractProcedureSteps(question, chunks) {
  if (!/\b(cách|làm sao|làm thế nào|như thế nào)\b/i.test(question)) return null;
  const chunk = chunks.find((item) => /cách đo góc/i.test(item.source.sectionTitle));
  if (!chunk) return null;
  const steps = chunk.text.split(/\r?\n/).filter((line) => /^-\s*Bước\s+\d+:/i.test(line.trim()));
  if (steps.length < 2) return null;
  return {
    chunk,
    message: `Để đo góc bằng thước đo góc:\n${steps.join('\n')}`
  };
}

module.exports = {
  cosineSimilarity,
  embedTexts,
  extractProcedureSteps,
  getKnowledgeBaseBucket,
  getKnowledgeBaseSource,
  getMinimumSimilarity,
  getTopK,
  hasLexicalEvidence,
  ingestKnowledgeBase,
  listMarkdownFiles,
  rankChunks,
  retrieveKnowledge,
  sourceLabel,
  splitKnowledgeBase
};
