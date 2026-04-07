'use client';
import React, { useEffect, useRef, useState } from 'react';
import type { Message } from '@/app/page';

const SUGGESTIONS = [
  { icon: '⚡', text: 'Where is authentication handled?' },
  { icon: '🗂', text: 'Explain the project structure' },
  { icon: '🔍', text: 'Find all API endpoints' },
  { icon: '📄', text: 'How does the main module work?' },
];

function formatAI(text: string) {
  return text
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<div class="code-block-wrapper"><div class="code-block-header"><span class="code-block-lang">$1</span><button class="code-copy-btn" onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.textContent);this.textContent=\'✅ Copied\';setTimeout(()=>this.textContent=\'📋 Copy\',1500)">📋 Copy</button></div><pre><code>$2</code></pre></div>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>');
}

interface ChatPanelProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (text: string) => void;
  hasCodebase: boolean;
}

export default function ChatPanel({ messages, isLoading, onSendMessage, hasCodebase }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    onSendMessage(text);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  };

  const showWelcome = messages.length === 0;

  return (
    <section className="chat" id="chatPanel">
      <div className="chat__view" id="chatView">
        <div className="chat__messages" id="chatMessages">
          {showWelcome && (
            <div className="chat__welcome" id="chatWelcome">
              <div className="chat__welcome-glow" style={{ background: 'radial-gradient(circle, rgba(239, 68, 68, 0.15) 0%, transparent 60%)' }} />
              
              {/* Animated Hero Visual */}
              <div className="hero-visual">
                {/* Orbiting rings */}
                <div className="hero-visual__ring hero-visual__ring--1" />
                <div className="hero-visual__ring hero-visual__ring--2" />
                <div className="hero-visual__ring hero-visual__ring--3" />
                
                {/* Floating particles */}
                <div className="hero-visual__particles">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="hero-visual__particle" style={{
                      '--i': i,
                      '--angle': `${i * 30}deg`,
                      '--delay': `${i * 0.3}s`,
                      '--distance': `${60 + (i % 3) * 25}px`,
                    } as React.CSSProperties} />
                  ))}
                </div>
                
                {/* Glow pulse */}
                <div className="hero-visual__glow" />
                
                {/* Main terminal block */}
                <div className="hero-visual__inner">
                  <div className="hero-visual__scanner" />
                  <div className="hero-visual__dots">
                    <span style={{ background: '#ff5f57' }} />
                    <span style={{ background: '#ffbd2e' }} />
                    <span style={{ background: '#28c840' }} />
                  </div>
                  <div className="hero-visual__code">
                    <div className="hero-visual__line" style={{ width: '65%', animationDelay: '0s' }}>
                      <span className="hero-visual__keyword">import</span> {'{ analyze }'}
                    </div>
                    <div className="hero-visual__line" style={{ width: '85%', animationDelay: '0.15s' }}>
                      <span className="hero-visual__keyword">const</span> chunks = <span className="hero-visual__fn">embed</span>(code)
                    </div>
                    <div className="hero-visual__line" style={{ width: '55%', animationDelay: '0.3s' }}>
                      <span className="hero-visual__keyword">await</span> <span className="hero-visual__fn">search</span>(query)
                    </div>
                    <div className="hero-visual__line" style={{ width: '75%', animationDelay: '0.45s' }}>
                      <span className="hero-visual__keyword">return</span> {'{ answer, sources }'}
                    </div>
                    <div className="hero-visual__line hero-visual__line--cursor" style={{ width: '20%', animationDelay: '0.6s' }}>
                      █
                    </div>
                  </div>
                </div>
              </div>
              <p className="chat__welcome-tag">AI-Powered Codebase Intelligence</p>
              <h1 className="chat__welcome-title">
                Understand any codebase.<br />
                <span style={{ background: 'linear-gradient(135deg, #ef4444, #7f1d1d)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Instantly.</span>
              </h1>
              <p className="chat__welcome-subtitle">
                Drop your code. Ask questions. Get context-aware answers grounded in your actual source files.
              </p>
              <div className="chat__suggestions" id="chatSuggestions">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.text}
                    className="chat__suggestion"
                    onClick={() => onSendMessage(s.text)}
                  >
                    {s.icon} {s.text}
                  </button>
                ))}
              </div>

              {/* Landing sections visible before any chat */}
              <LandingSections />
            </div>
          )}

          {messages.map((msg, i) => {
            const isStreamingMsg = isLoading && msg.role === 'ai' && i === messages.length - 1;
            return (
              <div key={i} className={`message message--${msg.role}`}>
                <div className="message__avatar">
                  {msg.role === 'user' ? (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.3" />
                      <path d="M2 14c0-3 2.5-5 6-5s6 2 6 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M5 7L8 4L11 7V13L8 16L5 13V7Z" stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.9" />
                      <circle cx="8" cy="9" r="1.5" fill="currentColor" opacity="0.7" />
                    </svg>
                  )}
                </div>
                <div className="message__content">
                  <div className="message__header">
                    <span className="message__name">{msg.role === 'user' ? 'You' : 'CodeAtlas AI'}</span>
                    <span className="message__time">{msg.time}</span>
                  </div>
                  <div className="message__body">
                    {msg.role === 'user' ? (
                      <p>{msg.content}</p>
                    ) : (
                      <>
                        {msg.content ? (
                          <div dangerouslySetInnerHTML={{ __html: formatAI(msg.content) }} />
                        ) : isStreamingMsg ? (
                          <div className="typing-indicator"><span /><span /><span /></div>
                        ) : null}
                        {isStreamingMsg && msg.content && <span className="streaming-cursor" />}
                      </>
                    )}
                  </div>
                  {/* Message Actions */}
                  {msg.role === 'ai' && msg.content && !isStreamingMsg && (
                    <div className="message__actions">
                      <button
                        className="message__action-btn"
                        onClick={() => {
                          navigator.clipboard.writeText(msg.content);
                          const btn = document.activeElement as HTMLButtonElement;
                          if (btn) { btn.textContent = '✅ Copied!'; setTimeout(() => btn.textContent = '📋 Copy', 1500); }
                        }}
                      >
                        📋 Copy
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat__input-wrapper" id="chatInputWrapper">
          <div className="chat__input-container">
            <textarea
              ref={textareaRef}
              className="chat__input"
              id="chatInput"
              placeholder={hasCodebase ? 'Ask anything about your codebase...' : 'Upload a codebase to start asking questions...'}
              rows={1}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
            />
            <button
              className="chat__send-btn"
              id="sendBtn"
              aria-label="Send message"
              disabled={!input.trim() || isLoading}
              onClick={handleSend}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M14 2L7 9M14 2L10 14L7 9M14 2L2 6L7 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <p className="chat__disclaimer">CodeAtlas may produce inaccurate responses. Always verify critical information.</p>
        </div>
      </div>
    </section>
  );
}

function LandingSections() {
  return (
    <div className="landing-sections" id="landingSections" style={{ marginTop: '3rem' }}>
      {/* How It Works */}
      <section className="section how-section">
        <span className="section__badge">Architecture</span>
        <h2 className="section__title">How <span className="gradient-text">CodeAtlas</span> Works</h2>
        <div className="how__flow" style={{ marginTop: '1.5rem' }}>
          <div className="how__flow-diagram">
            {[['📁','Upload'],['🧩','Parse'],['🔢','Embed'],['🔍','Search'],['🤖','Answer']].map(([icon, label], i, arr) => (
              <React.Fragment key={label}>
                <div className={`how__flow-node ${i === arr.length-1 ? 'how__flow-node--accent' : ''}`}>
                  <span className="how__flow-icon">{icon}</span>
                  <span>{label}</span>
                </div>
                {i < arr.length - 1 && <div className="how__flow-arrow">→</div>}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section features">
        <span className="section__badge">Features</span>
        <h2 className="section__title">Everything you need to<br /><span className="gradient-text">understand code faster</span></h2>
        <div className="features__grid">
          {[
            ['🔍', 'Semantic Search', 'Find code by meaning, not keywords.'],
            ['🧠', 'Context-Aware Answers', 'Responses grounded in your actual code.'],
            ['⚡', 'Instant Onboarding', 'Understand architecture in minutes.'],
            ['🔗', 'Cross-File Tracing', 'Trace logic across files and modules.'],
            ['🛡️', 'Security Analysis', 'Identify vulnerabilities and insecure patterns.'],
            ['📊', 'Architecture Insights', 'High-level structure and dependency overviews.'],
          ].map(([icon, title, desc]) => (
            <div key={title} className="feature-card">
              <div className="feature-card__icon">{icon}</div>
              <h4>{title}</h4>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Use Cases */}
      <section className="section usecases">
        <span className="section__badge">Use Cases</span>
        <h2 className="section__title">Built for real-world workflows</h2>
        <div className="usecases__grid">
          {[
            ['🐛', 'Debugging', 'Trace bugs across files by asking natural questions.'],
            ['🚀', 'Developer Onboarding', 'Understand codebases in hours instead of weeks.'],
            ['📜', 'Legacy Code', 'Navigate undocumented systems confidently.'],
            ['✅', 'Code Reviews', 'Understand PR context and impact faster.'],
          ].map(([icon, title, desc]) => (
            <div key={title} className="usecase-card">
              <div className="usecase-card__icon">{icon}</div>
              <h4>{title}</h4>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tech Stack — Powered By */}
      <section className="section tech-section">
        <span className="section__badge">Powered By</span>
        <h2 className="section__title">Built on the <span className="gradient-text">best stack</span></h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '480px', margin: '0 auto 2rem', lineHeight: 1.7 }}>
          CodeAtlas combines cutting-edge AI models with production-grade infrastructure.
        </p>
        <div className="tech__grid">
          {[
            ['⚡', 'Groq + Llama 3.3', 'Lightning-fast 70B inference for real-time code understanding'],
            ['🧬', 'HuggingFace', 'MiniLM-L6-v2 embeddings: 384-dimensional semantic search'],
            ['🗄️', 'Supabase pgvector', 'Postgres-native vector similarity search at scale'],
            ['🔐', 'Clerk Auth', 'Enterprise-grade user authentication and multi-tenancy'],
            ['▲', 'Next.js 15', 'Full-stack React framework with server components and edge runtime'],
            ['🐙', 'GitHub API', 'One-click public repo import via Git Trees API'],
          ].map(([icon, title, desc]) => (
            <div key={title as string} className="tech-card">
              <span className="tech-card__icon">{icon}</span>
              <div>
                <h4>{title}</h4>
                <p>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Stats — Social Proof */}
      <section className="section stats-section">
        <div className="stats__grid">
          {[
            ['384', 'Vector Dimensions', 'Per code embedding'],
            ['70B', 'AI Parameters', 'Llama 3.3 Versatile'],
            ['<2s', 'Response Time', 'Groq inference speed'],
            ['∞', 'Files Supported', 'Any language, any size'],
          ].map(([num, label, sub]) => (
            <div key={label as string} className="stat-card">
              <span className="stat-card__number">{num}</span>
              <span className="stat-card__label">{label}</span>
              <span className="stat-card__sub">{sub}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="section cta-section">
        <div className="cta__inner">
          <div className="cta__glow" />
          <h2 className="cta__title">Ready to understand any codebase?</h2>
          <p className="cta__sub">Upload your first project and ask a question. It takes less than 30 seconds.</p>
          <div className="cta__actions">
            <span className="cta__pill">✨ Free to use</span>
            <span className="cta__pill">🔒 100% private</span>
            <span className="cta__pill">⚡ Instant results</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="site-footer">
        <div className="footer__top">
          <div className="footer__brand">
            <span style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.03em' }}>
              Code<span style={{ color: '#ef4444' }}>Atlas</span>
            </span>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
              AI-powered codebase intelligence.
            </p>
          </div>
          <div className="footer__links">
            <div className="footer__col">
              <h4>Product</h4>
              <span>Semantic Search</span>
              <span>GitHub Import</span>
              <span>File Explainer</span>
              <span>Architecture View</span>
            </div>
            <div className="footer__col">
              <h4>Stack</h4>
              <span>Next.js</span>
              <span>Supabase</span>
              <span>Groq AI</span>
              <span>Clerk Auth</span>
            </div>
            <div className="footer__col">
              <h4>Resources</h4>
              <a href="https://github.com/Aryans06/CodeAtlas" target="_blank" rel="noreferrer" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>GitHub Repo</a>
              <span>Documentation</span>
              <span>API Reference</span>
            </div>
          </div>
        </div>
        <div className="footer__bottom">
          <span>© 2026 CodeAtlas. All rights reserved.</span>
          <span>Built with ❤️ for developers</span>
        </div>
      </footer>
    </div>
  );
}
