import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
import {neobrutalism} from '@clerk/themes';



export const metadata: Metadata = {
  title: 'CodeAtlas — AI-Powered Codebase Assistant',
  description:
    'Upload your codebase and ask questions with AI-powered insights. CodeAtlas helps you understand, navigate, and document any codebase instantly.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: neobrutalism,
        variables: {
          colorPrimary: '#e11d48', // Crimson Red to match our new styling
        },
      }}
    >
      <html lang="en" data-theme="dark">
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
            rel="stylesheet"
          />
        </head>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
