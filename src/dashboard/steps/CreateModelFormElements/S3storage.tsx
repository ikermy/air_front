import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Button, Form, Input, Typography, Progress, Spin, Switch, Modal, Popconfirm, Upload} from 'antd';
import {CloudOutlined, UploadOutlined, FileOutlined, FilePdfOutlined, DeleteOutlined} from '@ant-design/icons';
import {useTranslation} from 'react-i18next';
import {showErrorNotification, showNotification, showWarningNotification} from '../../hotification/showNotification';
import {
    deleteStorageObject,
    getStorageDownloadUrl,
    getStorageObjects,
    getStorageQuota,
    getStorageSession,
    StorageFile,
    StorageQuota,
    StorageSession,
    uploadStorageFile
    ,getStorageConfig, saveExternalStorageConfig, testExternalStorageConfig, switchToInternalStorage,
    startStorageMigration, getStorageMigration, PutExternalStorageConfigRequest, StorageMigration
} from './S3utils';

const {Text} = Typography;

export const S3storage: React.FC<{
    onChange?: (v: boolean) => void;
    initialEnabled?: boolean;
    value?: boolean
}> = ({onChange, initialEnabled, value}) => {
    const {t} = useTranslation();
    const [enabledInternal, setEnabledInternal] = useState<boolean>(!!initialEnabled);
    const isControlled = value !== undefined;
    const enabled = isControlled ? !!value : enabledInternal;

    const [loading, setLoading] = useState(false);
    const [files, setFiles] = useState<StorageFile[]>([]);
    const [session, setSession] = useState<StorageSession | null>(null);
    const [quota, setQuota] = useState<StorageQuota | null>(null);
    const [fileList, setFileList] = useState<any[]>([]);
    const [isModalOpen, setModalOpen] = useState(false);
    const [storageState, setStorageState] = useState<'ready' | 'locked' | 'migrating'>('ready');
    const [config, setConfig] = useState<any>(null);
    const [migration, setMigration] = useState<StorageMigration | null>(null);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [settingsLoading, setSettingsLoading] = useState(false);
    const [form] = Form.useForm<PutExternalStorageConfigRequest>();

    const fetchSession = useCallback(async () => {
        try {
            setLoading(true);
            setSession(await getStorageSession());
        } catch (e: any) {
            console.error('fetchSession error', e);
            showErrorNotification(t('s3SessionError') || 'Ошибка получения сессии', e.message || String(e));
            setSession(null);
        } finally {
            setLoading(false);
        }
    }, [t]);

    const listFiles = useCallback(async () => {
        try {
            setLoading(true);
            setFiles(await getStorageObjects());
        } catch (e: any) {
            console.error('listFiles error', e);
            showErrorNotification(t('s3GetFilesError') || 'Ошибка получения файлов', e.message || String(e));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        if (!enabled) return;

        fetchSession();
        listFiles();
        getStorageQuota().then(setQuota).catch(() => undefined);
    }, [enabled, fetchSession, listFiles]);

    useEffect(() => {
        if (!enabled) return;
        getStorageConfig().then(setConfig).catch(() => undefined);
    }, [enabled]);

    useEffect(() => {
        if (!migration || migration.State === 'completed' || migration.State === 'failed' || migration.State === 'cancelled') return;
        const timer = window.setInterval(() => getStorageMigration(migration.ID).then(setMigration).catch(() => undefined), 2000);
        return () => window.clearInterval(timer);
    }, [migration]);

    const saveExternal = async (values: PutExternalStorageConfigRequest) => {
        setSettingsLoading(true);
        try {
            const test = await testExternalStorageConfig({endpoint: values.endpoint});
            if (!test.ok) throw new Error(test.error || 'External storage is unavailable');
            await saveExternalStorageConfig(values);
            const started = await startStorageMigration();
            setMigration({ID: started.id, State: started.state, UserID: 0, Copied: 0, Verified: 0, Total: 0, Deleted: 0, LastError: '', VerifiedKeys: [], UpdatedAt: ''});
            setStorageState('migrating');
            setSettingsOpen(false);
            showNotification(t('s3MigrationStarted') || 'Миграция запущена', '');
        } catch (error: any) {
            showErrorNotification(t('s3ExternalStorageError') || 'Ошибка внешнего хранилища', error.message || String(error));
        } finally { setSettingsLoading(false); }
    };

    const switchInternal = async () => {
        setSettingsLoading(true);
        try { await switchToInternalStorage(); setConfig(null); setStorageState('ready'); await fetchSession(); await listFiles(); }
        catch (error: any) { showErrorNotification(t('s3ExternalStorageError') || 'Ошибка переключения', error.message || String(error)); }
        finally { setSettingsLoading(false); }
    };

    useEffect(() => {
        if (!enabled || !session?.expires_in) return;
        const refreshMs = Math.max(1000, (session.expires_in - 30) * 1000);
        const timer = window.setTimeout(fetchSession, refreshMs);
        return () => window.clearTimeout(timer);
    }, [enabled, session, fetchSession]);

    useEffect(() => {
        const onStorageEvent = (event: Event) => {
            const type = (event as CustomEvent<{ state?: string }>).detail?.state;
            if (event.type === 'storage-session-expired') {
                fetchSession();
                return;
            }
            if (event.type === 'storage-locked' || type === 'locked') setStorageState('locked');
            if (event.type === 'storage-migrating' || type === 'migrating') setStorageState('migrating');
            if (event.type === 'storage-backend-changed' || type === 'ready') {
                setStorageState('ready');
                if (enabled) {
                    fetchSession();
                    listFiles();
                    getStorageQuota().then(setQuota).catch(() => undefined);
                }
            }
        };
        const onReauth = () => {
            if (enabled) fetchSession();
        };
        ['storage-locked', 'storage-migrating', 'storage-backend-changed', 'storage-session-expired'].forEach(type => window.addEventListener(type, onStorageEvent));
        window.addEventListener('reauth-userkey', onReauth);
        return () => {
            ['storage-locked', 'storage-migrating', 'storage-backend-changed', 'storage-session-expired'].forEach(type => window.removeEventListener(type, onStorageEvent));
            window.removeEventListener('reauth-userkey', onReauth);
        };
    }, [enabled, fetchSession, listFiles]);

    const handleSwitch = (checked: boolean) => {
        if (!isControlled) setEnabledInternal(checked);
        if (typeof onChange === 'function') onChange(checked);
    };

    const formatFileSize = (bytes: number) => {
        if (!bytes) return '0 Б';
        const k = 1024;
        const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getDisplayFileName = (fileName: string) => {
        const name = fileName.split('/').pop() || fileName;
        return name.replace(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i,
            ''
        );
    };

    const handleUploadChange = ({fileList: fl}: any) => {
        // dedupe by name+size
        const seen = new Set<string>();
        const deduped = [] as any[];
        for (let i = 0; i < fl.length; i++) {
            const f = fl[i];
            const key = `${f.name}_${f.size}`;
            // if (!/\.(pdf|txt|csv|json|docx?|xlsx?|png|jpe?g|webp|zip)$/i.test(f.name || '')) continue;
            if (!seen.has(key)) {
                seen.add(key);
                deduped.push(f);
            }
        }
        const capped = deduped.slice(-10);
        if (deduped.length > 10) showWarningNotification(t('s3UploadLimit') || 'Можно загрузить не более 10 файлов');
        setFileList(capped);
    };

    const handleUploadFiles = async () => {
        if (fileList.length === 0) {
            showWarningNotification(t('s3SelectFilesWarning') || 'Выберите файлы для загрузки');
            return;
        }

        if (storageState !== 'ready') {
            showWarningNotification(t('s3StorageUnavailable') || 'Хранилище временно недоступно');
            return;
        }

        const totalSize = fileList.reduce((sum, file) => sum + (file.size || 0), 0);
        if (quota && totalSize > quota.available_bytes) {
            showWarningNotification(t('s3QuotaExceeded') || 'Недостаточно места в хранилище');
            return;
        }

        setLoading(true);
        try {
            for (const f of fileList) {
                // request reservation / presigned URL
                await uploadStorageFile(f.originFileObj || f);
            }

            showNotification(t('s3FilesUploaded') || 'Файлы загружены', t('s3FilesUploadedDesc') || 'Загрузка завершена');
            setFileList([]);
            await listFiles();
            setQuota(await getStorageQuota());
        } catch (e: any) {
            console.error('handleUploadFiles error', e);
            showErrorNotification(t('s3UploadFilesError') || 'Ошибка загрузки файлов', e.message || String(e));
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteFile = async (fileName: string) => {
        setLoading(true);
        try {
            await deleteStorageObject(fileName);
            showNotification(t('s3FileDeleted') || 'Файл удален', '');
            await listFiles();
            setQuota(await getStorageQuota());
        } catch (e: any) {
            console.error('delete file error', e);
            showErrorNotification(t('s3DeleteFileError') || 'Ошибка удаления файла', e.message || String(e));
        } finally {
            setLoading(false);
        }
    };

    const storagePercent = useMemo(() => {
        if (!quota || !quota.quota_bytes) return 0;
        return Math.min(100, Math.round((quota.used_bytes / quota.quota_bytes) * 100));
    }, [quota]);

    return (
        <>
            <style>{`
                .s3-files-grid,
                .s3-selected-files-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                }
                @container s3-content (min-width: 980px) {
                    .s3-files-grid,
                    .s3-selected-files-grid {
                        grid-template-columns: repeat(3, minmax(0, 1fr));
                    }
                }
            `}</style>
            <div className="section-title"><CloudOutlined/>{t('s3Title') || 'Файлы S3'}</div>
            <div className="step">
                <span>{t('s3UseStorage') || 'Использовать'} <a
                    onClick={() => setModalOpen(true)}>{t('s3StorageLink') || 'S3 хранилище'}</a>
                    <Button type="link" onClick={() => setSettingsOpen(true)}>{t('s3SwitchToExternal')}
                    </Button>
                </span>
                <Switch
                    checked={enabled}
                    onChange={handleSwitch}
                    checkedChildren={<span style={{color: "black"}}>{t("Yes") || "Да"}</span>}
                    unCheckedChildren={<span style={{color: "black"}}>{t("No") || "Нет"}</span>}
                />
            </div>

            {enabled && (
                <div className="channel-item" style={{containerType: 'inline-size', containerName: 's3-content'}}>
                    {storageState !== 'ready' && <Text
                        type="warning">{storageState === 'migrating' ? (t('s3StorageMigrating') || 'Идёт миграция хранилища') : (t('s3StorageLocked') || 'Хранилище заблокировано')}</Text>}
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 12}}>
                        <Text>{t('s3StorageUsed') || 'Использовано хранилища:'}</Text>
                        <Text
                            strong>{formatFileSize(quota?.used_bytes || 0)} / {formatFileSize(quota?.quota_bytes || 0)}</Text>
                    </div>
                    <Progress percent={storagePercent}/>
                    {migration && <Text type={migration.State === 'failed' ? 'danger' : 'secondary'}>Миграция: {migration.State} ({migration.Copied}/{migration.Total || '?'})</Text>}

                    <div style={{marginTop: 16}}>
                        {loading ? (
                            <div style={{textAlign: 'center', padding: 40}}><Spin size="large"/>
                                <div style={{marginTop: 16}}><Text>{t('s3LoadingFiles') || 'Загрузка файлов...'}</Text>
                                </div>
                            </div>
                        ) : files.length === 0 ? (
                            <p>{t('s3NoFiles') || 'В вашем S3 хранилище пока нет файлов.'}</p>
                        ) : (
                            <div style={{
                                gap: 12,
                                width: '100%',
                                maxHeight: 430,
                                overflowY: 'auto'
                            }} className="s3-files-grid">
                                {files.map(file => (
                                <div key={file.key} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    minWidth: 0,
                                    padding: '8px 12px',
                                    border: '1px solid #f0f0f0',
                                    borderRadius: 6
                                }}>
                                    {getDisplayFileName(file.fileName).toLowerCase().endsWith('.pdf') ?
                                        <FilePdfOutlined style={{marginRight: 8}}/> :
                                        <FileOutlined style={{marginRight: 8}}/>}
                                    <div style={{flex: 1, minWidth: 0}}>
                                        <Text style={{
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}>{getDisplayFileName(file.fileName)}</Text>
                                        <div style={{display: 'flex', gap: 16, marginTop: 4}}>
                                            <Text type="secondary"
                                                  style={{fontSize: 12}}>{formatFileSize(file.size)}</Text>
                                            <Text type="secondary" style={{fontSize: 12}}>{file.modifiedAt || ''}</Text>
                                        </div>
                                    </div>
                                    <div style={{marginLeft: 'auto'}}>
                                        <Button type="link" size="small" onClick={async () => {
                                            try {
                                                const url = await getStorageDownloadUrl(file.key);
                                                window.open(url, '_blank', 'noopener,noreferrer');
                                            } catch (error: any) {
                                                showErrorNotification(t('s3OpenFileError') || 'Ошибка получения ссылки', error.message || String(error));
                                            }
                                        }}>{t('s3OpenFile') || 'Открыть'}</Button>
                                        <Popconfirm
                                            title={t("s3DeleteFileConfirm") || "Вы уверены, что хотите удалить этот файл?"}
                                            onConfirm={() => handleDeleteFile(file.key)}
                                            okText={t("Yes") || "Да"}
                                            cancelText={t("No") || "Нет"}
                                            okButtonProps={{ style: { color: 'black' } }}
                                        >
                                            <Button
                                                type="text"
                                                icon={<DeleteOutlined />}
                                                style={{ marginLeft: 'auto', color: 'red' }}
                                            />
                                        </Popconfirm>
                                    </div>
                                </div>
                            ))}
                            </div>
                        )}
                    </div>

                    {/* Загрузка файлов в S3 */}
                        <Upload
                            multiple fileList={fileList}
                            onChange={handleUploadChange}
                            beforeUpload={() => false}
                            showUploadList>
                            <Button
                                icon={<UploadOutlined/>}>{t('s3SelectFiles') || 'Выбрать файлы для загрузки'}</Button>
                        </Upload>

                        {fileList.length > 0 && (
                            <div style={{marginTop: 12}}>
                                <Text strong>{t('s3SelectedFiles') || 'Выбранные файлы'}</Text>
                                <div style={{
                                    gap: 8,
                                    maxHeight: 180,
                                    overflowY: 'auto',
                                    marginTop: 8
                                }} className="s3-selected-files-grid">
                                    {fileList.map((file: any, index: number) => (
                                        <div key={`${file.uid || file.name}-${index}`} style={{minWidth: 0, padding: '6px 8px', border: '1px solid #f0f0f0', borderRadius: 6}}>
                                            <Text ellipsis style={{display: 'block'}}>{file.name}</Text>
                                            <Text type="secondary">{formatFileSize(file.size || 0)}</Text>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="confirm-buttons">
                            <Button
                                type="primary"
                                onClick={handleUploadFiles}
                                loading={loading}
                                disabled={fileList.length === 0 || storageState !== 'ready'}
                                style={{marginLeft: 12}}>{fileList.length === 1 ? (t('s3UploadFile') || 'Загрузить файл') : (t('s3UploadFiles') || 'Загрузить файлы')}
                            </Button>
                        </div>

                </div>
            )}

            <Modal open={isModalOpen} onCancel={() => setModalOpen(false)} footer={null} width={700}>
                <Typography.Title
                    style={{fontSize: 16}}>{t('s3ModalWhatIsTitle') || 'Что такое S3 хранилище файлов?'}</Typography.Title>
                <Typography.Paragraph code
                                      style={{whiteSpace: 'pre-wrap'}}>{t('s3ModalWhatIsContent') || 'S3 хранилище — это персональное облачное хранилище файлов...'}</Typography.Paragraph>
            </Modal>
            <Modal open={settingsOpen} title="External S3 storage" onCancel={() => setSettingsOpen(false)} footer={null}>
                <Form form={form} layout="vertical" onFinish={saveExternal}>
                    <Form.Item name="endpoint" label="Endpoint" rules={[{required: true}]}><Input placeholder="https://s3.example.com" /></Form.Item>
                    <Form.Item name="bucket" label="Bucket" rules={[{required: true}]}><Input /></Form.Item>
                    <Form.Item name="region" label="Region" rules={[{required: true}]}><Input placeholder="us-east-1" /></Form.Item>
                    <Form.Item name="access_key" label="Access key" rules={[{required: true}]}><Input /></Form.Item>
                    <Form.Item name="secret_key" label="Secret key" rules={[{required: true}]}><Input.Password /></Form.Item>
                    <Button
                        style={{color:"black"}}
                        type="primary"
                        htmlType="submit"
                        loading={settingsLoading}>Подключить и мигрировать
                    </Button>
                    {config?.storage_type === 'external' && <Button onClick={switchInternal} loading={settingsLoading} style={{marginLeft: 8}}>Вернуть internal</Button>}
                </Form>
            </Modal>
        </>
    );
};

export default S3storage;

