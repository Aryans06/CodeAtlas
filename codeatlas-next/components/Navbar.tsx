'use client';
import { SignInButton, UserButton, useUser } from '@clerk/nextjs';

interface NavbarProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onUploadClick: () => void;
  onVisualizeClick: () => void;
  indexingMsg: string;
  isIndexed: boolean;
}

export default function Navbar({ theme, onToggleTheme, onUploadClick, onVisualizeClick, indexingMsg, isIndexed }: NavbarProps) {
  const { isLoaded, isSignedIn } = useUser();

  return (
    <nav className="navbar" id="navbar">
      <div className="navbar__left">
        <div className="navbar__logo">
          <svg className="navbar__logo-icon" viewBox="0 0 32 32" fill="none">
            <defs>
              <linearGradient id="logo-grad" x1="0" y1="0" x2="32" y2="32">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#7f1d1d" />
              </linearGradient>
            </defs>
            <rect width="32" height="32" rx="8" fill="url(#logo-grad)" />
            <path d="M10 11L16 8L22 11V21L16 24L10 21V11Z" stroke="white" strokeWidth="1.5" fill="none" />
            <path d="M16 8V24" stroke="white" strokeWidth="1.2" opacity="0.5" />
          </svg>
          <span className="navbar__logo-text">
            Code<span className="navbar__logo-accent">Atlas</span>
          </span>
        </div>
        <span className="navbar__tagline">Navigate code, not confusion.</span>
        {indexingMsg && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '12px' }}>
            {indexingMsg}
          </span>
        )}
      </div>
      <div className="navbar__right">
        {isIndexed && (
          <button className="btn btn--ghost" onClick={onVisualizeClick} style={{ border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fb7185', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="4" cy="4" r="2" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="12" cy="4" r="2" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="8" cy="13" r="2" stroke="currentColor" strokeWidth="1.2" />
              <path d="M4 6V8L8 11M12 6V8L8 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            Visualize
          </button>
        )}
        <button className="btn btn--primary" onClick={onUploadClick} id="uploadBtn">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1V11M8 1L4 5M8 1L12 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M1 11V13C1 14.1 1.9 15 3 15H13C14.1 15 15 14.1 15 13V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {isIndexed ? 'Re-upload' : 'Upload Codebase'}
        </button>

        {isLoaded && !isSignedIn && (
          <SignInButton mode="modal">
            <button className="btn btn--ghost" style={{ border: '1px solid rgba(225, 29, 72, 0.4)', color: '#fb7185' }}>
              Sign In
            </button>
          </SignInButton>
        )}
        
        {isLoaded && isSignedIn && (
          <UserButton appearance={{ elements: { userButtonAvatarBox: { width: 34, height: 34 } } }} />
        )}

        <button className="btn btn--ghost" onClick={onToggleTheme} aria-label="Toggle theme">
          {theme === 'dark' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>
    </nav>
  );
}
