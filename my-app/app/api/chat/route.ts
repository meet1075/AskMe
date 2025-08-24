import 'dotenv/config';
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { TaskType } from "@google/generative-ai";
import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';
import { Document } from "langchain/document";

const client = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/'
});

const correctionPrompt = `You are an AI assistant that corrects user queries for a search system. Your task is to rephrase the user's query to be clearer and more effective for retrieval.
**Instructions:**
- Fix typos and grammatical errors.
- **DO NOT** answer the question or generate code.
- Return **only** the rephrased query and nothing else.
**Examples:**
- User Query: "prnt helo wrld in c+"
- Corrected Query: "print hello world in c++"
- User Query: "how does OSI model work"
- Corrected Query: "Explain the layers of the OSI model"`;

async function correctQuery(rawQuery: string): Promise<string | null> {
    try {
        const response = await client.chat.completions.create({
            model: "gemini-2.0-flash",
            messages: [
                { role: "system", content: correctionPrompt },
                { role: "user", content: rawQuery }
            ]
        });
        return response.choices[0].message.content || rawQuery;
    } catch (error: any) {
        console.error("Error correcting query:", error);
        return rawQuery;
    }
}

async function retrieveChunks(query: string, k = 5): Promise<Document[] | null> {
    try {
        const embeddings = new GoogleGenerativeAIEmbeddings({
            model: "embedding-001",
            taskType: TaskType.RETRIEVAL_DOCUMENT,
            apiKey: process.env.GEMINI_API_KEY,
        });
        const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
            url: process.env.QDRANT_URL || "http://localhost:6333",
            collectionName: process.env.COLLECTION_NAME || "chaicode_v1"
        });
        const retriever = vectorStore.asRetriever({ k });
        const chunks = await retriever.invoke(query);
        return chunks;
    } catch (error: any) {
        console.error("Error retrieving chunks:", error);
        return null;
    }
}

// --- FIX #1: The rerankChunks function is now smarter. ---
// It returns the full Document objects, not just text.
async function rerankChunks(query: string, chunks: Document[]): Promise<Document[] | null> {
    try {
        if (!chunks || chunks.length === 0) return [];
        
        const chunkText = chunks
            .map((doc, i) =>
                `// Chunk [${i}]\n// Source: ${doc.metadata?.source ?? "unknown"}\n${doc.pageContent}`
            )
            .join("\n\n");

        const rerankPrompt = `You are an expert assistant that identifies the most relevant documents to answer a query.
        
        ### Query
        ${query}

        ### Candidate Chunks
        ${chunkText}

        ### Instructions
        - Identify the chunks from the "Candidate Chunks" that are most relevant to the user's "Query".
        - Return a comma-separated list of the original index numbers of the most relevant chunks (e.g., "1, 3, 4").
        - **DO NOT** answer the query, summarize, or explain. Return only the list of numbers.`;

        const response = await client.chat.completions.create({
            model: "gemini-2.0-flash",
            messages: [
                { role: "system", content: rerankPrompt },
                { role: "user", content: query },
            ],
            temperature: 0,
        });

        const selectedIndexesStr = response.choices[0].message.content || "";
        const selectedIndexes = selectedIndexesStr.split(',')
            .map(i => parseInt(i.trim()))
            .filter(i => !isNaN(i) && i >= 0 && i < chunks.length);

        return selectedIndexes.map(i => chunks[i]);
    } catch (error: any) {
        console.error("Error reranking chunks:", error);
        return chunks; // Fallback to returning original chunks if reranking fails
    }
}

async function generateAnswer(query: string, context: string): Promise<string | null> {
    try {
        if (!context || context.length === 0) {
            return "The provided documents do not contain enough information to create a summary for this topic.";
        }

        const systemPrompt = `You are an expert AI assistant skilled at synthesizing information.
        ### Context
        ${context}

        ### Task
        Your goal is to organize and create a brief, structured summary from the provided context.
        
        ### Instructions
        - **Do not directly answer the user's original query.**
        - Instead, synthesize the information from the context into a well-organized and concise summary.
        - Use clear headings, subheadings, and bullet points.
        - Ensure the summary is objective and strictly based on the provided context.
        -if there is code then print it one code block and then explain that code
        - If the context does not contain relevant information, respond with: "No relevant information found to summarize for this topic."`;

        const response = await client.chat.completions.create({
            model: "gemini-2.0-flash",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: query },
            ],
        });
        return response.choices[0].message.content || "Unable to generate a summary.";
    } catch (error: any) {
        console.error("Error generating answer:", error);
        return null;
    }
}

function formatSources(chunks: Document[]): string {
    if (!chunks || chunks.length === 0) {
        return "";
    }
    const sources = chunks.map(doc => {
        const source = doc.metadata.document_type||doc.metadata.source || "unknown";
        const pageNumber = doc.metadata.loc?.pageNumber;
        if (source.toLowerCase().endsWith('.pdf') && pageNumber) {
            return `${source} (Page ${pageNumber})`;
        }
        if (source === 'api_request') {
            return 'Text Input';
        }
        return source;
    });
    const uniqueSources = [...new Set(sources)];
    return uniqueSources.map(s => `- ${s}`).join("\n");
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { query } = body;

        if (!query || typeof query !== 'string' || query.trim().length === 0) {
            return NextResponse.json({ success: false, error: "Valid query is required" }, { status: 400 });
        }

        console.log(`🔍 Processing query: ${query}`);
        const correctedQuery = await correctQuery(query);
        if (!correctedQuery) {
            return NextResponse.json({ success: false, error: "Failed to process query" }, { status: 500 });
        }
        
        console.log(`✅ Corrected query: ${correctedQuery}`);
        const topChunks = await retrieveChunks(correctedQuery);
        if (!topChunks) {
            return NextResponse.json({ success: false, error: "Failed to retrieve relevant information" }, { status: 500 });
        }

        if (topChunks.length === 0) {
            return NextResponse.json({
                success: true,
                data: { answer: "No relevant information found in the knowledge base for this query." }
            }, { status: 200 });
        }
        console.log(`📚 Retrieved ${topChunks.length} chunks`);
        
        // --- FIX #2: The POST handler is now cleaner and more reliable ---
        const rerankedChunks = await rerankChunks(correctedQuery, topChunks);
        if (!rerankedChunks) {
            return NextResponse.json({ success: false, error: "Failed to process retrieved information" }, { status: 500 });
        }
        console.log(`🎯 Reranked to ${rerankedChunks.length} chunks`);

        const context = rerankedChunks.map(chunk => chunk.pageContent).join("\n\n");
        const answer = await generateAnswer(correctedQuery, context);
        if (!answer) {
            return NextResponse.json({ success: false, error: "Failed to generate answer" }, { status: 500 });
        }

        // The unreliable filtering step is gone. We use the reranked chunks directly.
        const formattedSources = formatSources(rerankedChunks);
        
        const finalAnswer = formattedSources
            ? `${answer}\n\n**Sources:**\n${formattedSources}`
            : answer;

        console.log(`✅ Answer generated successfully`);
        return NextResponse.json({
            success: true,
            message: "Answer generated successfully",
            data: {
                originalQuery: query,
                correctedQuery,
                answer: finalAnswer, 
                chunksFound: rerankedChunks.length, 
                processedAt: new Date().toISOString()
            }
        }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({
            success:false,
            message:"Error retrieving answer:", error
        },{status:500}) 
    }
}