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
    <html lang="en">
      <head>
        <link rel="icon" href="/logo.png" type="image/png" sizes="any" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='light'){document.documentElement.classList.add('light');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="bg-notebook-bg text-notebook-text antialiased select-none">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
