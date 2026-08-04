/**
 * Утилиты для работы с API эмбеддингов
 * Функции для загрузки, получения и удаления документов с эмбеддингами
 */

import { authFetch } from "../../../utils/easyUtils";


/**
 * Интерфейс для метаданных документа
 */
export interface DocumentMetadata {
  source?: string;
  createdAt?: string;
  [key: string]: any;
}

/**
 * Интерфейс для запроса загрузки эмбеддинга
 */
export interface UploadEmbeddingRequest {
  provider: string;
  doc_name: string;
  content: string;
  metadata?: DocumentMetadata;
}

/**
 * Интерфейс для ответа при загрузке документа
 */
export interface UploadEmbeddingResponse {
  success: boolean;
  doc_id: string;
  message: string;
}

/**
 * Интерфейс для документа в списке
 */
export interface Document {
  id: string;
  name: string;
  content?: string;
  metadata?: DocumentMetadata;
  createdAt?: string;
  [key: string]: any;
}

/**
 * Интерфейс для ответа при получении списка документов
 */
export interface ListDocumentsResponse {
  success: boolean;
  documents: Document[];
  count: number;
}

/**
 * Интерфейс для ответа при удалении документа
 */
export interface DeleteDocumentResponse {
  success: boolean;
  message: string;
  doc_id: string;
}

/**
 * Загрузка документа с эмбеддингом
 * POST /embedding/upload
 *
 * @param provider - Провайдер (openai, google и т.д.)
 * @param docName - Имя документа
 * @param content - Содержимое документа
 * @param metadata - Опциональные метаданные документа
 * @returns Promise<UploadEmbeddingResponse>
 */
export const uploadEmbedding = async (
  provider: string,
  docName: string,
  content: string,
  metadata?: DocumentMetadata
): Promise<UploadEmbeddingResponse> => {
  try {
    const request: UploadEmbeddingRequest = {
      provider: provider.toLowerCase() === "gemini" ? "google" : provider.toLowerCase(),
      doc_name: docName,
      content: content,
      ...(metadata && { metadata }),
    };

    const response = await authFetch(`/v1/embedding/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      // При ошибке сервер может вернуть не-JSON (например HTML)
      let errorMessage = `HTTP Error: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        // Если не JSON, используем statusText или default message
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error("Error uploading embedding:", error);
    throw error;
  }
};

/**
 * Получение списка всех документов пользователя
 * GET /embedding/list
 *
 * @param provider - Провайдер (openai, google и т.д.)
 * @returns Promise<ListDocumentsResponse>
 */
export const listUserDocuments = async (
  provider: string
): Promise<ListDocumentsResponse> => {
  try {
    const embeddingProvider = provider.toLowerCase() === "gemini" ? "google" : provider.toLowerCase();
    const response = await authFetch(`/v1/embedding/list?provider=${encodeURIComponent(embeddingProvider)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      let errorMessage = `HTTP Error: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error("Error listing documents:", error);
    throw error;
  }
};

/**
 * Получение списка документов с фильтрацией и пагинацией (расширенная версия)
 * GET /embedding/list
 *
 * @param options - Опции фильтрации и пагинации
 * @returns Promise<ListDocumentsResponse>
 */
export const listUserDocumentsWithOptions = async (
  options?: {
    skip?: number;
    limit?: number;
    search?: string;
  }
): Promise<ListDocumentsResponse> => {
  try {
    const params = new URLSearchParams();
    if (options?.skip !== undefined) params.append('skip', options.skip.toString());
    if (options?.limit !== undefined) params.append('limit', options.limit.toString());
    if (options?.search) params.append('search', options.search);

    const response = await authFetch(`/v1/embedding/list?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      let errorMessage = `HTTP Error: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error("Error listing documents with options:", error);
    throw error;
  }
};

/**
 * Удаление документа по ID
 * DELETE /embedding/:id
 *
 * @param documentId - ID документа для удаления
 * @param provider - Провайдер (openai, google и т.д.)
 * @returns Promise<DeleteDocumentResponse>
 */
export const deleteDocument = async (
  documentId: string,
  provider: string
): Promise<DeleteDocumentResponse> => {
  try {
    if (!documentId || documentId.trim() === "") {
      throw new Error("Document ID is required");
    }

    const embeddingProvider = provider.toLowerCase() === "gemini" ? "google" : provider.toLowerCase();
    const url = `/v1/embedding/${encodeURIComponent(documentId)}?provider=${encodeURIComponent(embeddingProvider)}`;
    const response = await authFetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      let errorMessage = `HTTP Error: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error("Error deleting document:", error);
    throw error;
  }
};

/**
 * Вспомогательная функция для загрузки документа из файла
 *
 * @param provider - Провайдер (openai, google и т.д.)
 * @param file - Файл для загрузки
 * @param metadata - Опциональные метаданные
 * @returns Promise<UploadEmbeddingResponse>
 */
export const uploadDocumentFromFile = async (
  provider: string,
  file: File,
  metadata?: DocumentMetadata
): Promise<UploadEmbeddingResponse> => {
  try {
    const content = await file.text();
    const docName = file.name;

    return await uploadEmbedding(provider, docName, content, metadata);
  } catch (error) {
    console.error("Error uploading document from file:", error);
    throw error;
  }
};

/**
 * Вспомогательная функция для загрузки нескольких документов
 *
 * @param provider - Провайдер (openai, google и т.д.)
 * @param documents - Массив документов для загрузки
 * @returns Promise<UploadEmbeddingResponse[]>
 */
export const uploadMultipleEmbeddings = async (
  provider: string,
  documents: Array<{
    docName: string;
    content: string;
    metadata?: DocumentMetadata;
  }>
): Promise<UploadEmbeddingResponse[]> => {
  try {
    const results = await Promise.all(
      documents.map((doc) =>
        uploadEmbedding(provider, doc.docName, doc.content, doc.metadata)
      )
    );
    return results;
  } catch (error) {
    console.error("Error uploading multiple embeddings:", error);
    throw error;
  }
};

/**
 * Вспомогательная функция для удаления нескольких документов
 *
 * @param documentIds - Массив ID документов для удаления
 * @param provider - Провайдер (openai, google и т.д.)
 * @returns Promise<DeleteDocumentResponse[]>
 */
export const deleteMultipleDocuments = async (
  documentIds: string[],
  provider: string
): Promise<DeleteDocumentResponse[]> => {
  try {
    const results = await Promise.all(
      documentIds.map((id) => deleteDocument(id, provider))
    );
    return results;
  } catch (error) {
    console.error("Error deleting multiple documents:", error);
    throw error;
  }
};
