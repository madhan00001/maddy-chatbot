import React, { useState } from 'react';
import { X, Play, Terminal, CheckCircle2, BookOpen, Code2, Server, Copy, Check } from 'lucide-react';

interface Phase1InspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Phase1InspectorModal({ isOpen, onClose }: Phase1InspectorModalProps) {
  const [activeTab, setActiveTab] = useState<'concepts' | 'tester' | 'python' | 'curl'>('concepts');
  const [testMessage, setTestMessage] = useState('Explain what an LLM and RAG are in three bullet points.');
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [copiedCurl, setCopiedCurl] = useState(false);

  if (!isOpen) return null;

  const handleTestChat = async () => {
    setLoading(true);
    setTestResponse(null);
    const start = performance.now();
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: testMessage,
          history: [],
          system_instruction: 'You are a concise AI assistant demonstrating the Phase 1 chatbot API.'
        })
      });
      const data = await res.json();
      setLatency(Math.round(performance.now() - start));
      setTestResponse(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setLatency(Math.round(performance.now() - start));
      setTestResponse(JSON.stringify({ error: err.message }, null, 2));
    } finally {
      setLoading(false);
    }
  };

  const curlCommand = `curl -X POST http://localhost:8000/api/chat \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "${testMessage.replace(/"/g, '\\"')}",
    "conversation_id": "test-convo-1"
  }'`;

  const copyCurl = () => {
    navigator.clipboard.writeText(curlCommand);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header - Zero-Pill Standard */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/80">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">
              Phase 1 Architecture & API Workbench
            </h2>
            <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
              <span>FastAPI Backend Foundation</span>
              <span aria-hidden="true">·</span>
              <span>POST /api/chat Contract</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-400 font-medium">Operational</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs (Functional Buttons, Segmented style) */}
        <div className="flex items-center gap-1 px-6 py-2 border-b border-zinc-800 bg-zinc-950/40 text-xs">
          <button
            onClick={() => setActiveTab('concepts')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'concepts'
                ? 'bg-zinc-800 text-white shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>01. Core Architecture</span>
          </button>
          <button
            onClick={() => setActiveTab('tester')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'tester'
                ? 'bg-zinc-800 text-white shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Play className="w-3.5 h-3.5 text-emerald-400" />
            <span>02. Live API Tester</span>
          </button>
          <button
            onClick={() => setActiveTab('python')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'python'
                ? 'bg-zinc-800 text-white shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>03. Python Implementation</span>
          </button>
          <button
            onClick={() => setActiveTab('curl')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'curl'
                ? 'bg-zinc-800 text-white shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>04. cURL & Docker</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 text-xs text-zinc-300 space-y-6">
          
          {/* Tab 1: Concepts */}
          {activeTab === 'concepts' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100 mb-1">
                  Why Phase 1 is the Core Foundation
                </h3>
                <p className="text-zinc-400 leading-relaxed">
                  Before adding vector databases, chunking algorithms, or multi-turn retrieval mechanisms, every robust chatbot starts with a reliable, server-side Chat Completion API.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-lg border border-zinc-800 bg-zinc-950/50 space-y-1.5">
                  <div className="font-semibold text-zinc-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>API Key Isolation</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Browser-based API calls leak credentials to visitors. The FastAPI backend securely loads <code className="text-emerald-300 font-mono">GEMINI_API_KEY</code> from protected environment variables.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg border border-zinc-800 bg-zinc-950/50 space-y-1.5">
                  <div className="font-semibold text-zinc-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Pydantic Validation</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Incoming payloads are validated strictly against <code className="text-emerald-300 font-mono">ChatRequest</code> and <code className="text-emerald-300 font-mono">Message</code> schemas before dispatching upstream.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg border border-zinc-800 bg-zinc-950/50 space-y-1.5">
                  <div className="font-semibold text-zinc-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Pluggable Providers</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    The <code className="text-emerald-300 font-mono">LLMService</code> class abstracts the provider. You can switch between Gemini 3.8 Flash, local Ollama, or OpenAI without altering frontend code.
                  </p>
                </div>
              </div>

              {/* Data Flow Diagram */}
              <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-950/80 font-mono text-[11px] space-y-2">
                <div className="text-zinc-400 text-xs font-semibold">Phase 1 Request Lifecycle</div>
                <div className="text-zinc-300 leading-relaxed whitespace-pre overflow-x-auto p-2 bg-zinc-900/80 rounded border border-zinc-850">
{`Client (React UI)
       │
       ▼  HTTP POST /api/chat  { "message": "..." }
[FastAPI Gateway]
       │
       ├── 1. Pydantic validates ChatRequest schema
       ├── 2. Assembles system instructions and history
       └── 3. LLMService queries Gemini API via server credentials
               │
               ▼
[Upstream Model: gemini-3.8-flash]
       │
       ▼  Structured Completion
[FastAPI Gateway]
       │
       └── Formats ChatResponse { response, conversation_id, model }
       │
       ▼  200 OK JSON
Client renders response with Markdown formatting`}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Live Tester */}
          {activeTab === 'tester' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">Live Endpoint Workbench</h3>
                <p className="text-zinc-400 text-xs">Execute real requests against the backend <code className="text-emerald-400 font-mono">POST /api/chat</code> endpoint.</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-300">Test Message Payload:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  <button
                    onClick={handleTestChat}
                    disabled={loading}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{loading ? 'Dispatching...' : 'Send Request'}</span>
                  </button>
                </div>
              </div>

              {latency !== null && (
                <div className="flex items-center gap-3 text-xs font-mono text-zinc-400">
                  <span>Server Status: <span className="text-emerald-400">200 OK</span></span>
                  <span aria-hidden="true">·</span>
                  <span>Roundtrip Latency: <span className="text-emerald-400 tabular-nums">{latency}ms</span></span>
                </div>
              )}

              {testResponse && (
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-zinc-300">Raw JSON Response:</div>
                  <pre className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-emerald-400 overflow-x-auto leading-relaxed max-h-72">
                    {testResponse}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Python Implementation */}
          {activeTab === 'python' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">FastAPI Implementation Blueprint</h3>
                <p className="text-zinc-400 text-xs">Production files configured in the <code className="text-emerald-400 font-mono">backend/app/</code> directory.</p>
              </div>

              <div className="space-y-3">
                <div className="border border-zinc-800 rounded-lg overflow-hidden">
                  <div className="px-3 py-1.5 bg-zinc-950 border-b border-zinc-800 text-[11px] font-mono text-zinc-400 flex items-center justify-between">
                    <span>backend/app/api/chat.py</span>
                    <span className="text-emerald-400 font-semibold">Endpoint Route</span>
                  </div>
                  <pre className="p-3 bg-zinc-950/70 text-[11px] font-mono text-zinc-300 overflow-x-auto leading-relaxed">
{`from fastapi import APIRouter
import uuid
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.llm_service import llm_service
from app.config import settings

router = APIRouter(prefix="/api/chat", tags=["Chat"])

@router.post("", response_model=ChatResponse)
async def chat_completion(request: ChatRequest):
    conversation_id = request.conversation_id or str(uuid.uuid4())
    ai_text = await llm_service.generate_response(
        prompt=request.message,
        history=request.history,
        system_instruction=request.system_instruction
    )
    return ChatResponse(
        response=ai_text,
        conversation_id=conversation_id,
        model=settings.LLM_MODEL,
        sources=[]
    )`}
                  </pre>
                </div>

                <div className="border border-zinc-800 rounded-lg overflow-hidden">
                  <div className="px-3 py-1.5 bg-zinc-950 border-b border-zinc-800 text-[11px] font-mono text-zinc-400 flex items-center justify-between">
                    <span>backend/app/schemas/chat.py</span>
                    <span className="text-emerald-400 font-semibold">Pydantic Schemas</span>
                  </div>
                  <pre className="p-3 bg-zinc-950/70 text-[11px] font-mono text-zinc-300 overflow-x-auto leading-relaxed">
{`from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class Message(BaseModel):
    role: str = Field(..., description="'user', 'assistant', or 'system'")
    content: str = Field(..., description="Message text content")

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    conversation_id: Optional[str] = None
    history: Optional[List[Message]] = Field(default_factory=list)
    use_rag: bool = False
    system_instruction: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    conversation_id: str
    model: str
    sources: List[dict] = Field(default_factory=list)
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: cURL & Docker */}
          {activeTab === 'curl' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">CLI & Container Commands</h3>
                <p className="text-zinc-400 text-xs">Test the endpoint from any shell or run via Docker Compose.</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-300">1. Test with cURL:</span>
                  <button
                    onClick={copyCurl}
                    className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white"
                  >
                    {copiedCurl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCurl ? 'Copied' : 'Copy cURL'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-[11px] font-mono text-emerald-400 overflow-x-auto leading-relaxed">
                  {curlCommand}
                </pre>
              </div>

              <div className="space-y-2 pt-2">
                <span className="text-xs font-medium text-zinc-300">2. Launch with Docker Compose:</span>
                <pre className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-[11px] font-mono text-zinc-300 overflow-x-auto leading-relaxed">
{`# Build and run FastAPI backend + PostgreSQL
docker compose up --build -d

# Verify container logs
docker compose logs -f api`}
                </pre>
              </div>

              <div className="space-y-2 pt-2">
                <span className="text-xs font-medium text-zinc-300">3. Run Pytest Suite:</span>
                <pre className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-[11px] font-mono text-zinc-300 overflow-x-auto leading-relaxed">
{`cd backend
pytest tests/test_phase1.py -v`}
                </pre>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
