import "./style.css";
import type { Viewport } from "next";
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fff6df",
};
export const metadata = {
  title: "Backspin",
  description: "Less time choosing, more time listening.",
  icons: {
    icon: "/brand/citrus-bloom.svg",
  },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
