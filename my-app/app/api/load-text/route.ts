import "dotenv/config"
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai"
import { TaskType } from "@google/generative-ai"
import { QdrantVectorStore } from "@langchain/qdrant"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai";
import { Document } from "langchain/document";

const client = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});

const systemPrompt = `You are an AI assistant that converts the user's text into proper format.
Correct typos, arrange words properly if they are not, and make the prompt meaningful.`;
export async function POST(request:NextRequest){
    try {
        const body = await request.json()
        const { text } = body

        if(!text||typeof text !== "string"|| text.length==0){
            return NextResponse.json({
                success: false,
                error: "Text is required and must be a string"
            }, { status: 400 });
        }
     //rewrite query
        const response= await client.chat.completions.create({
            model:"gemini-2.0-flash",
            messages:[
                {role:"system",content:systemPrompt},
                {role:"user",content:text}
            ]
        });
        const finalPrompt = response.choices[0].message.content;
        // create document
        const doc=new Document({
            pageContent: finalPrompt ?? "",
            metadata:{ 
                source: "api_request",
                timestamp: new Date().toISOString(),
                originalLength: text.length,
                processedLength: finalPrompt?.length || 0
            },
        })
        //split
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 300,
            chunkOverlap: 50,
        });
        const docs = await splitter.splitDocuments([doc]);
        //embeddings
        const embeddings=new GoogleGenerativeAIEmbeddings({
            model:"embedding-001",
            taskType:TaskType.RETRIEVAL_DOCUMENT,
            apiKey:process.env.GEMINI_API_KEY
        })
        //store
        await QdrantVectorStore.fromDocuments(docs, embeddings, {
            url: process.env.QDRANT_END_URL || "https://9fb91843-4ee4-49da-8452-835b74d7974f.us-east-1-1.aws.cloud.qdrant.io",
            collectionName: process.env.COLLECTION_NAME || "chaicode-assistant",
            apiKey:process.env.QDRANT_API_KEY
        });

         return NextResponse.json({
            success: true,
            message: "Text processed and indexed successfully",
            data: {
                originalText: text,
                processedText: finalPrompt,
                chunksCreated: docs.length,
                indexedAt: new Date().toISOString()
            }
        }, { status: 200 });

    } catch (error:any) {
        console.error("Error processing text",error);
        return NextResponse.json({
            success:false,
            error:error.message
        },{status:500}) 
    }
}
export async function GET() {
  return NextResponse.json({
    success: true,
    message: "✅ load-text endpoint is live"
  });
}
