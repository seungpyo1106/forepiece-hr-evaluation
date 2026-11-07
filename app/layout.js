import './styles.css';

export const metadata = {
  title: '기흥푸르지오포레피스 관리사무소 인사평가 시스템',
  description: '관리사무소 인사평가 시스템',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
