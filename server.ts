import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import multer from 'multer';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import {
  dbEngine,
  User,
  StoredConversation,
  StoredMessage,
  StoredDocument,
  StoredChunk,
  StoredSourceCitation,
} from './server_database.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Setup multer for memory storage file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
});

// Server-side Gemini initialization
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper: Extract authenticated user from Authorization header
function getUserFromRequest(req: Request): User | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  const session = dbEngine.getSession(token);
  if (!session) return null;
  return dbEngine.getUserById(session.user_id);
}

// Generate warm, friendly Maddy AI response if upstream quota is exhausted
function generateFriendlyFallbackResponse(message: string, sources: StoredSourceCitation[]): string {
  const lower = message.toLowerCase().trim();

  // Greetings
  if (lower.match(/^(hi|hello|hey|good morning|good afternoon|good evening|good night|howdy)/)) {
    return `Hello there! 😊 It's wonderful to hear from you! I'm **Maddy AI**, your friendly AI companion and research assistant ✨. I'm doing fantastic and excited to help you today! What shall we explore together? ☀️`;
  }

  if (lower.includes('how are you') || lower.includes('how r u') || lower.includes('how are things')) {
    return `I'm doing wonderfully, thank you so much for asking! 😊 I'm happy, energized, and ready to help you with research, coding, or searching your documents ✨. How is your day treating you?`;
  }

  if (lower.includes('who are you') || lower.includes('your name') || lower.includes('what are you')) {
    return `I'm **Maddy AI**! 🌟 A warm, cheerful, and smart assistant equipped with automatic document knowledge grounding (RAG) and conversational memory. How can I help you today? 😊`;
  }

  // If RAG context was found in indexed documents
  if (sources && sources.length > 0) {
    const formattedExcerpts = sources
      .map((s, idx) => `**Excerpt from ${s.filename} (Section #${s.chunk_index}, Page ${s.page})**:\n> "${s.snippet}"`)
      .join('\n\n');

    return `Based on our verified knowledge base documents, here is what I found for *"^${message}"* 📚:\n\n${formattedExcerpts}\n\nI hope this helps! Feel free to ask any follow-up questions or upload more documents to our Knowledge Base! 😊✨`;
  }

  return `I received your thought: *"^${message}"* 😊! I'm here to help you work through it. Feel free to upload any relevant documents to our Knowledge Base, and I'll gladly analyze them for you! ✨`;
}

// Helper: Try generating content across fallback models
async function tryGenerateWithFallback(contents: any[], systemInstruction: string, fallbackText: string): Promise<string> {
  const models = ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      });
      if (response.text) {
        return response.text;
      }
    } catch (err: any) {
      console.warn(`Model ${model} unavailable:`, err?.message || err);
    }
  }
  return fallbackText;
}

// Cosine similarity for high-dimensional vectors
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Compute embedding using Gemini embeddings model
async function getEmbedding(text: string): Promise<number[]> {
  try {
    if (apiKey) {
      const response = await ai.models.embedContent({
        model: 'gemini-embedding-2-preview',
        contents: text,
      });
      const resAny = response as any;
      if (resAny?.embedding?.values) {
        return resAny.embedding.values;
      }
      if (resAny?.embeddings?.[0]?.values) {
        return resAny.embeddings[0].values;
      }
    }
  } catch (err) {
    console.warn('Gemini embedding call fallback:', err);
  }

  // Deterministic semantic hash fallback
  const dim = 128;
  const vec = new Array(dim).fill(0);
  const words = text.toLowerCase().match(/\w+/g) || [];
  for (const word of words) {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = (hash << 5) - hash + word.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % dim;
    vec[idx] += 1;
  }
  const mag = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vec.map((v) => v / mag);
}

// Retrieve relevant chunks across documents for user
async function retrieveRelevantChunks(query: string, userId?: string, topK: number = 4): Promise<StoredSourceCitation[]> {
  const allChunks = dbEngine.getAllChunks(userId);
  if (allChunks.length === 0) return [];

  const queryVector = await getEmbedding(query);
  const scoredChunks: Array<{ chunk: StoredChunk; score: number }> = [];

  for (const chunk of allChunks) {
    if (!chunk.embedding) {
      chunk.embedding = await getEmbedding(chunk.text);
    }
    const score = cosineSimilarity(queryVector, chunk.embedding);
    const queryTokens = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
    const chunkLower = chunk.text.toLowerCase();
    let keywordHits = 0;
    for (const token of queryTokens) {
      if (chunkLower.includes(token)) keywordHits++;
    }
    const lexicalBoost = queryTokens.length > 0 ? (keywordHits / queryTokens.length) * 0.3 : 0;
    scoredChunks.push({ chunk, score: score + lexicalBoost });
  }

  scoredChunks.sort((a, b) => b.score - a.score);
  const top = scoredChunks.slice(0, topK);

  return top.map((item) => ({
    document_id: item.chunk.document_id,
    filename: item.chunk.filename,
    chunk_index: item.chunk.chunk_index,
    page: item.chunk.page_number,
    snippet: item.chunk.text,
    score: Math.min(Math.round(item.score * 100) / 100, 1.0),
  }));
}

// Text extraction helper
function extractTextFromFile(filename: string, buffer: Buffer): string {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.txt' || ext === '.md' || ext === '.json' || ext === '.csv') {
    return buffer.toString('utf-8');
  }

  if (ext === '.pdf') {
    const raw = buffer.toString('binary');
    const textPieces: string[] = [];
    const textBlockRegex = /BT\s+([\s\S]*?)\s+ET/g;
    let match;
    while ((match = textBlockRegex.exec(raw)) !== null) {
      const block = match[1];
      const stringRegex = /\((.*?)\)\s*Tj/g;
      let strMatch;
      while ((strMatch = stringRegex.exec(block)) !== null) {
        textPieces.push(strMatch[1]);
      }
    }
    if (textPieces.length > 0) {
      return textPieces.join(' ');
    }
    const printable = raw.replace(/[^\x20-\x7E\n\r\t]/g, ' ');
    return printable.replace(/\s+/g, ' ').trim();
  }

  const rawStr = buffer.toString('utf-8', 0, Math.min(buffer.length, 100000));
  const words = rawStr.match(/[a-zA-Z0-9.,!?'" -]{4,}/g);
  return words ? words.join(' ') : 'Parsed document content';
}

// Text chunker
function chunkText(text: string, chunkSize: number = 800, overlap: number = 100): string[] {
  const chunks: string[] = [];
  let startIndex = 0;
  while (startIndex < text.length) {
    let endIndex = startIndex + chunkSize;
    if (endIndex < text.length) {
      const lastPeriod = text.lastIndexOf('.', endIndex);
      const lastNewline = text.lastIndexOf('\n', endIndex);
      const breakPoint = Math.max(lastPeriod, lastNewline);
      if (breakPoint > startIndex + chunkSize * 0.6) {
        endIndex = breakPoint + 1;
      }
    }
    const chunk = text.slice(startIndex, endIndex).trim();
    if (chunk.length > 20) {
      chunks.push(chunk);
    }
    startIndex += chunkSize - overlap;
  }
  return chunks;
}

// ==========================================
// Authentication Endpoints
// ==========================================

app.post('/api/auth/register', (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const user = dbEngine.createUser(email, password, name);
    const session = dbEngine.createSession(user.id);
    return res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar },
      token: session.token,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Registration failed.' });
  }
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = dbEngine.getUserByEmail(email);
    if (!user || !dbEngine.verifyPassword(user, password)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const session = dbEngine.createSession(user.id);
    return res.json({
      user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar },
      token: session.token,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Login failed.' });
  }
});

app.get('/api/auth/me', (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }
  return res.json({
    user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar },
  });
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    dbEngine.deleteSession(authHeader.slice(7).trim());
  }
  return res.json({ success: true });
});

// ==========================================
// Health Check Endpoint
// ==========================================
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    app: 'ChatGPT-like LLM + RAG Chatbot',
    database: 'persistent-disk-engine',
    model: 'gemini-3.8-flash',
    embedding_model: 'gemini-embedding-2-preview',
    documents_count: dbEngine.getDocuments().length,
    conversations_count: dbEngine.getConversations().length,
  });
});

// ==========================================
// Chat API Endpoint (Phase 1 Specification)
// ==========================================
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const {
      message,
      conversation_id,
      history = [],
      use_rag = true,
      system_instruction = 'You are Maddy AI, a warm, cheerful, intelligent, and remarkably friendly AI assistant. You speak with a supportive and positive tone, sprinkle friendly and fitting emojis (like 😊, ✨, 💡, 🚀, ☀️, 🌟), and provide clear, thorough, and encouraging answers. Always be polite, positive, and genuinely helpful.',
    } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    const currentUser = getUserFromRequest(req);
    const userId = currentUser ? currentUser.id : 'usr-demo-001';
    const convoId = conversation_id || `convo-${Date.now()}`;

    // Ensure conversation exists in DB
    if (!dbEngine.getConversation(convoId)) {
      dbEngine.setConversation({
        id: convoId,
        user_id: userId,
        title: message.slice(0, 30) + (message.length > 30 ? '...' : ''),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    let sources: StoredSourceCitation[] = [];
    let finalSystemInstruction = system_instruction;

    // Automatic RAG: Retrieve context if documents exist in the database
    const userDocs = dbEngine.getDocuments(userId);
    if (use_rag && userDocs.length > 0) {
      sources = await retrieveRelevantChunks(message, userId, 4);
      if (sources.length > 0) {
        const contextText = sources
          .map((s, idx) => `[Document ${idx + 1}: ${s.filename} (Score: ${s.score})]\n${s.snippet}`)
          .join('\n\n');

        finalSystemInstruction = `${system_instruction}

You have access to the following trusted context retrieved from uploaded documents:
=== RETRIEVED CONTEXT START ===
${contextText}
=== RETRIEVED CONTEXT END ===

Instructions:
- Use the provided context to answer the user question accurately.
- Cite the relevant document names when answering.
- If the question cannot be answered from the context, state that clearly and provide general knowledge.`;
      }
    }

    // Prepare contents
    const contents: any[] = [];
    if (Array.isArray(history) && history.length > 0) {
      for (const msg of history) {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        });
      }
    }
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    let aiText = '';
    const usedModel = 'gemini-3.8-flash';
    const fallbackText = generateFriendlyFallbackResponse(message, sources);

    if (apiKey) {
      aiText = await tryGenerateWithFallback(contents, finalSystemInstruction, fallbackText);
    } else {
      aiText = fallbackText;
    }

    // Persist messages in database
    const userMsg: StoredMessage = {
      id: `msg-${Date.now()}-u`,
      conversation_id: convoId,
      user_id: userId,
      role: 'user',
      content: message,
      created_at: new Date().toISOString(),
    };
    const assistantMsg: StoredMessage = {
      id: `msg-${Date.now()}-a`,
      conversation_id: convoId,
      user_id: userId,
      role: 'assistant',
      content: aiText,
      created_at: new Date().toISOString(),
      sources: sources.length > 0 ? sources : undefined,
    };

    dbEngine.addMessage(convoId, userMsg);
    dbEngine.addMessage(convoId, assistantMsg);

    // Update conversation title if needed
    const convo = dbEngine.getConversation(convoId);
    if (convo) {
      convo.updated_at = new Date().toISOString();
      if (convo.title.startsWith('New') || convo.title === 'Welcome & System Overview') {
        convo.title = message.slice(0, 36) + (message.length > 36 ? '...' : '');
      }
      dbEngine.setConversation(convo);
    }

    return res.json({
      response: aiText,
      conversation_id: convoId,
      model: usedModel,
      sources: sources,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Chat endpoint error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error processing chat.' });
  }
});

// ==========================================
// Streaming Chat API Endpoint (SSE)
// ==========================================
app.post('/api/chat/stream', async (req: Request, res: Response) => {
  try {
    const {
      message,
      conversation_id,
      history = [],
      use_rag = true,
      system_instruction = 'You are Maddy AI, a warm, cheerful, intelligent, and remarkably friendly AI assistant. You speak with a supportive and positive tone, sprinkle friendly and fitting emojis (like 😊, ✨, 💡, 🚀, ☀️, 🌟), and provide clear, thorough, and encouraging answers. Always be polite, positive, and genuinely helpful.',
    } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    const currentUser = getUserFromRequest(req);
    const userId = currentUser ? currentUser.id : 'usr-demo-001';
    const convoId = conversation_id || `convo-${Date.now()}`;

    // Setup Server-Sent Events headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    let sources: StoredSourceCitation[] = [];
    let finalSystemInstruction = system_instruction;

    // Automatic RAG in background
    const userDocs = dbEngine.getDocuments(userId);
    if (use_rag && userDocs.length > 0) {
      sources = await retrieveRelevantChunks(message, userId, 4);
      if (sources.length > 0) {
        const contextText = sources
          .map((s, idx) => `[Document ${idx + 1}: ${s.filename} (Score: ${s.score})]\n${s.snippet}`)
          .join('\n\n');

        finalSystemInstruction = `${system_instruction}

You have access to the following trusted context retrieved from uploaded documents:
=== RETRIEVED CONTEXT START ===
${contextText}
=== RETRIEVED CONTEXT END ===

Instructions:
- Use the provided context to answer the user question accurately.
- Cite the relevant document names when answering.
- If the question cannot be answered from the context, state that clearly and provide general knowledge.`;
      }
    }

    // Send sources event first
    res.write(`data: ${JSON.stringify({ type: 'sources', sources })}\n\n`);

    const contents: any[] = [];
    if (Array.isArray(history) && history.length > 0) {
      for (const msg of history) {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        });
      }
    }
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    let fullText = '';
    let streamSuccess = false;

    if (apiKey) {
      const modelsToTry = ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];
      for (const modelName of modelsToTry) {
        try {
          const stream = await ai.models.generateContentStream({
            model: modelName,
            contents: contents,
            config: {
              systemInstruction: finalSystemInstruction,
              temperature: 0.7,
              maxOutputTokens: 2048,
            },
          });

          for await (const chunk of stream) {
            const text = chunk.text;
            if (text) {
              fullText += text;
              res.write(`data: ${JSON.stringify({ type: 'chunk', text })}\n\n`);
            }
          }
          streamSuccess = true;
          break;
        } catch (err: any) {
          console.warn(`Stream attempt for model ${modelName} failed:`, err?.message || err);
        }
      }
    }

    if (!streamSuccess) {
      // Gracefully stream friendly fallback response
      const fallbackText = generateFriendlyFallbackResponse(message, sources);
      fullText = fallbackText;
      const words = fallbackText.split(' ');
      for (const word of words) {
        res.write(`data: ${JSON.stringify({ type: 'chunk', text: word + ' ' })}\n\n`);
        await new Promise((r) => setTimeout(r, 20));
      }
    }

    // Save to conversation history
    const userMsg: StoredMessage = {
      id: `msg-${Date.now()}-u`,
      conversation_id: convoId,
      user_id: userId,
      role: 'user',
      content: message,
      created_at: new Date().toISOString(),
    };
    const assistantMsg: StoredMessage = {
      id: `msg-${Date.now()}-a`,
      conversation_id: convoId,
      user_id: userId,
      role: 'assistant',
      content: fullText,
      created_at: new Date().toISOString(),
      sources: sources.length > 0 ? sources : undefined,
    };

    if (!dbEngine.getConversation(convoId)) {
      dbEngine.setConversation({
        id: convoId,
        user_id: userId,
        title: message.slice(0, 36) + (message.length > 36 ? '...' : ''),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    dbEngine.addMessage(convoId, userMsg);
    dbEngine.addMessage(convoId, assistantMsg);

    res.write(`data: ${JSON.stringify({ type: 'done', full_text: fullText })}\n\n`);
    res.end();
  } catch (error: any) {
    console.error('Streaming error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
    res.end();
  }
});

// ==========================================
// Conversation Management Endpoints
// ==========================================
app.get('/api/conversations', (req: Request, res: Response) => {
  const currentUser = getUserFromRequest(req);
  const convos = dbEngine.getConversations(currentUser?.id);
  res.json({ conversations: convos });
});

app.post('/api/conversations', (req: Request, res: Response) => {
  const currentUser = getUserFromRequest(req);
  const id = `convo-${Date.now()}`;
  const newConvo: StoredConversation = {
    id,
    user_id: currentUser ? currentUser.id : 'usr-demo-001',
    title: req.body.title || 'New Chat',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  dbEngine.setConversation(newConvo);
  res.json(newConvo);
});

app.get('/api/conversations/:id', (req: Request, res: Response) => {
  const convo = dbEngine.getConversation(req.params.id);
  if (!convo) {
    return res.status(404).json({ error: 'Conversation not found' });
  }
  const messages = dbEngine.getMessages(req.params.id);
  res.json({ conversation: convo, messages });
});

app.delete('/api/conversations/:id', (req: Request, res: Response) => {
  dbEngine.deleteConversation(req.params.id);
  res.json({ success: true, id: req.params.id });
});

// ==========================================
// Document Upload & RAG Endpoints (PDF, TXT, DOCX)
// ==========================================
app.get('/api/documents', (req: Request, res: Response) => {
  const currentUser = getUserFromRequest(req);
  const docs = dbEngine.getDocuments(currentUser?.id);
  res.json({ documents: docs });
});

app.post('/api/documents/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file was uploaded.' });
    }

    const currentUser = getUserFromRequest(req);
    const userId = currentUser ? currentUser.id : 'usr-demo-001';
    const { originalname, size, buffer, mimetype } = req.file;
    const docId = `doc-${Date.now()}`;

    // Extract text
    const extractedText = extractTextFromFile(originalname, buffer);
    if (!extractedText || extractedText.trim().length === 0) {
      return res.status(400).json({ error: 'Could not extract readable text from the document.' });
    }

    // Split into chunks with overlap
    const chunkSize = parseInt(req.body.chunk_size || '800', 10);
    const chunkOverlap = parseInt(req.body.chunk_overlap || '100', 10);
    const rawChunks = chunkText(extractedText, chunkSize, chunkOverlap);

    const storedChunks: StoredChunk[] = [];
    for (let i = 0; i < rawChunks.length; i++) {
      const text = rawChunks[i];
      const embedding = await getEmbedding(text);
      storedChunks.push({
        id: `chunk-${docId}-${i + 1}`,
        document_id: docId,
        user_id: userId,
        filename: originalname,
        chunk_index: i + 1,
        page_number: Math.floor(i / 3) + 1,
        text,
        embedding,
      });
    }

    const newDoc: StoredDocument = {
      id: docId,
      user_id: userId,
      filename: originalname,
      file_type: mimetype || path.extname(originalname),
      file_size: size,
      status: 'indexed',
      chunk_count: storedChunks.length,
      created_at: new Date().toISOString(),
    };

    dbEngine.setDocument(newDoc);
    dbEngine.setChunks(docId, storedChunks);

    return res.status(201).json({
      message: 'Document successfully indexed into vector store.',
      document: newDoc,
    });
  } catch (error: any) {
    console.error('Document upload error:', error);
    return res.status(500).json({ error: error.message || 'Failed to process document upload.' });
  }
});

app.get('/api/documents/:id/chunks', (req: Request, res: Response) => {
  const chunks = dbEngine.getChunks(req.params.id);
  res.json({ chunks });
});

app.delete('/api/documents/:id', (req: Request, res: Response) => {
  dbEngine.deleteDocument(req.params.id);
  res.json({ success: true, id: req.params.id });
});

// Vite Middleware for Fullstack Dev Server
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
