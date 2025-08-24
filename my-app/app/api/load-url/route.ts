import "dotenv/config"
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai"
import { RecursiveUrlLoader } from "@langchain/community/document_loaders/web/recursive_url";
import { TaskType } from "@google/generative-ai"
import { QdrantVectorStore } from "@langchain/qdrant"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import { NextRequest, NextResponse } from "next/server"
import { error } from "console";

export async function POST(request: NextRequest) {
    try {
         const body = await request.json()
        const { url } = body;

        if (!url || typeof url !== 'string' || url.length === 0) {
            return NextResponse.json({
                success: false,
                error: "Valid URL is required"
            }, { status: 400 })
        }

        try {
            new URL(url);
        } catch {
            return NextResponse.json({
                success: false,
                error: "Invalid URL format"
            }, { status: 400 })
        }

        console.log(`🔍 Starting to crawl: ${url}`);

        const loader = new RecursiveUrlLoader(url, {
            extractor: (document) => {
                return document
                    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")  
                    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")   
                    .replace(/<nav[\s\S]*?>[\s\S]*?<\/nav>/gi, "")       
                    .replace(/<header[\s\S]*?>[\s\S]*?<\/header>/gi, "") 
                    .replace(/<footer[\s\S]*?>[\s\S]*?<\/footer>/gi, "") 
                    .replace(/<[^>]+>/g, "")                             
                    .replace(/\s+/g, " ")                                
                    .trim();
            },
            maxDepth: 4,
            excludeDirs: ["admin", "login", "register", "cart", "checkout"], 
        });

        const rawDocs = await loader.load();
        console.log(`✅ Collected ${rawDocs.length} raw documents`);

        if (rawDocs.length === 0) {
            return NextResponse.json({
                success: false,
                error: "No content could be extracted from the provided URL"
            }, { status: 400 })
        }

        const filteredDocs = rawDocs.filter(doc => 
            doc.pageContent && doc.pageContent.trim().length > 100
        );

        console.log(`📋 Filtered to ${filteredDocs.length} meaningful documents`);

        if (filteredDocs.length === 0) {
            return NextResponse.json({
                success: false,
                error: "No meaningful content found on the provided URL"
            }, { status: 400 })
        }

        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 100,
        });
        const docs = await splitter.splitDocuments(filteredDocs);
        console.log(`📦 Total docs to index: ${docs.length}`);

        const embeddings = new GoogleGenerativeAIEmbeddings({
            model: "embedding-001",
            taskType: TaskType.RETRIEVAL_DOCUMENT,
            apiKey: process.env.GEMINI_API_KEY,
        });

        await QdrantVectorStore.fromDocuments(docs, embeddings, {
            url: process.env.QDRANT_URL || "http://localhost:6333",
            collectionName: process.env.COLLECTION_NAME || "chaicode_v1",
        });

        console.log("✅ Web content indexing completed successfully");

        return NextResponse.json({
            success: true,
            message: "Web content processed and indexed successfully",
            data: {
                originalUrl: url,
                pagesProcessed: filteredDocs.length,
                chunksCreated: docs.length,
                indexedAt: new Date().toISOString()
            }
        }, { status: 200 });
    } catch (error:any) {
    console.error("Error processing web",error);
    return NextResponse.json({
        success:false,
        error:error.message
    },{status:500})
    }
}