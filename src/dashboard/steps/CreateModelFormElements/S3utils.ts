import { authFetch } from '../../../utils/easyUtils';

/** Shared TypeScript contracts for /v1/storage routes. */

export type StorageBackendType = 'internal' | 'external' | string;

export interface StorageError {
  error: string;
  event?: string;
  deleted?: number;
}

export interface StorageConfigResponse {
  storage_type: StorageBackendType;
  endpoint: string;
  bucket: string;
  region: string;
}

export interface CreateStorageSessionResponse {
  mode: 'sts' | 'presigned' | string;
  storage_type: StorageBackendType;
  endpoint?: string;
  bucket: string;
  prefix: string;
  region?: string;
  access_key?: string;
  secret_key?: string;
  session_token?: string;
  expires_in: number;
}

export interface StorageQuotaResponse {
  quota_bytes: number;
  used_bytes: number;
  reserved_bytes: number;
  available_bytes: number;
}

export interface PutExternalStorageConfigRequest {
  endpoint: string;
  bucket: string;
  region: string;
  access_key: string;
  secret_key: string;
}

export interface PutExternalStorageConfigResponse {
  storage_type: StorageBackendType;
  sts_supported: boolean;
}

export interface TestExternalStorageConfigRequest {
  endpoint: string;
}

export interface TestExternalStorageConfigResponse {
  ok: boolean;
  cached?: boolean;
  status?: number;
  error?: string;
}

export interface CreatePresignedUploadRequest {
  file_name: string;
  content_type?: string;
  size: number;
  idempotency_key?: string;
}

export interface CreatePresignedUploadResponse {
  key: string;
  url: string;
  expires_in: number;
  reservation_id: string;
  idempotency_key: string;
  reserved_size: number;
}

export interface CommitStorageUploadRequest {
  key: string;
  reservation_id?: string;
}

export interface CommitStorageUploadResponse {
  key: string;
  size: number;
  etag: string;
  modified_at: string;
}

export interface StorageObject {
  key: string;
  size: number;
  etag: string;
  modified_at: string;
  url: string;
}

export interface ListStorageObjectsResponse {
  objects: StorageObject[];
}

export interface StorageObjectQuery {
  limit?: number;
}

export interface DeleteAllStorageObjectsResponse {
  deleted: number;
}

export interface StorageHealthResponse {
  ok: boolean;
  error?: string;
}

export type StorageMigrationState =
    | 'pending'
    | 'running'
    | 'failed'
    | 'completed'
    | 'cancelled'
    | string;

export interface StartStorageMigrationResponse {
  id: number;
  state: StorageMigrationState;
  source_type: StorageBackendType;
  target_type: StorageBackendType;
}

export interface StorageMigration {
  ID: number;
  UserID: number;
  State: StorageMigrationState;
  Copied: number;
  Verified: number;
  Total: number;
  Deleted: number;
  LastError: string;
  VerifiedKeys: string[];
  UpdatedAt: string;
}

export interface StorageMigrationParams {
  id: number | string;
}

export interface PresignStorageDownloadQuery {
  key: string;
  ttl?: number;
}

export interface PresignStorageDownloadResponse {
  key: string;
  url: string;
  expires_in: number;
}

export type StorageRouteContracts = {
  getConfig: {
    response: StorageConfigResponse;
  };
  createSession: {
    response: CreateStorageSessionResponse;
  };
  getQuota: {
    response: StorageQuotaResponse;
  };
  putExternalConfig: {
    request: PutExternalStorageConfigRequest;
    response: PutExternalStorageConfigResponse;
  };
  testExternalConfig: {
    request: TestExternalStorageConfigRequest;
    response: TestExternalStorageConfigResponse;
  };
  switchToInternal: {
    response: void;
  };
  createPresignedUpload: {
    request: CreatePresignedUploadRequest;
    response: CreatePresignedUploadResponse;
  };
  commitUpload: {
    request: CommitStorageUploadRequest;
    response: CommitStorageUploadResponse;
  };
  listObjects: {
    query: StorageObjectQuery;
    response: ListStorageObjectsResponse;
  };
  deleteObject: {
    query: { key: string };
    response: void;
  };
  deleteAllObjects: {
    response: DeleteAllStorageObjectsResponse;
  };
  health: {
    response: StorageHealthResponse;
  };
  startMigration: {
    response: StartStorageMigrationResponse;
  };
  getMigration: {
    params: StorageMigrationParams;
    response: StorageMigration;
  };
  cancelMigration: {
    params: StorageMigrationParams;
    response: void;
  };
  presignDownload: {
    query: PresignStorageDownloadQuery;
    response: PresignStorageDownloadResponse;
  };
};
/////////////////////////////////////////////

export type StorageSession = CreateStorageSessionResponse;
export type StorageQuota = StorageQuotaResponse;
export type StorageFile = StorageObject & { fileName: string; modifiedAt: string };

const json = (body: unknown) => ({
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  body: JSON.stringify(body),
});

const ensureOk = async (response: Response, operation: string) => {
  if (!response.ok) throw new Error(`${operation} failed ${response.status}`);
  return response;
};

export const getStorageSession = async (): Promise<StorageSession> => {
  const response = await ensureOk(await authFetch('/v1/storage/session', { method: 'POST' }), 'session');
  return response.json();
};

export const getStorageObjects = async (query: StorageObjectQuery = {}): Promise<StorageFile[]> => {
  const params = query.limit ? `?limit=${encodeURIComponent(query.limit)}` : '';
  const response = await ensureOk(await authFetch(`/v1/storage/objects${params}`), 'objects');
  const data = await response.json();
  return (data.objects || data.files || []).map((file: any) => ({
    key: file.key,
    fileName: file.fileName || file.name || file.key,
    size: file.size,
    contentType: file.contentType,
    modifiedAt: file.modified_at,
    url: file.url,
  }));
};

export const getStorageQuota = async (): Promise<StorageQuota> => {
  const response = await ensureOk(await authFetch('/v1/storage/quota'), 'quota');
  return response.json();
};

export const uploadToPresignedUrl = (file: Blob, url: string, onProgress?: (progress: number) => void) => new Promise<void>((resolve, reject) => {
  const xhr = new XMLHttpRequest();
  xhr.open('PUT', url, true);
  xhr.upload.onprogress = event => {
    if (event.lengthComputable && onProgress) onProgress(Math.round((event.loaded / event.total) * 100));
  };
  xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`upload failed status=${xhr.status}`));
  xhr.onerror = () => reject(new Error('network error'));
  xhr.send(file);
});

export const uploadStorageFile = async (file: File): Promise<void> => {
  const idempotencyKey = crypto.randomUUID();
  const response = await ensureOk(await authFetch('/v1/storage/presigned-upload', {
    method: 'POST',
    ...json({ file_name: file.name, size: file.size, content_type: file.type || undefined, idempotency_key: idempotencyKey } satisfies CreatePresignedUploadRequest),
  }), 'presigned-upload');
  const upload = await response.json() as CreatePresignedUploadResponse;
  if (!upload.url || !upload.key) throw new Error('Invalid presigned-upload response');
  await uploadToPresignedUrl(file, upload.url);
  await ensureOk(await authFetch('/v1/storage/commit', {
    method: 'POST',
    ...json({ key: upload.key, reservation_id: upload.reservation_id } satisfies CommitStorageUploadRequest),
  }), 'commit');
};

export const getStorageDownloadUrl = async (key: string, ttl?: number): Promise<string> => {
  const params = new URLSearchParams({key});
  if (ttl !== undefined) params.set('ttl', String(ttl));
  const response = await ensureOk(await authFetch(`/v1/storage/presigned-download?${params.toString()}`), 'presigned-download');
  const data = await response.json() as PresignStorageDownloadResponse;
  if (!data.url) throw new Error('Invalid presigned-download response');
  return data.url;
};

export const deleteStorageObject = async (key: string): Promise<void> => {
  await ensureOk(await authFetch(`/v1/storage/object?key=${encodeURIComponent(key)}`, { method: 'DELETE' }), 'delete');
};

export const getStorageConfig = async (): Promise<StorageConfigResponse> =>
  (await ensureOk(await authFetch('/v1/storage/config'), 'config')).json();

export const saveExternalStorageConfig = async (request: PutExternalStorageConfigRequest): Promise<PutExternalStorageConfigResponse> =>
  (await ensureOk(await authFetch('/v1/storage/config', { method: 'PUT', ...json(request) }), 'save config')).json();

export const testExternalStorageConfig = async (request: TestExternalStorageConfigRequest): Promise<TestExternalStorageConfigResponse> =>
  (await ensureOk(await authFetch('/v1/storage/config/test', { method: 'POST', ...json(request) }), 'test config')).json();

export const switchToInternalStorage = async (): Promise<void> => {
  await ensureOk(await authFetch('/v1/storage/config/internal', { method: 'POST' }), 'switch internal');
};

export const startStorageMigration = async (): Promise<StartStorageMigrationResponse> =>
  (await ensureOk(await authFetch('/v1/storage/migration', { method: 'POST' }), 'start migration')).json();

export const getStorageMigration = async (id: number | string): Promise<StorageMigration> =>
  (await ensureOk(await authFetch(`/v1/storage/migration/${encodeURIComponent(id)}`), 'migration status')).json();
