"use client";

import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Link, Upload, Send, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface InputPanelProps {
  onSubmit: (type: string, content: string) => void;
}

export default function InputPanel({ onSubmit }: InputPanelProps) {
  const [activeTab, setActiveTab] = useState("text");
  const [textInput, setTextInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    data?: any;
    error?: string;
  } | null>(null);

  // --- THIS IS THE FIX ---
  // This effect watches for changes to the 'result' state.
  useEffect(() => {
    // If a result message is displayed...
    if (result) {
      // ...start a timer.
      const timer = setTimeout(() => {
        // After 5 seconds, clear the result, hiding the message.
        setResult(null);
      }, 5000); // 5000 milliseconds = 5 seconds

      // If a new result appears before 5s, or the component unmounts,
      // clear the old timer to prevent it from firing.
      return () => clearTimeout(timer);
    }
  }, [result]); // The effect re-runs whenever 'result' changes.

  const handleTextSubmit = async (text: string) => {
    const response = await axios.post(
      "/api/load-text",
      { text },
      { headers: { "Content-Type": "application/json" }, timeout: 30000 }
    );
    return response.data;
  };

  const handleUrlSubmit = async (url: string) => {
    const response = await axios.post(
      "/api/load-url",
      { url },
      { headers: { "Content-Type": "application/json" }, timeout: 60000 }
    );
    return response.data;
  };

  const handlePdfSubmit = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await axios.post("/api/load-pdf", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120000,
    });
    return response.data;
  };

  const handleSubmit = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    setResult(null);

    try {
      let apiResult;
      let type = activeTab;
      let content = "";

      switch (activeTab) {
        case "text":
          if (!textInput.trim()) throw new Error("Please enter some text");
          apiResult = await handleTextSubmit(textInput);
          content = textInput;
          break;
        case "url":
          if (!urlInput.trim()) throw new Error("Please enter a URL");
          apiResult = await handleUrlSubmit(urlInput);
          content = urlInput;
          break;
        case "pdf":
          if (!pdfFile) throw new Error("Please select a PDF file");
          apiResult = await handlePdfSubmit(pdfFile);
          content = pdfFile.name;
          break;
        default:
          throw new Error("Invalid input type");
      }

      setResult(apiResult);

      if (apiResult.success) {
        onSubmit(type, content);
        setTextInput("");
        setUrlInput("");
        setPdfFile(null);
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: "Processing failed",
        error: error.message,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setPdfFile(file);
    } else if (file) {
      setResult({
        success: false,
        message: "Invalid file type",
        error: "Please select a PDF file",
      });
    }
  };

  const canSubmit = () => {
    if (isProcessing) return false;
    switch (activeTab) {
      case "text":
        return textInput.trim().length > 0;
      case "url":
        return urlInput.trim().length > 0;
      case "pdf":
        return pdfFile !== null;
      default:
        return false;
    }
  };

  return (
    <Card className="h-full flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-lg rounded-2xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Input Source
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col min-h-0 overflow-y-auto space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 w-full bg-gray-100 dark:bg-gray-800 rounded-lg">
            <TabsTrigger
              value="text"
              className="flex items-center space-x-2 text-gray-800 dark:text-gray-200 data-[state=active]:bg-primary data-[state=active]:text-white rounded-md"
            >
              <FileText className="h-4 w-4" />
              <span>Text</span>
            </TabsTrigger>
            <TabsTrigger
              value="url"
              className="flex items-center space-x-2 text-gray-800 dark:text-gray-200 data-[state=active]:bg-primary data-[state=active]:text-white rounded-md"
            >
              <Link className="h-4 w-4" />
              <span>Web URL</span>
            </TabsTrigger>
            <TabsTrigger
              value="pdf"
              className="flex items-center space-x-2 text-gray-800 dark:text-gray-200 data-[state=active]:bg-primary data-[state=active]:text-white rounded-md"
            >
              <Upload className="h-4 w-4" />
              <span>PDF</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="text">
              <Textarea
                placeholder="Paste your text here..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                className="min-h-[200px] resize-none bg-gray-50 dark:bg-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-600"
              />
            </TabsContent>

            <TabsContent value="url">
              <Input
                placeholder="Enter a website URL..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                type="url"
                className="bg-gray-50 dark:bg-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-600"
              />
            </TabsContent>

            <TabsContent value="pdf">
              <div className="border-2 border-dashed border-border dark:border-gray-600 rounded-lg p-6 text-center bg-gray-50 dark:bg-gray-800">
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Click to upload a PDF here</p>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="pdf-upload"
                />
                <label
                  htmlFor="pdf-upload"
                  className="inline-block cursor-pointer bg-primary mt-4 text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
                >
                  Choose File
                </label>
                {pdfFile && (
                  <p className="text-sm text-foreground mt-2">
                    Selected: {pdfFile.name} ({(pdfFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <Button
          onClick={handleSubmit}
          disabled={!canSubmit()}
          className="w-full flex items-center space-x-2 h-12 bg-primary hover:bg-primary/90 dark:bg-primary dark:hover:bg-primary/90"
          size="lg"
        >
          <Send className="h-4 w-4" />
          <span>{isProcessing ? "Processing..." : "Submit"}</span>
        </Button>

        {result && (
          <Alert
            className={`${result.success ? "border-green-500" : "border-red-500"} bg-gray-50 dark:bg-gray-800`}
          >
            <div className="flex items-start space-x-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
              )}
              <div className="flex-1">
                <AlertDescription>
                  <div className="font-medium mb-2">
                    {result.success ? "Success!" : "Error"}
                  </div>
                  <p className="text-sm">{result.message}</p>
                  {result.error && (
                    <p className="text-sm text-red-600 mt-1">{result.error}</p>
                  )}
                </AlertDescription>
              </div>
            </div>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}