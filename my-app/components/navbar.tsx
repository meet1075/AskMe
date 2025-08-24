import { Brain } from "lucide-react"
import { Moon, Sun, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle"

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full   border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-xl">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
               <h1 className="text-2xl font-bold text-foreground tracking-tight">
              AskMe
            </h1>
              <h3 className="text-[11px] font-light">AI Assistant</h3>
            </div>
           
          </div>
          
          <ThemeToggle />
        </div>
      </div>
    </nav>
  )
}