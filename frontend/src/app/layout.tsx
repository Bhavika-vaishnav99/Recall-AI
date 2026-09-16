import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Recall AI - NotebookLM Inspired AI Knowledge Platform',
  description: 'Understand, synthesize, and interact with your personal knowledge base powered by Gemini and LangChain.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-notebook-bg text-notebook-text antialiased select-none">
        {children}
      </body>
    </html>
  );
}
