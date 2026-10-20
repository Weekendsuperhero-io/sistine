import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { AutoForeground } from "@/components/auto-foreground";
import { BackgroundProvider } from "@/components/background-provider";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Toaster } from "@/components/ui/sonner";
import "./site.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: [
    "latin",
  ],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: [
    "latin",
  ],
});

export const metadata: Metadata = {
  title: "Sistine - Component Library",
  description:
    "A glassmorphic component library built on filtered light: layered translucency, cut and polished edges, and a spectrum of stone tints, every colour measured in OKLCH.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    /* The font variables go on <html>, not <body>: site.css maps --font-sans to --font-geist-sans in the
       theme layer, which resolves on :root, so a variable defined lower down leaves it unresolved and
       the page on the UA's system stack. */
    <html
      lang="en"
      suppressHydrationWarning
      data-glass-tint="amethyst"
      data-glass="crystal"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
          <BackgroundProvider>
            <AutoForeground />
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
            <Toaster />
          </BackgroundProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
