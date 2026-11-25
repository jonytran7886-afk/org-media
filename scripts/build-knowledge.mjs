import fs from 'node:fs/promises';
import path from 'node:path';
import { buildKnowledge } from '../server/ai/knowledge-service.js';
import { root } from '../server/ai/document-parser.js';
const index=await buildKnowledge();
await fs.mkdir(path.join(root,'server/.cache'),{recursive:true});
await fs.writeFile(path.join(root,'server/.cache/knowledge-index.json'),JSON.stringify(index),{mode:0o600});
console.log(`Organic AI: ${index.documents.filter(d=>d.indexStatus==='indexed').length} documents, ${index.chunks.length} chunks indexed (server only).`);
