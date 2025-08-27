# AskMe - AI Document Chat

AskMe is a sophisticated, AI-powered chat application built with Next.js that allows you to have conversations with your own data. Ingest content from PDFs, websites, or raw text, and get synthesized, accurate answers with cited sources.

## ✨ Features

### Multi-Source Data Ingestion

  - **PDF Files**: Upload PDF documents for analysis.
  - **Web URLs**: Crawl and extract meaningful content from any website.
  - **Raw Text**: Directly paste and process blocks of text.

### Advanced AI Chat Interface

  - Engage in a conversation with your documents through an intuitive chat panel.
  - AI provides structured, synthesized summaries with accurate responses.
  - Full support for markdown rendering, including code blocks with syntax highlighting.

### Reliable Source Citation

  - Every AI-generated answer includes citations from source documents.

### Modern Tech Stack

  - Built with **Next.js** and **TypeScript** using the App Router.
  - Styled with **Tailwind CSS** and **shadcn/ui** for a responsive, themeable UI (light/dark mode).
  - Powered by **Google Generative AI (Gemini)** API for language understanding and generation.
  - Integrates **LangChain.js** for document processing and vector operations.

## ⚙️ Tech Stack

**Framework**: Next.js
**Language**: TypeScript
**Styling**: Tailwind CSS, shadcn/ui
**AI & LLM**: Google Generative AI (Gemini), LangChain.js
**Vector DB**: Qdrant Cloud
**UI Components**: Radix UI, Lucide React (Icons)
**Deployment**: Vercel

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development.

### Prerequisites

  - Node.js (v20.x or higher)
  - npm, yarn, pnpm, or bun
  - A Qdrant Cloud account

### Installation & Setup

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/your-username/your-repo-name.git
    cd your-repo-name
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Set up Qdrant Cloud:**

      - Go to [Qdrant Cloud](https://cloud.qdrant.io/) and sign up for a free account.
      - Create a new, free-tier cluster.
      - Once the cluster is active, find your **Cluster URL** and create an **API Key**. You will need both for the next step.

4.  **Set up Environment Variables:**
    Create a `.env` file in the root directory and add the following variables:

    ```env
    # Get your API key from Google AI Studio: https://makersuite.google.com/app/apikey
    GEMINI_API_KEY="YOUR_GEMINI_API_KEY"

    # Get these from your Qdrant Cloud dashboard
    QDRANT_END_URL="YOUR_QDRANT_CLOUD_URL"
    QDRANT_API_KEY="YOUR_QDRANT_API_KEY"

    # Name for the collection in Qdrant
    COLLECTION_NAME="YOUR_COLLECTION_NAME"
    ```

5.  **Run the development server:**

    ```bash
    npm run dev
    ```

6.  **Open the application:**
    Navigate to [http://localhost:3000](https://www.google.com/search?q=http://localhost:3000) in your browser.

## ☁️ Deployment

The easiest way to deploy this Next.js app is using the [Vercel Platform](https://vercel.com). Your Qdrant Cloud database can be used for both development and production.

For detailed Next.js deployment instructions, check the [official documentation](https://nextjs.org/docs/deployment).
