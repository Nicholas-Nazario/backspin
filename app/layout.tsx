import "./style.css";
export const metadata = {
  title: "Backspin",
  description: "Rediscover your record collection",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
