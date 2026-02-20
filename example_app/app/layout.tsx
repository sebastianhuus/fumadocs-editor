import { RootProvider } from 'fumadocs-ui/provider/next';
import { EditorProviderWrapper } from '@/components/editor/EditorProviderWrapper';
import './global.css';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
});

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider>
          <EditorProviderWrapper>{children}</EditorProviderWrapper>
        </RootProvider>
      </body>
    </html>
  );
}
