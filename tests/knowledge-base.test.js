const test = require('node:test');
const assert = require('node:assert/strict');
const {
  cosineSimilarity,
  extractProcedureSteps,
  hasLexicalEvidence,
  ingestKnowledgeBase,
  rankChunks,
  retrieveKnowledge,
  sourceLabel,
  splitKnowledgeBase
} = require('../services/knowledgeBase');

test('splits Markdown into chunks with section and chunk source metadata', () => {
  const chunks = splitKnowledgeBase([
    '# Bài học',
    '## 1. Định nghĩa góc',
    'Góc được tạo bởi hai tia chung gốc.',
    '## 2. Đơn vị đo',
    'Đơn vị đo góc là độ, ký hiệu °.'
  ].join('\n\n'), { sourceFile: 'Math4mdfile/C2B7_Do_goc_Don_vi_do_goc.md' });

  assert.equal(chunks.length, 2);
  assert.equal(chunks[0].source.sectionTitle, 'Định nghĩa góc');
  assert.equal(chunks[0].source.sectionNumber, '1');
  assert.equal(chunks[1].id, 'file-md-s2-c1');
  assert.equal(
    sourceLabel(chunks[0].source),
    'Math4mdfile/C2B7_Do_goc_Don_vi_do_goc.md — §1 Định nghĩa góc, đoạn 1'
  );
});

test('splits long sections into bounded overlapping chunks', () => {
  const chunks = splitKnowledgeBase('## 1. Nội dung\n' + 'a'.repeat(120), { maxChars: 40, overlapChars: 10 });

  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => chunk.text.length <= 40));
  assert.equal(chunks[0].source.chunkNumber, 1);
  assert.equal(chunks[1].source.chunkNumber, 2);
});

test('ranks top chunks by similarity while retaining scores for inspection', () => {
  const chunks = [
    { id: 'angle', embedding: [1, 0], source: { sectionNumber: '1' } },
    { id: 'unrelated', embedding: [0, 1], source: { sectionNumber: '2' } }
  ];

  assert.equal(cosineSimilarity([1, 0], [1, 0]), 1);
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
  const ranked = rankChunks([1, 0], chunks, { limit: 2 });
  assert.deepEqual(ranked.map(({ id }) => id), ['angle', 'unrelated']);
  assert.equal(ranked[1].similarity, 0);
});

test('rejects retrieved text without topical evidence from the question', () => {
  const chunks = [{ text: '§4. Thước đo góc\nTâm thước và vạch chia độ.' }];

  assert.equal(hasLexicalEvidence('Thủ đô nước Pháp là gì?', chunks), false);
  assert.equal(hasLexicalEvidence('Thước đo góc có bộ phận nào?', chunks), true);
  assert.equal(hasLexicalEvidence('Có gì?', chunks), false);
});

test('answers measuring-angle procedure questions by quoting retrieved steps', () => {
  const chunks = splitKnowledgeBase([
    '## 5. Cách đo góc bằng thước đo góc',
    '- Bước 1: Đặt tâm thước trùng với đỉnh góc.',
    '- Bước 2: Đặt một cạnh góc trùng với vạch 0°.',
    '- Bước 3: Đọc số nơi cạnh còn lại đi qua.'
  ].join('\n'));
  const answer = extractProcedureSteps('làm sao để đo góc bằng thước', chunks);

  assert.equal(answer.chunk.id, 'file-md-s5-c1');
  assert.match(answer.message, /Đặt tâm thước trùng với đỉnh góc/);
  assert.match(answer.message, /Đặt một cạnh góc trùng với vạch 0°/);
  assert.match(answer.message, /Đọc số nơi cạnh còn lại đi qua/);
  assert.equal(extractProcedureSteps('thước đo góc có gì', chunks), null);
});

test('stores embeddings and metadata in Supabase and re-embeds only when the KB changes', async () => {
  const previousFetch = global.fetch;
  const previousEmbeddingModel = process.env.OLLAMA_EMBEDDING_MODEL;
  const state = {
    metadata: new Map([['OtherKB/lesson.md', {
      source_file: 'OtherKB/lesson.md',
      source_hash: 'unrelated',
      embedding_model: 'test-embedding-model',
      chunk_count: 1
    }]]),
    chunks: [],
    files: new Map([['lesson.md', '## 1. Angle\nThe vertex joins two rays.']])
  };
  let embeddingRequests = 0;
  const sourceReads = [];
  const adminClient = {
    storage: {
      from(bucket) {
        return {
          async list(folderPath) {
            const names = new Set();
            for (const objectPath of state.files.keys()) {
              const prefix = folderPath ? `${folderPath}/` : '';
              if (!objectPath.startsWith(prefix)) continue;
              const remainder = objectPath.slice(prefix.length);
              const [name, ...remaining] = remainder.split('/');
              if (!name) continue;
              if (remaining.length) {
                names.add(JSON.stringify({ name, id: null, metadata: null }));
              } else {
                names.add(JSON.stringify({ name, id: `id-${objectPath}`, metadata: { mimetype: 'text/markdown' } }));
              }
            }
            return { data: [...names].map((item) => JSON.parse(item)), error: null };
          },
          async download(objectPath) {
            sourceReads.push({ bucket, objectPath });
            if (!state.files.has(objectPath)) return { data: null, error: { message: 'not found' } };
            return { data: new Blob([state.files.get(objectPath)]), error: null };
          }
        };
      }
    },
    from(table) {
      if (table === 'chatbot_kb_metadata') {
        return {
          select() { return this; },
          async range() {
            return { data: [...state.metadata.values()], error: null };
          },
          delete() {
            return {
              async eq(_column, sourceFile) {
                state.metadata.delete(sourceFile);
                return { error: null };
              }
            };
          },
          async insert(row) {
            state.metadata.set(row.source_file, row);
            return { error: null };
          }
        };
      }
      return {
        delete() {
          return {
            async eq(_column, sourceFile) {
              state.chunks = state.chunks.filter((chunk) => chunk.source_file !== sourceFile);
              return { error: null };
            }
          };
        },
        async insert(rows) {
          state.chunks.push(...rows);
          return { error: null };
        }
      };
    }
  };
  const userClient = {
    async rpc(_functionName, parameters) {
      const queryEmbedding = JSON.parse(parameters.query_embedding);
      const ranked = state.chunks.map((chunk) => {
        const vector = JSON.parse(chunk.embedding);
        const score = cosineSimilarity(queryEmbedding, vector);
        return {
          id: chunk.id,
          content: chunk.content,
          source_file: chunk.source_file,
          section_number: chunk.section_number,
          section_title: chunk.section_title,
          chunk_number: chunk.chunk_number,
          similarity: score
        };
      }).sort((left, right) => right.similarity - left.similarity);
      return { data: ranked.slice(0, parameters.match_count), error: null };
    }
  };
  global.fetch = async (_url, request) => {
    embeddingRequests += 1;
    const { input } = JSON.parse(request.body);
    return new Response(JSON.stringify({
      embeddings: input.map((text) => {
        const vector = Array(768).fill(0);
        if (text.toLowerCase().includes('vertex')) vector[0] = 1;
        else vector[1] = 1;
        return vector;
      })
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  process.env.OLLAMA_EMBEDDING_MODEL = 'test-embedding-model';

  try {
    const options = {
      bucket: 'TestKB',
      prefix: '',
      adminClient,
      userClient
    };
    const firstIngest = await ingestKnowledgeBase(options);
    assert.equal(firstIngest.indexedFiles, 1);
    assert.equal(firstIngest.chunkCount, 1);
    assert.equal(state.chunks.length, 1);
    assert.ok(state.metadata.has('OtherKB/lesson.md'));
    assert.equal(JSON.parse(state.chunks[0].embedding).length, 768);
    assert.equal(state.chunks[0].source_file, 'TestKB/lesson.md');
    assert.deepEqual(sourceReads[0], { bucket: 'TestKB', objectPath: 'lesson.md' });

    const unchangedIngest = await ingestKnowledgeBase(options);
    assert.equal(unchangedIngest.reusedFiles, 1);
    assert.equal(unchangedIngest.indexedFiles, 0);
    assert.equal(embeddingRequests, 1);

    const matches = await retrieveKnowledge('vertex angle', {
      ...options,
      accessToken: 'authenticated-user-token'
    });
    assert.equal(matches[0].source.sectionTitle, 'Angle');
    assert.equal(matches[0].source.file, 'TestKB/lesson.md');
    assert.equal(matches[0].similarity, 1);
    assert.equal(embeddingRequests, 2);

    state.files.set('nested/new-lesson.md', '## 1. New lesson\nThe vertex and rays.');
    const addedFileMatches = await retrieveKnowledge('vertex rays', {
      ...options,
      accessToken: 'authenticated-user-token'
    });
    assert.ok(state.metadata.has('TestKB/nested/new-lesson.md'));
    assert.ok(state.chunks.some((chunk) => chunk.source_file === 'TestKB/nested/new-lesson.md'));
    assert.ok(addedFileMatches.some((chunk) => chunk.source.file === 'TestKB/nested/new-lesson.md'));

    state.files.delete('nested/new-lesson.md');
    const deletedFileIngest = await ingestKnowledgeBase(options);
    assert.equal(deletedFileIngest.deletedFiles, 1);
    assert.ok(!state.chunks.some((chunk) => chunk.source_file === 'TestKB/nested/new-lesson.md'));

    state.files.set('lesson.md', '## 1. Angle\nThe vertex joins two rays. A new note.');
    const changedIngest = await ingestKnowledgeBase(options);
    assert.equal(changedIngest.indexedFiles, 1);
    assert.ok(embeddingRequests >= 5);
    assert.equal(state.metadata.get('TestKB/lesson.md').chunk_count, 1);

    state.files.delete('lesson.md');
    const emptyIngest = await ingestKnowledgeBase(options);
    assert.equal(emptyIngest.fileCount, 0);
    assert.equal(emptyIngest.deletedFiles, 1);
    assert.equal(state.chunks.length, 0);
    assert.deepEqual([...state.metadata.keys()], ['OtherKB/lesson.md']);
  } finally {
    global.fetch = previousFetch;
    if (previousEmbeddingModel === undefined) delete process.env.OLLAMA_EMBEDDING_MODEL;
    else process.env.OLLAMA_EMBEDDING_MODEL = previousEmbeddingModel;
  }
});
