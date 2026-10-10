require('dotenv').config();

const { ingestKnowledgeBase } = require('../services/knowledgeBase');

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 120000);

ingestKnowledgeBase({ signal: controller.signal, force: process.argv.includes('--rebuild') })
  .then(({ bucket, fileCount, chunkCount, indexedFiles, reusedFiles, deletedFiles, embeddingModel }) => {
    console.log(`Scanned ${fileCount} Markdown files in ${bucket}; indexed ${indexedFiles}, reused ${reusedFiles}, removed ${deletedFiles}.`);
    console.log(`Supabase now has ${chunkCount} chunks embedded with ${embeddingModel}.`);
  })
  .catch((error) => {
    console.error(`Knowledge-base ingestion failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => clearTimeout(timeout));
