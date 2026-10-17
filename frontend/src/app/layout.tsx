import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/modules/auth/AuthContext';

export const metadata: Metadata = {
  title: 'Recall AI - NotebookLM Inspired AI Knowledge Platform',
  description: 'Understand, synthesize, and interact with your personal knowledge base powered by Gemini and LangChain.',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/logo.png" type="image/png" sizes="any" />
      </head>
      <body className="bg-notebook-bg text-notebook-text antialiased select-none">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
