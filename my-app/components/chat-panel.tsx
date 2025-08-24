"use client";

import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, MessagesSquare, ClipboardCopy } from "lucide-react";

import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";

// Prism styles
import {
  dracula,
  vscDarkPlus,
  solarizedlight,
  vs,
  coy
} from "react-syntax-highlighter/dist/esm/styles/prism";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}
  
interface ChatPanelProps {
  hasContent: boolean;
  sourceType?: string;
}

export default function ChatPanel({ hasContent, sourceType }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [copyStatus, setCopyStatus] = useState<Record<string, boolean>>({});
  const [showSourceBadge, setShowSourceBadge] = useState(false);

  const [isDarkMode, setIsDarkMode] = useState(false);
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    setIsDarkMode(document.documentElement.classList.contains("dark"));
    return () => observer.disconnect();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const saved = sessionStorage.getItem("chatMessages");
    if (saved) {
      const parsed: Message[] = JSON.parse(saved);
      setMessages(parsed.map((m) => ({ ...m, timestamp: new Date(m.timestamp) })));
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem("chatMessages", JSON.stringify(messages));
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const justLoaded = sessionStorage.getItem("sourceJustLoaded");

    if (justLoaded === "true") {
      setShowSourceBadge(true);
      const timer = setTimeout(() => {
        setShowSourceBadge(false);
      }, 4500);
      sessionStorage.removeItem("sourceJustLoaded");
      return () => clearTimeout(timer);
    }
  }, [hasContent, sourceType]);

  const sendMessageToApi = async (message: string): Promise<string> => {
    try {
      const response = await axios.post("/api/chat", { query: message });
      const result = response.data;
      if (result.success && result.data && result.data.answer) {
        return result.data.answer;
      } else {
        throw new Error("Invalid response format from API");
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data;
        throw new Error(errorData.error || "API request failed");
      } else {
        throw new Error("An unexpected error occurred");
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !hasContent || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      isUser: true,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    const currentInputValue = inputValue;
    setInputValue("");
    setIsLoading(true);
    try {
      const aiResponse = await sendMessageToApi(currentInputValue);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponse,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Failed to get AI response:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Sorry, I encountered an error. Please try again.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e as unknown as React.FormEvent);
    }
  };

  return (
    <Card className="h-full flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-lg rounded-2xl">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center space-x-2 text-gray-900 dark:text-gray-100">
          <MessagesSquare className="h-5 w-5" />
          <span>AI Assistant</span>
          {showSourceBadge && (
            <span className="text-sm bg-primary/10 text-primary px-2 py-1 rounded-full">
              {sourceType} loaded
            </span>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto space-y-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          {!hasContent ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-3">
                <MessagesSquare className="h-16 w-16 text-muted-foreground mx-auto opacity-50" />
                <p className="text-muted-foreground max-w-sm">
                  Please submit a document, text, or URL on the left to begin.
                </p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-3">
                <MessagesSquare className="h-12 w-12 text-primary mx-auto" />
                <p className="text-foreground">
                  Your content is ready. Ask me anything about it!
                </p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => {
                // --- FIX #1: Split the message content into answer and sources ---
                const sourcesDelimiter = "\n\n**Sources:**";
                let answerPart = message.content;
                let sourcesPart = null;

                if (!message.isUser && message.content.includes(sourcesDelimiter)) {
                  const parts = message.content.split(sourcesDelimiter);
                  answerPart = parts[0];
                  sourcesPart = parts[1];
                }

                return (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.isUser ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl shadow-md overflow-hidden break-words text-sm
                        ${
                          message.isUser
                            ? "bg-primary text-primary-foreground px-4 py-3"
                            : "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100 px-4 py-3"
                        }`}
                    >
                      {/* Render the main answer part */}
                      <ReactMarkdown
                        rehypePlugins={[rehypeRaw]}
                        components={markdownComponents(isDarkMode, copyStatus, setCopyStatus, message.id)}
                      >
                        {answerPart}
                      </ReactMarkdown>

                      {/* --- FIX #2: Render the sources in a separate, styled block --- */}
                      {sourcesPart && (
                        <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-600">
                          <h3 className="text-sm font-semibold mb-2 text-gray-800 dark:text-gray-200">
                            Sources
                          </h3>
                          <div className="text-xs text-muted-foreground">
                            {/* We use ReactMarkdown again to render the bullet points */}
                            <ReactMarkdown
                              rehypePlugins={[rehypeRaw]}
                              components={{
                                a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-primary underline" />,
                                p: ({node, ...props}) => <p className="mb-1" {...props} />
                              }}
                            >
                              {sourcesPart}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 max-w-[75%] px-4 py-3 rounded-2xl">
                    <div className="flex space-x-1 items-center">
                      <div className="w-2 h-2 bg-current rounded-full animate-pulse"></div>
                      <div
                        className="w-2 h-2 bg-current rounded-full animate-pulse"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-current rounded-full animate-pulse"
                        style={{ animationDelay: "0.4s" }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form
          onSubmit={handleSendMessage}
          className="flex space-x-2 pt-4 border-t border-gray-200 dark:border-gray-700 mt-3"
        >
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Ask a question..."
            disabled={!hasContent || isLoading}
            className="flex-1 bg-gray-50 dark:bg-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-600"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!hasContent || !inputValue.trim() || isLoading}
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// --- FIX #3: Extracted Markdown components to a helper function to avoid repetition ---
const markdownComponents = (
  isDarkMode: boolean,
  copyStatus: Record<string, boolean>,
  setCopyStatus: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
  messageId: string
) => ({
  p: ({ node, ...props }: any) => <p className="mb-2 last:mb-0" {...props} />,
  code({ node, inline, className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || "");
    const codeString = String(children).replace(/\n$/, "");

    const handleCopy = () => {
      navigator.clipboard.writeText(codeString);
      setCopyStatus((prev) => ({
        ...prev,
        [messageId]: true,
      }));
      setTimeout(() => {
        setCopyStatus((prev) => ({
          ...prev,
          [messageId]: false,
        }));
      }, 2000);
    };

    return !inline ? (
      // --- FIX: Applied negative margins and background color here ---
      <div className="relative rounded-md my-4  bg-[#282c34] dark:bg-gray-900">
        <div className="flex items-center justify-between h-9 px-4 bg-black/20 rounded-t-md">
          <span className="text-xs text-gray-300 font-sans">
            {match ? match[1] : "code"}
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs text-gray-300 hover:text-white transition-colors"
          >
            <ClipboardCopy size={14} />
            {copyStatus[messageId] ? "Copied!" : "Copy"}
          </button>
        </div>
        <SyntaxHighlighter
          style={isDarkMode ? dracula : vscDarkPlus} // Using vscDarkPlus for light mode as an example
          language={match ? match[1] : undefined}
          PreTag="div"
          customStyle={{
            margin: 0,
            borderRadius: "0 0 0.375rem 0.375rem",
            background: "transparent",
            padding: "1rem",
          }}
          {...props}
        >
          {codeString}
        </SyntaxHighlighter>
      </div>
    ) : (
      <code className="bg-gray-200 dark:bg-gray-800 rounded px-1.5 py-0.5 font-mono text-sm">
        {children}
      </code>
    );
  },
});