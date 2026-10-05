import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export interface User {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  salt: string;
  avatar?: string;
  created_at: string;
}

export interface Session {
  token: string;
  user_id: string;
  created_at: string;
  expires_at: string;
}

export interface StoredConversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface StoredSourceCitation {
  document_id: string;
  filename: string;
  chunk_index: number;
  page: number;
  snippet: string;
  score: number;
}

export interface StoredMessage {
  id: string;
  conversation_id: string;
  user_id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  sources?: StoredSourceCitation[];
}

export interface StoredDocument {
  id: string;
  user_id: string;
  filename: string;
  file_type: string;
  file_size: number;
  status: 'indexed' | 'processing' | 'failed';
  chunk_count: number;
  created_at: string;
}

export interface StoredChunk {
  id: string;
  document_id: string;
  user_id: string;
  filename: string;
  chunk_index: number;
  page_number: number;
  text: string;
  embedding?: number[];
}

export interface DatabaseSchema {
  users: Record<string, User>;
  sessions: Record<string, Session>;
  conversations: Record<string, StoredConversation>;
  messages: Record<string, StoredMessage[]>; // keyed by conversation_id
  documents: Record<string, StoredDocument>;
  chunks: Record<string, StoredChunk[]>; // keyed by document_id
}

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'app_database.json');

class DatabaseEngine {
  private data: DatabaseSchema;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.data = {
      users: {},
      sessions: {},
      conversations: {},
      messages: {},
      documents: {},
      chunks: {},
    };
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(fileContent);
        this.data = {
          users: parsed.users || {},
          sessions: parsed.sessions || {},
          conversations: parsed.conversations || {},
          messages: parsed.messages || {},
          documents: parsed.documents || {},
          chunks: parsed.chunks || {},
        };
      } else {
        this.seedDemoData();
        this.persistSync();
      }
    } catch (err) {
      console.error('Error initializing database engine:', err);
      this.seedDemoData();
    }
  }

  public persistSync() {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      const tmpPath = `${DB_FILE}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tmpPath, DB_FILE);
    } catch (err) {
      console.error('Failed to persist database to disk:', err);
    }
  }

  public schedulePersist() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.persistSync();
      this.saveTimeout = null;
    }, 200);
  }

  // --- Password & Auth Helpers ---
  public hashPassword(password: string, salt: string): string {
    return crypto.scryptSync(password, salt, 64).toString('hex');
  }

  public generateSalt(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  public generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // --- Seed Initial Data ---
  private seedDemoData() {
    const demoSalt = this.generateSalt();
    const demoPasswordHash = this.hashPassword('password123', demoSalt);
    const demoUserId = 'usr-demo-001';

    const demoUser: User = {
      id: demoUserId,
      email: 'demo@acme.ai',
      name: 'Alex Rivera',
      password_hash: demoPasswordHash,
      salt: demoSalt,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
      created_at: new Date().toISOString(),
    };

    this.data.users[demoUserId] = demoUser;

    // Seed sample conversation
    const convoId = 'convo-welcome-1';
    this.data.conversations[convoId] = {
      id: convoId,
      user_id: demoUserId,
      title: 'Welcome & System Overview',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.data.messages[convoId] = [
      {
        id: 'msg-seed-1',
        conversation_id: convoId,
        user_id: demoUserId,
        role: 'assistant',
        content: `# Welcome to your AI Assistant & Knowledge Base

I am your AI assistant powered by **Gemini 3.8 Flash** with automatic **RAG (Retrieval-Augmented Generation)** database retrieval.

### What is active right now:
- **Persistent Database**: Your conversations, user profile, and knowledge documents are stored in the database.
- **Automatic RAG**: When you ask questions about company documents, I automatically retrieve the most relevant verified excerpts and ground my answers with source citations.
- **FastAPI / Phase 1 Backend**: All request and response structures conform to the Phase 1 backend specification.

Upload files via the **Knowledge Base** button or ask a question directly!`,
        created_at: new Date().toISOString(),
      },
    ];

    // Seed sample document
    const docId = 'doc-sample-policy';
    this.data.documents[docId] = {
      id: docId,
      user_id: demoUserId,
      filename: 'acme_company_policy_2026.txt',
      file_type: 'text/plain',
      file_size: 1331,
      status: 'indexed',
      chunk_count: 4,
      created_at: new Date().toISOString(),
    };

    this.data.chunks[docId] = [
      {
        id: 'chk-1',
        document_id: docId,
        user_id: demoUserId,
        filename: 'acme_company_policy_2026.txt',
        chunk_index: 0,
        page_number: 1,
        text: 'Acme Corporation - Official Employee Handbook 2026\n1. Working Hours & Remote Work: Acme operates on a flexible hybrid model. Core collaboration hours are 10:00 AM - 3:00 PM in the employee\'s local timezone. Employees are eligible for remote work up to 4 days per week with manager approval. An annual home office ergonomics equipment stipend of $1,200 USD is available for each full-time employee.'
      },
      {
        id: 'chk-2',
        document_id: docId,
        user_id: demoUserId,
        filename: 'acme_company_policy_2026.txt',
        chunk_index: 1,
        page_number: 1,
        text: '2. Paid Time Off (PTO) & Leave: Full-time employees receive 25 days of Paid Time Off (PTO) per calendar year, accruing at 2.08 days per month. In addition, Acme provides 12 paid company holidays. Parental leave is provided up to 16 weeks of 100% paid leave for all new parents (birth, adoption, or foster placement) regardless of gender.'
      },
      {
        id: 'chk-3',
        document_id: docId,
        user_id: demoUserId,
        filename: 'acme_company_policy_2026.txt',
        chunk_index: 2,
        page_number: 1,
        text: '3. Professional Development & Education: Each employee is allocated a $2,500 annual budget for attending engineering conferences, purchasing books, courses, or certifications. AI tool subscriptions (e.g., ChatGPT Plus, GitHub Copilot) are reimbursed 100% by the Engineering productivity stipend.'
      },
      {
        id: 'chk-4',
        document_id: docId,
        user_id: demoUserId,
        filename: 'acme_company_policy_2026.txt',
        chunk_index: 3,
        page_number: 1,
        text: '4. Health, Wellness & Security: Acme covers 100% of employee medical, dental, and vision insurance premiums, and 75% for dependents. All company hardware must utilize hardware-backed FIDO2 multi-factor authentication and full disk encryption (FileVault / BitLocker).'
      }
    ];
  }

  // --- User Operations ---
  public createUser(email: string, password: string, name: string): User {
    const existing = this.getUserByEmail(email);
    if (existing) {
      throw new Error('A user with this email already exists.');
    }

    const salt = this.generateSalt();
    const password_hash = this.hashPassword(password, salt);
    const id = `usr-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    const user: User = {
      id,
      email: email.toLowerCase().trim(),
      name: name.trim(),
      password_hash,
      salt,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
      created_at: new Date().toISOString(),
    };

    this.data.users[id] = user;

    // Create default welcome conversation for new user
    const convoId = `convo-${Date.now()}`;
    this.data.conversations[convoId] = {
      id: convoId,
      user_id: id,
      title: 'New Conversation',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.data.messages[convoId] = [];

    this.schedulePersist();
    return user;
  }

  public getUserByEmail(email: string): User | null {
    const cleanEmail = email.toLowerCase().trim();
    for (const id in this.data.users) {
      if (this.data.users[id].email === cleanEmail) {
        return this.data.users[id];
      }
    }
    return null;
  }

  public getUserById(id: string): User | null {
    return this.data.users[id] || null;
  }

  public verifyPassword(user: User, password: string): boolean {
    const hash = this.hashPassword(password, user.salt);
    return hash === user.password_hash;
  }

  // --- Session Operations ---
  public createSession(userId: string): Session {
    const token = this.generateToken();
    const session: Session = {
      token,
      user_id: userId,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    };
    this.data.sessions[token] = session;
    this.schedulePersist();
    return session;
  }

  public getSession(token: string): Session | null {
    const session = this.data.sessions[token];
    if (!session) return null;
    if (new Date(session.expires_at).getTime() < Date.now()) {
      delete this.data.sessions[token];
      this.schedulePersist();
      return null;
    }
    return session;
  }

  public deleteSession(token: string) {
    if (this.data.sessions[token]) {
      delete this.data.sessions[token];
      this.schedulePersist();
    }
  }

  // --- Conversations Operations ---
  public getConversations(userId?: string): StoredConversation[] {
    const all = Object.values(this.data.conversations);
    if (!userId) return all.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    return all
      .filter((c) => c.user_id === userId || !c.user_id)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }

  public getConversation(id: string): StoredConversation | null {
    return this.data.conversations[id] || null;
  }

  public setConversation(conversation: StoredConversation) {
    this.data.conversations[conversation.id] = conversation;
    this.schedulePersist();
  }

  public deleteConversation(id: string) {
    delete this.data.conversations[id];
    delete this.data.messages[id];
    this.schedulePersist();
  }

  // --- Messages Operations ---
  public getMessages(conversationId: string): StoredMessage[] {
    return this.data.messages[conversationId] || [];
  }

  public addMessage(conversationId: string, message: StoredMessage) {
    if (!this.data.messages[conversationId]) {
      this.data.messages[conversationId] = [];
    }
    this.data.messages[conversationId].push(message);
    this.schedulePersist();
  }

  public setMessages(conversationId: string, messages: StoredMessage[]) {
    this.data.messages[conversationId] = messages;
    this.schedulePersist();
  }

  // --- Documents & Chunks Operations ---
  public getDocuments(userId?: string): StoredDocument[] {
    const all = Object.values(this.data.documents);
    if (!userId) return all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return all
      .filter((d) => d.user_id === userId || !d.user_id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public getDocument(id: string): StoredDocument | null {
    return this.data.documents[id] || null;
  }

  public setDocument(doc: StoredDocument) {
    this.data.documents[doc.id] = doc;
    this.schedulePersist();
  }

  public deleteDocument(id: string) {
    delete this.data.documents[id];
    delete this.data.chunks[id];
    this.schedulePersist();
  }

  public getChunks(documentId: string): StoredChunk[] {
    return this.data.chunks[documentId] || [];
  }

  public setChunks(documentId: string, chunks: StoredChunk[]) {
    this.data.chunks[documentId] = chunks;
    this.schedulePersist();
  }

  public getAllChunks(userId?: string): StoredChunk[] {
    const result: StoredChunk[] = [];
    for (const docId in this.data.chunks) {
      const doc = this.data.documents[docId];
      if (!userId || !doc || doc.user_id === userId || !doc.user_id) {
        result.push(...this.data.chunks[docId]);
      }
    }
    return result;
  }
}

export const dbEngine = new DatabaseEngine();
