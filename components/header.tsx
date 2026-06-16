"use client";

import { GithubLogoIcon, ListIcon } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navigation = [
  {
    name: "Docs",
    href: "/docs",
  },
  {
    name: "Components",
    href: "/components",
  },
  {
    name: "Blocks",
    href: "/blocks",
  },
  {
    name: "Themes",
    href: "/themes",
  },
];

export function Header() {
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  const [starCount, setStarCount] = React.useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    // Fetch GitHub star count
    fetch("https://api.github.com/repos/Weekendsuperhero-io/os-glass")
      .then((res) => res.json())
      .then((data) => {
        if (data.stargazers_count) {
          setStarCount(data.stargazers_count);
        }
      })
      .catch(() => {
        // Silently fail if API is unavailable
      });
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full bg-transparent">
      <div className="container mx-auto px-4 pt-4">
        <div
          className="flex h-16 items-center justify-between px-4 md:px-6 rounded-xl border border-[var(--glass-border)] backdrop-blur-[var(--blur)] shadow-[var(--glass-shadow)]"
          style={{
            backgroundColor: "transparent",
            boxShadow: "var(--glass-shadow)",
          }}
        >
          <div className="flex items-center gap-4 md:gap-8">
            <Link href="/" className="flex items-center gap-2">
              {mounted && (
                <Image
                  src={resolvedTheme === "dark" ? "/logo-dark.png" : "/logo-light.png"}
                  alt="Sistine"
                  width={32}
                  height={32}
                  className="h-6 w-6 md:h-8 md:w-8 rounded-md"
                  priority
                />
              )}
              {!mounted && <div className="h-6 w-6 md:h-8 md:w-8 bg-muted animate-pulse rounded" />}
              <span className="text-lg md:text-xl font-bold text-foreground">Sistine</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-foreground/80",
                    pathname?.startsWith(item.href) ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            {starCount !== null && (
              <Link
                href="https://github.com/Weekendsuperhero-io/os-glass"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center"
              >
                <Badge variant="glass" className="flex items-center gap-1.5 h-9 px-3">
                  <GithubLogoIcon className="h-4 w-4" />
                  <span className="text-xs font-semibold">{starCount.toLocaleString()}</span>
                </Badge>
              </Link>
            )}
            <ModeToggle variant="glass" />
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden h-9 w-9" aria-label="Toggle menu">
                  <ListIcon className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent variant="glass" side="right" className="w-[300px] sm:w-[400px]">
                <div className="flex flex-col gap-6 mt-8">
                  <div className="flex items-center gap-2 pb-4 border-b border-border">
                    {mounted && (
                      <Image
                        src={resolvedTheme === "dark" ? "/logo-dark.png" : "/logo-light.png"}
                        alt="Sistine"
                        width={32}
                        height={32}
                        className="h-8 w-8 rounded-md"
                      />
                    )}
                    {!mounted && <div className="h-8 w-8 bg-muted animate-pulse rounded" />}
                  </div>
                  <nav className="flex flex-col gap-4">
                    {navigation.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "text-base font-medium transition-colors hover:text-foreground/80 py-2",
                          pathname?.startsWith(item.href) ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {item.name}
                      </Link>
                    ))}
                  </nav>
                  {starCount !== null && (
                    <div className="pt-4 border-t border-border">
                      <Link
                        href="https://github.com/Weekendsuperhero-io/os-glass"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center"
                      >
                        <Badge variant="glass" className="flex items-center gap-1.5 h-9 px-3">
                          <GithubLogoIcon className="h-4 w-4" />
                          <span className="text-xs font-semibold">{starCount.toLocaleString()}</span>
                        </Badge>
                      </Link>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
