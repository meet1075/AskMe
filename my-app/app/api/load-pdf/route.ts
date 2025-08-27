import "dotenv/config";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { Document } from "langchain/document";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    // --- Kept your robust validation ---
    if (!file) {
      return NextResponse.json({
        success: false,
        error: "No file uploaded. Please select a PDF file.",
      }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({
        success: false,
        error: "Only PDF files are supported. Please upload a PDF file.",
      }, { status: 400 });
    }

    const pdfLoader = new PDFLoader(file, {
      splitPages: true,
    });
    const rawDocs = await pdfLoader.load();

    if (rawDocs.length === 0) {
      throw new Error("PDF appears to be empty or corrupted");
    }

    // --- FIX: Preserve original metadata (filename, page number) and add new fields ---
const docsWithMetadata = rawDocs.map(doc => new Document({
  ...doc, // Keep original pageContent and other properties
  metadata: {
    ...doc.metadata, // Keep original metadata from PDFLoader (source, loc, etc.)
    document_type: "PDF", // Add your custom metadata
    processed_at: new Date().toISOString(),
  },
}));

// And ensure you use this new variable when splitting

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

const docs = await splitter.splitDocuments(docsWithMetadata);


    const embeddings = new GoogleGenerativeAIEmbeddings({
      model: "embedding-001",
      taskType: TaskType.RETRIEVAL_DOCUMENT,
      apiKey: process.env.GEMINI_API_KEY,
    });

    await QdrantVectorStore.fromDocuments(docs, embeddings, {
      url: process.env.QDRANT_END_URL || "https://9fb91843-4ee4-49da-8452-835b74d7974f.us-east-1-1.aws.cloud.qdrant.io",
      collectionName: process.env.COLLECTION_NAME || "chaicode-assistant",
      apiKey:process.env.QDRANT_API_KEY
    });

    return NextResponse.json({
      success: true,
      message: "✅ File uploaded and indexed successfully!",
      documentsProcessed: docs.length,
      filename: file.name,
      fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
    });

  } catch (error: any) {
    console.error("Error processing uploaded PDF:", error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "✅ load-pdf endpoint is live"
  });
}
