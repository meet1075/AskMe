"use client";

import React, { useState, useEffect } from "react";
import InputPanel from "@/components/input-panel";
import ChatPanel from "@/components/chat-panel";

export default function Home() {
  const [hasContent, setHasContent] = useState(false);
  const [sourceType, setSourceType] = useState<string>("");

  useEffect(() => {
    const savedHasContent = sessionStorage.getItem("hasContent");
    const savedSourceType = sessionStorage.getItem("sourceType");
    if (savedHasContent === "true") setHasContent(true);
    if (savedSourceType) setSourceType(savedSourceType);
  }, []);

  const handleSubmit = async (type: string, content: string) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setHasContent(true);
    setSourceType(type);
    sessionStorage.setItem("hasContent", "true");
    sessionStorage.setItem("sourceType", type);
    sessionStorage.setItem("sourceJustLoaded", "true");
  };

  return (
    <main className="bg-background flex justify-center py-8 px-4">
      <div className="grid lg:grid-cols-2 gap-6 w-full max-w-7xl">
        {/* ✅ Panels now have a reduced height */}
        <div className="order-2 lg:order-1">
          <div className="h-[75vh]"> {/* ↓ Adjust this value as needed */}
            <InputPanel onSubmit={handleSubmit} />
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <div className="h-[75vh]"> {/* ↓ Same height for ChatPanel */}
            <ChatPanel hasContent={hasContent} sourceType={sourceType} />
          </div>
        </div>
      </div>
    </main>
  );
}
