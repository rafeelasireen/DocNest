import bootstrap  # noqa: F401

import logging
from uuid import UUID

import fitz
import chromadb
from chromadb.config import Settings as ChromaSettings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import OllamaEmbeddings
from langchain_community.llms import Ollama

from config import settings

logger = logging.getLogger(__name__)


class RAGService:
    def __init__(self):
        self.embeddings = OllamaEmbeddings(
            base_url=settings.ollama_base_url,
            model="nomic-embed-text",
        )
        self.llm = Ollama(
            base_url=settings.ollama_base_url,
            model="llama3.2",
            temperature=0.3,
        )
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
        )
        self._chroma_client = None

    @property
    def chroma_client(self):
        if self._chroma_client is None:
            self._chroma_client = chromadb.HttpClient(
                host=settings.chroma_host,
                port=settings.chroma_port,
                settings=ChromaSettings(anonymized_telemetry=False),
            )
        return self._chroma_client

    def extract_text_from_pdf(self, pdf_bytes: bytes) -> list[dict]:
        pages = []
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        for page_num in range(len(doc)):
            text = doc[page_num].get_text()
            if text.strip():
                pages.append({"page": page_num + 1, "text": text})
        doc.close()
        return pages

    def index_document(
        self, document_id: UUID, pdf_bytes: bytes, version_number: int = 1
    ) -> str:
        pages = self.extract_text_from_pdf(pdf_bytes)
        full_text = "\n\n".join(p["text"] for p in pages)
        if not full_text.strip():
            return ""

        collection_name = f"doc_{document_id}"
        try:
            self.chroma_client.delete_collection(collection_name)
        except Exception:
            pass

        collection = self.chroma_client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},
        )
        chunks = self.splitter.split_text(full_text)
        if not chunks:
            return full_text

        try:
            embeddings = self.embeddings.embed_documents(chunks)
        except Exception as e:
            raise RuntimeError(
                "Embedding failed. Ensure Ollama is running and "
                f"'nomic-embed-text' is pulled: {e}"
            ) from e

        ids = []
        documents = []
        metadatas = []

        for i, chunk in enumerate(chunks):
            page = self._guess_page(chunk, pages)
            ids.append(f"{document_id}_{i}")
            documents.append(chunk)
            # ChromaDB metadata values must be str, int, float, or bool
            metadatas.append({
                "page": int(page),
                "version": int(version_number),
                "document_id": str(document_id),
                "source": "pdf",
            })

        collection.add(
            ids=ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas,
        )

        return full_text

    def _guess_page(self, chunk: str, pages: list[dict]) -> int:
        snippet = chunk[:100]
        for page in pages:
            if snippet in page["text"]:
                return page["page"]
        return pages[0]["page"] if pages else 1

    def query(
        self,
        document_id: UUID,
        question: str,
        top_k: int = 4,
        document_version: int | None = None,
    ) -> tuple[str, int | None, int | None]:
        collection_name = f"doc_{document_id}"
        try:
            collection = self.chroma_client.get_collection(collection_name)
        except Exception:
            return "No indexed content found for this document.", None, None

        try:
            query_embedding = self.embeddings.embed_query(question)
            results = collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k,
                include=["documents", "metadatas", "distances"],
            )
        except Exception as e:
            logger.error("ChromaDB query failed: %s", e)
            return "Unable to search document content.", None, None

        if not results["documents"] or not results["documents"][0]:
            return "No relevant content found in the document.", None, None

        context_parts = []
        source_page = None
        source_version = None
        for doc, meta in zip(results["documents"][0], results["metadatas"][0]):
            page = meta.get("page", 1)
            if isinstance(page, str):
                page = int(page)
            version = meta.get("version")
            if isinstance(version, str):
                version = int(version)
            if source_page is None:
                source_page = page
            if source_version is None and version is not None:
                source_version = version
            context_parts.append(f"[Version {version or document_version or 1}, Page {page}]: {doc}")

        context = "\n\n".join(context_parts)
        prompt = f"""Answer the question based only on the following document context.
If the answer is not in the context, say you cannot find it in the document.
Include specific details from the context.

Context:
{context}

Question: {question}

Answer:"""

        try:
            answer = self.llm.invoke(prompt)
        except Exception as e:
            logger.error("LLM query failed: %s", e)
            answer = "AI service is temporarily unavailable. Please try again later."

        if source_version is None and document_version is not None:
            source_version = document_version

        return answer.strip(), source_page, source_version

    def summarize(self, text: str) -> str:
        if not text.strip():
            return "No text content available to summarize."

        truncated = text[:8000]
        prompt = f"""Provide a concise summary (3-5 sentences) of the following document:

{truncated}

Summary:"""

        try:
            return self.llm.invoke(prompt).strip()
        except Exception as e:
            logger.error("Summarization failed: %s", e)
            return "Summary generation failed. The document has been indexed for chat."

    def delete_collection(self, document_id: UUID) -> None:
        try:
            self.chroma_client.delete_collection(f"doc_{document_id}")
        except Exception:
            pass


rag_service = RAGService()
