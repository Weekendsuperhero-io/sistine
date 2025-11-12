import Link from "next/link"
import { Github } from "lucide-react"

export function Footer() {

  return (
    <footer className="w-full pb-4 bg-transparent">
      <div className="container mx-auto px-4">
        <div 
          className="rounded-xl border border-[var(--glass-border)] backdrop-blur-[var(--blur)] shadow-[var(--glass-shadow)] px-6 py-8"
          style={{
            backgroundColor: "transparent",
            boxShadow: "var(--glass-shadow)",
          }}
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Built by</span>
              <Link
                href="https://github.com/akshaypjoshi"
                className="text-foreground hover:text-foreground/80 transition-colors"
                target="_blank"
              >
                Akshay Joshi
              </Link>
              <span>at</span>
              <Link
                href="https://crenspire.com"
                className="text-foreground hover:text-foreground/80 transition-colors"
                target="_blank"
              >
                Crenspire Technologies.
              </Link>
              <span>Inspired by</span>
              <Link
                href="https://ui.shadcn.com/"
                className="text-foreground hover:text-foreground/80 transition-colors"
                target="_blank"
              >
                ShadCN
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="https://github.com/crenspire/glass-ui"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="GitHub"
              >
                <Github className="h-5 w-5" />
              </Link>
              <span className="text-sm text-muted-foreground">
                The source code is available on GitHub.
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

