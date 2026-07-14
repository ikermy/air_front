import {Button, List, Typography, Progress, Spin, Switch, Modal, Popconfirm, Upload} from "antd";
import React, {useEffect, useState, useCallback} from "react";
import {FileOutlined, FilePdfOutlined, CloudOutlined, DeleteOutlined, UploadOutlined} from "@ant-design/icons";
import {showErrorNotification, showNotification, showWarningNotification} from "../../hotification/showNotification";
import {authFetch} from "../../../utils/easyUtils";
import Title from "antd/lib/typography/Title";
import Paragraph from "antd/lib/typography/Paragraph";
import {useTranslation} from "react-i18next";

const { Text } = Typography;

export const S3Files = ({ onChange, initialS3Enabled, value }) => {
    const {t} = useTranslation();
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    // Используем контролируемый/неконтролируемый режим
    const isControlled = value !== undefined;
    const [internalValue, setInternalValue] = useState(initialS3Enabled || false);
    // Актуальное значение - либо из формы (контролируемый), либо внутреннее (неконтролируемый)
    const showS3Files = isControlled ? value : internalValue;
    const [isModalOpen, setModalOpen] = useState(false); // Состояние для модального окна
    const [fileList, setFileList] = useState([]); // Список файлов для загрузки
    const [isSubmitEnabled, setSubmitEnabled] = useState(true); // Состояние кнопки загрузки
    const [storageInfo, setStorageInfo] = useState({
        available_storage: 0,
        total_storage: 0,
        used_storage: 0
    });

    const fetchS3Files = useCallback(async () => {
        setLoading(true);
        try {
            const response = await authFetch(`/v1/s3/files`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                throw new Error(`${t("s3GetFilesErrorDesc") || "Ошибка получения файлов:"} ${response.status}`);
            }

            const result = await response.json();

            setFiles(result.files || []);
            setStorageInfo({
                available_storage: result.available_storage || 0,
                total_storage: result.total_storage || 0,
                used_storage: result.used_storage || 0
            });

        } catch (error) {
            console.error('Ошибка при получении файлов S3:', error);
            showErrorNotification(t("s3GetFilesError") || 'Ошибка получения файлов', error.message);
        } finally {
            setLoading(false);
        }
    }, [t]); // Добавляем t в зависимости

    // Загрузка файлов из S3 при включении Switch
    useEffect(() => {
        if (showS3Files) {
            fetchS3Files();
        }
    }, [showS3Files, fetchS3Files]);

    // Инициализация для неконтролируемого режима
    useEffect(() => {
        if (!isControlled && initialS3Enabled !== undefined) {
            const initialValue = initialS3Enabled;
            setInternalValue(initialValue);

            // Передаем начальное значение в форму
            if (typeof onChange === "function") {
                onChange(initialValue);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Выполняем только при монтировании компонента

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Б';
        const k = 1024;
        const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getStoragePercent = () => {
        if (storageInfo.total_storage === 0) return 0;
        return Math.round((storageInfo.used_storage / storageInfo.total_storage) * 100);
    };

    const getProgressStatus = () => {
        const percent = getStoragePercent();
        if (percent >= 90) return 'exception';
        if (percent >= 75) return 'active';
        return 'normal';
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return t("s3UnknownDate") || 'Неизвестно';
        const date = new Date(timestamp * 1000);
        return date.toLocaleString('ru-RU');
    };

    const handleCancel = () => {
        setModalOpen(false);
    };

    const showModal = () => {
        setModalOpen(true);
    };

    const handleDeleteFile = async (fileName) => {
        setLoading(true);
        try {
            const response = await authFetch(`/v1/s3/delete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ file_name: fileName }),
            });

            if (!response.ok) {
                throw new Error(`${t("s3DeleteFileErrorStatus") || "Ошибка удаления файла:"} ${response.status}`);
            }

            const result = await response.json();

            // Обновляем информацию о хранилище из ответа сервера
            if (result.available_storage !== undefined && result.total_storage !== undefined && result.used_storage !== undefined) {
                setStorageInfo({
                    available_storage: result.available_storage,
                    total_storage: result.total_storage,
                    used_storage: result.used_storage
                });
            }

            showNotification(t("s3FileDeleted") || "Файл удален", t("s3FileDeletedDesc", {fileName}) || `Файл "${fileName}" успешно удален`);

             // Обновляем список файлов
            fetchS3Files();

        } catch (error) {
            console.error('Ошибка при удалении файла S3:', error);
            showErrorNotification(t("s3DeleteFileError") || 'Ошибка удаления файла', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUploadChange = (info) => {
        // Копируем список из события
        let newFileList = [...info.fileList];

        // Удаляем дубликаты по имени+размеру, сохраняя порядок (последние выбранные остаются последними)
        const seen = new Set();
        const dedupedReversed = [];
        for (let i = newFileList.length - 1; i >= 0; i--) {
            const f = newFileList[i];
            const key = `${f.name}_${f.size}`;
            if (!seen.has(key)) {
                seen.add(key);
                dedupedReversed.push(f);
            }
        }
        let deduped = dedupedReversed.reverse();

        // Ограничиваем до 10 файлов, если больше — оставляем последние 10 и показываем предупреждение
        if (deduped.length > 10) {
            deduped = deduped.slice(-10);
            showWarningNotification(t("warning") || 'Предупреждение', t("s3UploadLimit") || 'Можно загрузить не более 10 файлов одновременно');
        }

        setFileList(deduped);
        setSubmitEnabled(deduped.length > 0);
    };

    const handleUploadFiles = async () => {
        if (fileList.length === 0) {
            showWarningNotification(t("warning") || 'Предупреждение', t("s3SelectFilesWarning") || 'Выберите файлы для загрузки');
            return;
        }

        setLoading(true);
        try {
            // Формируем FormData для отправки файлов
            const formData = new FormData();
            fileList.forEach(file => {
                formData.append('files', file.originFileObj);
            });

            const response = await authFetch(`/v1/s3/upload`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`${t("s3UploadFilesErrorStatus") || "Ошибка загрузки файлов:"} ${response.status}`);
            }

            const result = await response.json();

            // Обновляем информацию о хранилище из ответа сервера
            if (result.available_storage !== undefined && result.total_storage !== undefined && result.used_storage !== undefined) {
                setStorageInfo({
                    available_storage: result.available_storage,
                    total_storage: result.total_storage,
                    used_storage: result.used_storage
                });
            }

            // Показываем результаты загрузки
            if (result.uploaded_count > 0) {
                showNotification(t("s3FilesUploaded") || "Файлы загружены", t("s3FilesUploadedDesc", {count: result.uploaded_count, total: fileList.length}) || `Успешно загружено ${result.uploaded_count} из ${fileList.length} файлов`);
            }

            if (result.skipped_count > 0) {
                const skippedNames = result.skipped_files?.map(f => f.filename).join(', ') || (t("s3UnknownFiles") || 'неизвестные файлы');
                showWarningNotification(t("s3FilesSkipped") || "Часть файлов пропущена", t("s3FilesSkippedDesc", {names: skippedNames}) || `Не удалось загрузить: ${skippedNames}`);
            }

            // Очищаем список выбранных файлов и обновляем список файлов
            setFileList([]);

            fetchS3Files();

        } catch (error) {
            showErrorNotification(t("s3UploadFilesError") || 'Ошибка загрузки файлов', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleS3Switch = (checked) => {

        // В неконтролируемом режиме обновляем внутреннее состояние
        if (!isControlled) {
            setInternalValue(checked);
        }

        // Всегда вызываем onChange для передачи значения в форму
        if (typeof onChange === "function") {
            onChange(checked);
        }
    };

    return (
        <>
            <div className="section-title">
                <CloudOutlined />
                {t("s3Title") || "Файлы S3"}
            </div>
            <div className="section-description">
                {t("s3Description") || "Подключите облачное хранилище для расширенной работы с файлами"}
            </div>

            <div className="step">
                <span>
                    {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                    {t("s3UseStorage") || "Использовать"} <a onClick={showModal}>{t("s3StorageLink") || "S3 хранилище"}</a>&nbsp;
                </span>
                <Switch
                    checked={showS3Files}
                    checkedChildren={<span style={{color: "black"}}>{t("Yes") || "Да"}</span>}
                    unCheckedChildren={<span style={{color: "black"}}>{t("No") || "Нет"}</span>}
                    onChange={handleS3Switch}
                />
            </div>

            {showS3Files && (
                <div className="channel-item">
                    {/* Индикатор использования хранилища */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <Typography.Text>{t("s3StorageUsed") || "Использовано хранилища:"} </Typography.Text>
                        <Typography.Text strong>
                            {formatFileSize(storageInfo.used_storage)} / {formatFileSize(storageInfo.total_storage)}
                        </Typography.Text>
                    </div>
                    <Progress
                        percent={getStoragePercent()}
                        status={getProgressStatus()}
                        strokeColor={{
                            '0%': '#52c41a',
                            '75%': '#faad14',
                            '90%': '#ff4d4f',
                        }}
                    />
                    <div style={{ marginTop: '16px' }}>
                        <Typography.Text type="secondary">
                            {t("s3StorageAvailable") || "Доступно:"} {formatFileSize(storageInfo.available_storage)}
                        </Typography.Text>
                    </div>

                    <div className="channel-item-content">
                        {/* Список файлов */}
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '40px' }}>
                                <Spin size="large" />
                                <div style={{ marginTop: '16px' }}>
                                    <Text>{t("s3LoadingFiles") || "Загрузка файлов..."}</Text>
                                </div>
                            </div>
                        ) : files.length === 0 ? (
                            <p>{t("s3NoFiles") || "В вашем S3 хранилище пока нет файлов. Загрузите файлы для использования в диалоге."}</p>
                        ) : (
                            <div>
                                <div style={{ marginBottom: '12px' }}>
                                    <Typography.Text strong>{t("s3FilesInStorage") || "Файлы в хранилище"} ({files.length}):</Typography.Text>
                                </div>
                                <List
                                    size="small"
                                    dataSource={files}
                                    renderItem={file => (
                                        <List.Item
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'flex-start',
                                                paddingLeft: '8px'
                                            }}
                                        >
                                            {file.name.toLowerCase().endsWith('.pdf') ? (
                                                <FilePdfOutlined style={{ marginRight: '8px', color: '#e74c3c', flexShrink: 0 }} />
                                            ) : (
                                                <FileOutlined style={{ marginRight: '8px', color: '#3498db', flexShrink: 0 }} />
                                            )}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <Typography.Text style={{
                                                    textAlign: 'left',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis'
                                                }}>
                                                    {file.name}
                                                </Typography.Text>
                                                <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
                                                    <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                                                        {formatFileSize(file.size)}
                                                    </Typography.Text>
                                                    <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                                                        {formatDate(file.modified)}
                                                    </Typography.Text>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto' }}>
                                                <Button
                                                    type="link"
                                                    size="small"
                                                    onClick={() => window.open(file.url, '_blank')}
                                                    style={{ marginLeft: '8px', flexShrink: 0 }}
                                                >
                                                    {t("s3OpenFile") || "Открыть"}
                                                </Button>
                                                <Popconfirm
                                                    title={t("s3DeleteFileConfirm") || "Вы уверены, что хотите удалить этот файл?"}
                                                    onConfirm={() => handleDeleteFile(file.name)}
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
                                        </List.Item>
                                    )}
                                    style={{
                                        width: '100%',
                                        maxHeight: '430px',
                                        overflowY: 'auto',
                                        borderRadius: '6px',
                                    }}
                                />
                            </div>
                        )}

                        {/* Загрузка файлов в S3 */}
                        <Upload
                            multiple
                            fileList={fileList}
                            onChange={handleUploadChange}
                            beforeUpload={() => false}
                            showUploadList={false}
                        >
                            <Button icon={<UploadOutlined />}>
                                {t("s3SelectFiles") || "Выбрать файлы для загрузки"}
                            </Button>
                        </Upload>
                    </div>

                    <div className="confirm-buttons">
                        <Button
                            type="primary"
                            onClick={handleUploadFiles}
                            loading={loading}
                            disabled={fileList.length === 0 || !isSubmitEnabled}
                            style={{ marginLeft: 16, marginTop: 8, color: "black" }}
                        >
                            {fileList.length === 1 ? (t("s3UploadFile") || "Загрузить файл") : (t("s3UploadFiles") || "Загрузить файлы")}
                        </Button>
                    </div>
                </div>
            )}

            <Modal
                open={isModalOpen}
                onCancel={handleCancel}
                footer={null}
                width={700}
            >
                <Title
                    style={{
                        fontSize: '16px',
                        color: 'var(--text-color)',
                    }}>
                    {t("s3ModalWhatIsTitle") || "Что такое S3 хранилище файлов?"}
                </Title>
                <Paragraph
                    code={true}
                    style={{
                        whiteSpace: 'pre-wrap',
                        display: 'block',
                        fontSize: '16px',
                        color: 'var(--text-color)',
                    }}
                >
                    {t("s3ModalWhatIsContent") || "S3 хранилище — это персональное облачное хранилище файлов, которое позволяет модели агента получать доступ к вашим документам и отправлять их в зависимости от запросов пользователя. Это мощный инструмент для работы с файлами в диалоге.\n☁️ Основные возможности S3 хранилища:\n- Безопасное хранение ваших файлов в облаке\n- Автоматическая отправка файлов по запросу пользователя\n- Поддержка различных форматов документов\n📤 Как модель использует S3 хранилище:\nКогда пользователь просит определенный файл, модель может:\n- Найти нужный файл в вашем S3 хранилище\n- Автоматически отправить файл\n- Предоставить информацию о файле (размер, дата изменения)\n- Предложить альтернативные файлы, если точного совпадения нет"}
                </Paragraph>
                <Title
                    style={{
                        fontSize: '16px',
                        color: 'var(--text-color)',
                    }}>
                    {t("s3ModalExamplesTitle") || "Примеры использования"}
                </Title>
                <Paragraph
                    code={true}
                    style={{
                        whiteSpace: 'pre-wrap',
                        display: 'block',
                        fontSize: '16px',
                        color: 'var(--text-color)',
                    }}
                >
                    {t("s3ModalExamplesContent") || "📋 Автоматическая отправка документов:\nПользователь: \"Пришли мне последний отчет по продажам\"\n→ Модель найдет файл \"отчет_продажи_март2026.pdf\" и отправит документ\n📊 Работа с презентациями:\nПользователь: \"Нужна презентация о новом продукте\"\n→ Модель найдет \"презентация_продукт_2026.pptx\" и предоставит доступ\n📄 Отправка инструкций:\nПользователь: \"Как настроить систему?\"\n→ Модель отправит \"инструкция_настройка.pdf\" из вашего хранилища\n📈 Аналитические данные:\nПользователь: \"Покажи данные за квартал\"\n→ Модель найдет соответствующий Excel файл и отправит его"}
                </Paragraph>
                <Title
                    style={{
                        fontSize: '16px',
                        color: 'var(--text-color)',
                    }}>
                    {t("s3ModalAdvantagesTitle") || "Преимущества S3 хранилища"}
                </Title>
                <Paragraph
                    code={true}
                    style={{
                        whiteSpace: 'pre-wrap',
                        display: 'block',
                        fontSize: '16px',
                        color: 'var(--text-color)',
                    }}
                >
                    {t("s3ModalAdvantagesContent") || "✅ Автоматизация работы с файлами:\n- Не нужно искать файлы вручную\n- Модель сама найдет и отправит нужный документ\n- Экономия времени на отправку файлов\n- Умный поиск по названиям файлов\n🔒 Безопасность и контроль:\n- Файлы доступны только вам и вашей модели\n- Защищенное хранение в облаке\n- Контроль размера хранилища\n- Возможность удаления ненужных файлов\n🚀 Улучшение пользовательского опыта:\n- Быстрая отправка документов по запросу\n- Автоматическое предложение релевантных файлов\n- Интеграция с диалогом модели\n- Поддержка различных форматов файлов"}
                </Paragraph>
                <Title
                    style={{
                        fontSize: '16px',
                        color: 'var(--text-color)',
                    }}>
                    {t("s3ModalWhenTitle") || "Когда использовать S3 хранилище?"}
                </Title>
                <Paragraph
                    code={true}
                    style={{
                        whiteSpace: 'pre-wrap',
                        display: 'block',
                        fontSize: '16px',
                        color: 'var(--text-color)',
                    }}
                >
                    {t("s3ModalWhenContent") || "✅ Включайте S3 хранилище, если:\n- Вам нужно автоматически отправлять файлы пользователям\n- У вас есть документы, которые часто запрашивают\n- Вы хотите автоматизировать работу с файлами\n- Нужно предоставлять доступ к отчетам и презентациям\n- Работаете с базой знаний и документацией\n❌ Можно не включать, если:\n- Вы не планируете отправлять файлы через модель\n- Работаете только с текстовыми ответами\n- У вас нет файлов для хранения\n⚠️ Важно помнить:\nS3 хранилище имеет ограничения по объему. Следите за использованием места и удаляйте ненужные файлы для оптимальной работы."}
                </Paragraph>
            </Modal>
        </>
    );
};
