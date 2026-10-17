import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const register = (data: { name: string; email: string; password: string }) =>
  api.post("/auth/register", data);

export const login = (data: { email: string; password: string }) =>
  api.post<{ access_token: string; token_type: string }>("/auth/login", data);

export const verifyEmail = (token: string) => api.post("/auth/verify", { token });

// Documents
export interface Document {
  id: string;
  filename: string;
  size: number;
  upload_date: string;
  current_version_number?: number;
  summary?: string | null;
  score?: DocumentScore | null;
  processing_status: string;
}

export interface DocumentScore {
  completeness: number;
  readability: number;
  structure: number;
  overall: number;
}

export const getDocuments = () =>
  api.get<{ documents: Document[]; storage_used: number; storage_quota: number }>("/documents");

export const getDocument = (id: string) => api.get<Document>(`/documents/${id}`);

export const uploadDocument = (file: File) => {
  const form = new FormData();
  form.append("file", file);
  return api.post<{ id: string; filename: string; size: number }>("/documents/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const deleteDocument = (id: string) => api.delete(`/documents/${id}`);

export const reprocessDocument = (id: string) =>
  api.post<{ message: string }>(`/documents/${id}/reprocess`);

export const updateDocument = (id: string, file: File) => {
  const form = new FormData();
  form.append("file", file);
  return api.post<{ id: string; filename: string; size: number }>(
    `/documents/${id}/update`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
};

export const renameDocument = (id: string, filename: string) =>
  api.patch<Document>(`/documents/${id}`, { filename });

export const getDocumentVersions = (id: string) =>
  api.get<{ versions: DocumentVersion[] }>(`/documents/${id}/versions`);

export const restoreVersion = (docId: string, versionId: string) =>
  api.post(`/documents/${docId}/restore/${versionId}`);

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}

export async function downloadDocument(docId: string, filename: string) {
  const res = await api.get(`/documents/${docId}/download`, { responseType: "blob" });
  const name = filename.toLowerCase().endsWith(".pdf") ? filename : `${filename}.pdf`;
  triggerBlobDownload(res.data, name);
}

export async function downloadDocumentVersion(
  docId: string,
  versionId: string,
  documentName: string,
  versionNumber: number
) {
  const res = await api.get(`/documents/${docId}/versions/${versionId}/download`, {
    responseType: "blob",
  });
  const base = documentName.replace(/\.pdf$/i, "");
  triggerBlobDownload(res.data, `${base}-v${versionNumber}.pdf`);
}

export interface DocumentVersion {
  id: string;
  version_number: number;
  size: number;
  created_at: string;
}

// Chat
export interface ChatMessage {
  id: string;
  question: string;
  answer: string;
  source_page?: number | null;
  source_version?: number | null;
  created_at: string;
}

export const sendChat = (document_id: string, question: string) =>
  api.post<{ answer: string; source_page?: number | null; source_version?: number | null }>(
    "/chat",
    { document_id, question }
  );

export const getChatHistory = (documentId: string) =>
  api.get<{ messages: ChatMessage[] }>(`/chat/${documentId}`);

// Admin
export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  timestamp: string;
}

export interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  is_verified: boolean;
  created_at: string;
}

export const getAuditLogs = () => api.get<{ logs: AuditLog[] }>("/admin/audit-logs");

export const getMe = () => api.get<UserInfo>("/admin/me");
