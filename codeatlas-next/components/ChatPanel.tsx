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
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
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
              <div className="chat__welcome-glow" />
              <div className="chat__welcome-icon">
                <div className="icon-glow" />
                <svg viewBox="0 0 64 64" fill="none" width="72" height="72">
                  <defs>
                    <linearGradient id="welcome-grad" x1="0" y1="0" x2="64" y2="64">
                      <stop offset="0%" stopColor="#6C5CE7" />
                      <stop offset="100%" stopColor="#00CEFF" />
                    </linearGradient>
                  </defs>
                  <rect width="64" height="64" rx="16" fill="url(#welcome-grad)" opacity="0.15" />
                  <path d="M20 22L32 16L44 22V42L32 48L20 42V22Z" stroke="url(#welcome-grad)" strokeWidth="2" fill="none" />
                  <path d="M32 16V48" stroke="url(#welcome-grad)" strokeWidth="1.5" opacity="0.4" />
                </svg>
              </div>
              <p className="chat__welcome-tag">AI-Powered Codebase Intelligence</p>
              <h1 className="chat__welcome-title">
                Understand any codebase.<br />
                <span className="gradient-text shimmer-text">Instantly.</span>
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

          {messages.map((msg, i) => (
            <div key={i} className={`message message--${msg.role}`}>
              <div className="message__avatar">{msg.role === 'user' ? 'U' : 'AI'}</div>
              <div className="message__content">
                <div className="message__header">
                  <span className="message__name">{msg.role === 'user' ? 'You' : 'CodeAtlas AI'}</span>
                  <span className="message__time">{msg.time}</span>
                </div>
                <div className="message__body">
                  {msg.role === 'user' ? (
                    <p>{msg.content}</p>
                  ) : (
                    <div dangerouslySetInnerHTML={{ __html: formatAI(msg.content) }} />
                  )}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="message message--ai">
              <div className="message__avatar">AI</div>
              <div className="message__content">
                <div className="message__header">
                  <span className="message__name">CodeAtlas AI</span>
                </div>
                <div className="typing-indicator">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}
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

      {/* Footer */}
      <footer className="site-footer">
        <div className="footer__bottom">
          <span>© 2025 CodeAtlas. All rights reserved.</span>
          <span>Built with ❤️ for developers</span>
        </div>
      </footer>
    </div>
  );
}
