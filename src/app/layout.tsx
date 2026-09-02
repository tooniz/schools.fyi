import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "schools.fyi — curriculum comparison",
  description: "Source-aware curriculum leveling for GTA schools and the Ontario curriculum",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link href="/" className="brand">schools.fyi</Link>
          <nav aria-label="Primary">
            <Link href="/questions">Open questions</Link>
            <Link href="/sources">Sources</Link>
            <Link href="/contribute">Report a correction</Link>
          </nav>
        </header>
        {children}
        <footer>
          <strong>Independent resource.</strong> This site is not affiliated with or endorsed by any listed school or
          program. No school logos are used. Placements are editorial readings of published sources, not accreditation,
          transfer-credit rulings, or placement advice. <Link href="/sources">See every source</Link> or{" "}
          <Link href="/contribute">report a correction</Link>.
        </footer>
      </body>
    </html>
  );
}
