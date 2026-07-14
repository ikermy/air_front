import {Button, Modal, Switch, List, Typography, Popconfirm, Progress, Tooltip} from "antd";
import React, {useEffect, useState} from "react";
import Title from "antd/lib/typography/Title";
import Paragraph from "antd/lib/typography/Paragraph";
import Upload from "antd/lib/upload/Upload";
import {UploadOutlined, FilePdfOutlined, FileOutlined, DeleteOutlined, FileTextOutlined} from "@ant-design/icons";
import {showWarningNotification, showErrorNotification, showNotification} from "../../hotification/showNotification";
import {useTranslation} from "react-i18next";
import {authFetch} from "../../../utils/easyUtils";

export const UploadFiles = ({onChange, toForm, initialFiles, modelData, setButtonDisabled, provider}) => {
    const {t} = useTranslation();
    const [isModalOpen, setModalOpen] = useState(false);
    const [switchChecked, setSwitchChecked] = useState(false);
    const [fileList, setFileList] = useState([]);
    const [existingFiles, setExistingFiles] = useState([]);
    const maxFiles = 20;
    const maxSize = 50 * 1024 * 1024; // 50 МБ
    const [isSubmitEnabled, setSubmitEnabled] = useState(true);
    const [uploaded, setUploaded] = useState(false);
    const [isAddingFiles, setIsAddingFiles] = useState(false); // Флаг для режима добавления файлов

    // Функции для расчета прогресса использования файлов
    const getFilesPercent = () => {
        const currentCount = existingFiles.length + fileList.length;
        return Math.round((currentCount / maxFiles) * 100);
    };

    const getProgressStatus = () => {
        const percent = getFilesPercent();
        if (percent >= 90) return 'exception';
        if (percent >= 75) return 'active';
        return 'normal';
    };

    // Инициализация существующих файлов при загрузке компонента
    useEffect(() => {
        if (initialFiles && initialFiles.length > 0) {
            setSwitchChecked(true); // Автоматически включаем режим загрузки
            setExistingFiles(initialFiles);
            setUploaded(true); // Устанавливаем флаг, что файлы уже загружены

            // Помещаем данные в форму, если они еще не там
            if (toForm) {
                toForm.setFieldsValue({
                    fileids: initialFiles,
                    search: true
                });
            }
        }
    }, [initialFiles, toForm]);

    const handleSwitchChange = (checked) => {
        setSwitchChecked(checked);

        // Если выключаем switch, сбрасываем режим добавления файлов
        if (!checked) {
            setIsAddingFiles(false);
            setFileList([]);
            setUploaded(false);

            // Обновляем данные формы
            if (toForm) {
                toForm.setFieldsValue({
                    fileids: [],
                    search: false
                });
            }
        } else {
            // Обновляем данные формы
            if (toForm) {
                toForm.setFieldsValue({
                    search: true
                });
            }
        }
    };

    const handleCancel = () => {
        setModalOpen(false)
    };
    const showModal = () => {
        setModalOpen(true);
    };

    const handleFilesUpload = ({fileList: newFileList}) => {
        let validFiles = [...newFileList];

        // Проверка количества файлов
        if (validFiles.length > maxFiles) {
            showWarningNotification(t("warning") || 'Предупреждение', t("uploadFilesWarningLimit") || 'Можно загрузить не более 20 файлов');
            validFiles = validFiles.slice(0, maxFiles);
        }

        // Проверка размера файлов
        validFiles = validFiles.filter(file => {
            if (file.size > maxSize) {
                showWarningNotification(t("warning") || 'Предупреждение', t("uploadFilesWarningSize", {name: file.name}) || `Файл "${file.name}" превышает 50 МБ`);
                return false;
            }
            return true;
        });

        setFileList(validFiles);
        setSubmitEnabled(validFiles.length !== 0);
        if (typeof onChange === "function") {
            onChange({files: validFiles.map(f => f.originFileObj)});
        }
    };

    const handleAddFiles = () => {
        setIsAddingFiles(true);
        setUploaded(false);
    };

    const handleSubmitFiles = async () => {
        setButtonDisabled(false)
        setSubmitEnabled(false);
        if (fileList.length === 0) {
            showWarningNotification(t("warning") || 'Предупреждение', t("uploadFilesWarningSelect") || 'Выберите файлы для загрузки');
            return;
        }

        // Сохраняем файлы, которые успешно загрузились
        const successFiles = [];
        const failedFiles = [];
        const uploadedFilesInfo = [];

        try {
            // Загружаем каждый файл отдельным запросом, используя authFetch
            for (const file of fileList) {
                const formData = new FormData();
                formData.append('file', file.originFileObj);
                formData.append('purpose', 'assistants');

                try {
                    const providerParam = provider ? `?provider=${encodeURIComponent(provider)}` : '';
                    setButtonDisabled(true);
                    const response = await authFetch(`/v1/model/upload-file${providerParam}`, {
                        method: 'POST',
                        body: formData,
                    });

                    if (!response.ok) {
                        throw new Error(t("uploadFilesErrorUploadStatus", {status: response.status}) || `Ошибка загрузки: ${response.status}`);
                    }

                    const result = await response.json();
                    if (result.id) {
                        uploadedFilesInfo.push({name: file.name, id: result.id});
                        successFiles.push(file.name);
                    }
                } catch (error) {
                    console.error(`Ошибка при загрузке файла ${file.name}:`, error);
                    failedFiles.push(file.name);
                    setButtonDisabled(true);
                }
            }

            if (successFiles.length > 0) {
                // Если это добавление файлов к существующей модели
                if (isAddingFiles && modelData) {
                    // Добавляем файлы в модель через /mod-fileadd одним запросом
                    try {
                        const params = new URLSearchParams();
                        if (provider) params.append('provider', provider);
                        const url = `/v1/model/add-file${params.toString() ? `?${params.toString()}` : ''}`;

                        const payload = {
                            files: uploadedFilesInfo.map(fileInfo => ({fileid: fileInfo.id, filename: fileInfo.name}))
                        };

                        const addResponse = await authFetch(url, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(payload),
                        });

                        if (!addResponse.ok) {
                            throw new Error(t("uploadFilesErrorAddStatus", {status: addResponse.status}) || `Ошибка добавления файлов: ${addResponse.status}`);
                        }

                        const addResult = await addResponse.json();

                        if (addResult.status === 'completed') {
                            // Обновляем список существующих файлов только успешно добавленными
                            const successfullyAdded = uploadedFilesInfo.filter(fileInfo =>
                                addResult.success_files && addResult.success_files.includes(fileInfo.name)
                            );

                            if (successfullyAdded.length > 0) {
                                const updatedFiles = [...existingFiles, ...successfullyAdded];
                                setExistingFiles(updatedFiles);

                                // Обновляем данные формы
                                if (toForm) {
                                    toForm.setFieldsValue({fileids: updatedFiles});
                                }

                                showNotification(t("uploadFilesAddedToModel") || "Файлы добавлены в модель:", `${addResult.success_count}`);
                            }

                            // Показываем предупреждения о неуспешных файлах, если есть
                            if (addResult.failed_count > 0) {
                                const failedNames = addResult.failed_files?.map(f => f.filename).join(', ') || (t("uploadFilesUnknownFiles") || 'неизвестные файлы');
                                showErrorNotification(t("uploadFilesFailedToAdd") || "Не удалось добавить файлы:", failedNames);
                            }
                        } else {
                            throw new Error('Неожиданный статус ответа');
                        }
                    } catch (error) {
                        console.error('Ошибка при добавлении файлов в модель:', error);
                        showErrorNotification(t("uploadFilesErrorAddingFiles") || 'Ошибка добавления файлов', error.message);
                    }

                    setIsAddingFiles(false);
                } else {
                    // Обычная загрузка файлов для новой модели
                    showNotification(t("uploadFilesSuccessCount") || "Успешно загружено файлов:", `${successFiles.length}`);

                    // Сохраняем ID загруженных файлов
                    if (toForm) {
                        toForm.setFieldsValue({fileids: uploadedFilesInfo});
                    }

                    // Если функция onChange существует, вызываем её с ID файлов
                    if (typeof onChange === "function") {
                        onChange(uploadedFilesInfo);
                    }
                }

                // Если все файлы загружены успешно, очищаем список
                if (failedFiles.length === 0) {
                    setFileList([]);
                    setSubmitEnabled(true);
                }
                setUploaded(true);
            }

            if (failedFiles.length > 0) {
                showErrorNotification(t("uploadFilesFailedUpload") || "Не удалось загрузить файлы:", `${failedFiles.join(', ')}`);
            }

        } catch (error) {
            console.error('Ошибка при загрузке файлов:', error);
            showErrorNotification(t("uploadFilesErrorGeneral") || 'Произошла ошибка при загрузке файлов', error.message);
        } finally {
            setUploaded(true);
        }

        return uploadedFilesInfo;
    };

    const handleDeleteFile = async (fileToDelete) => {
        try {
            const params = new URLSearchParams();
            if (provider) params.append('provider', provider);
            const url = `/v1/model/delete-file${params.toString() ? `?${params.toString()}` : ''}`;

            const response = await authFetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({file_id: fileToDelete.id}),
            });

            if (!response.ok) {
                throw new Error(t("uploadFilesErrorDeleteStatus", {status: response.status}) || `Ошибка удаления: ${response.status}`);
            }

            // Удаляем файл из списка существующих файлов
            const updatedFiles = existingFiles.filter(file => file.id !== fileToDelete.id);
            setExistingFiles(updatedFiles);

            // Если файлов больше не осталось, выключаем Switch и обновляем форму
            if (updatedFiles.length === 0) {
                setSwitchChecked(false);
                setUploaded(false);

                // Обновляем данные формы
                if (toForm) {
                    toForm.setFieldsValue({fileids: [], search: false});
                }
            } else {
                // Если файлы еще остались, обновляем список в форме
                if (toForm) {
                    toForm.setFieldsValue({fileids: updatedFiles});
                }
            }

            showNotification(t("uploadFilesFileDeleted") || "Файл удалён", fileToDelete.name);

        } catch (error) {
            console.error('Ошибка при удалении файла:', error);
            showErrorNotification(t("uploadFilesErrorDeleteGeneral") || 'Произошла ошибка при удалении файла', error.message);
        }
    };

    const canAddMoreFiles = existingFiles.length + fileList.length < 20;

    return (
        <>
            <div className="section-title">
                <FileTextOutlined/>
                {t("uploadFilesTitle") || "Загрузка файлов"}
            </div>
            <div className="section-description">
                {t("uploadFilesDescription") || "Загрузите документы для обучения агента и расширения его базы знаний"}
            </div>

            <div className="step">
                    <span>
                        {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                        {t("uploadFilesUse") || "Использовать"} <a
                        onClick={showModal}>{t("uploadFilesLink") || "загрузку файлов"}</a>&nbsp;
                    </span>
                <Tooltip
                    title={!modelData ? (t("operatorNeedCreateModel") || "Сначала нужно создать модель!") : ""}
                    placement="top"
                >
                    <Switch
                        checked={switchChecked}
                        checkedChildren={<span style={{color: "black"}}>{t("Yes") || "Да"}</span>}
                        unCheckedChildren={<span style={{color: "black"}}>{t("No") || "Нет"}</span>}
                        onChange={handleSwitchChange}
                        disabled={!modelData}
                    />
                </Tooltip>
            </div>

            {switchChecked && (
                <div className="channel-item">
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '16px'}}>
                        <Typography.Text>{t("uploadFilesUsed") || "Использовано файлов:"} </Typography.Text>
                        <Typography.Text strong>
                            {existingFiles.length + fileList.length} / {maxFiles}
                        </Typography.Text>
                    </div>
                    <Progress
                        percent={getFilesPercent()}
                        status={getProgressStatus()}
                        strokeColor={{
                            '0%': '#52c41a',
                            '75%': '#faad14',
                            '90%': '#ff4d4f',
                        }}
                    />
                    <div style={{marginTop: '16px'}}>
                        <Typography.Text type="secondary">
                            {t("uploadFilesAvailable") || "Доступно:"} {maxFiles - existingFiles.length - fileList.length} {t("uploadFilesAvailableCount", {count: maxFiles - existingFiles.length - fileList.length}) || "файлов"}
                        </Typography.Text>
                    </div>

                    <div className="channel-item-content">

                        {!uploaded && existingFiles.length === 0
                            ?
                            <p>{t("uploadFilesMaxInfo") || "Можно выбрать до 20 файлов, размер одного файла не должен превышать 50 мб"}</p>
                            : uploaded && existingFiles.length === 0 && !isAddingFiles
                                ? <p>{t("uploadFilesSuccessUpload") || "Файлы успешно загружены!"}</p>
                                : null
                        }

                        {/* Отображаем список ранее загруженных файлов */}
                        {existingFiles && existingFiles.length > 0 && (
                            <div style={{marginBottom: '12px'}}>
                                <Typography.Text
                                    strong>{t("uploadFilesPreviouslyUploaded") || "Ранее загруженные файлы:"}</Typography.Text>
                                <List
                                    size="small"
                                    dataSource={existingFiles}
                                    renderItem={file => (
                                        <List.Item
                                            style={{display: 'flex', justifyContent: 'flex-start', paddingLeft: '8px'}}>
                                            {file.name.toLowerCase().endsWith('.pdf') ? (
                                                <FilePdfOutlined
                                                    style={{marginRight: '8px', color: '#e74c3c', flexShrink: 0}}/>
                                            ) : (
                                                <FileOutlined
                                                    style={{marginRight: '8px', color: '#3498db', flexShrink: 0}}/>
                                            )}
                                            <Typography.Text style={{
                                                textAlign: 'left',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis'
                                            }}>
                                                {file.name}
                                            </Typography.Text>
                                            <Popconfirm
                                                title={t("uploadFilesDeleteConfirm") || "Вы уверены, что хотите удалить этот файл?"}
                                                onConfirm={() => handleDeleteFile(file)}
                                                okText={t("Yes") || "Да"}
                                                cancelText={t("No") || "Нет"}
                                                okButtonProps={{style: {color: 'black'}}}
                                            >
                                                <Button
                                                    type="text"
                                                    icon={<DeleteOutlined/>}
                                                    style={{marginLeft: 'auto', color: 'red'}}
                                                />
                                            </Popconfirm>
                                        </List.Item>
                                    )}
                                    style={{width: '100%'}}
                                />

                                {/* Кнопка "Добавить файлы" для существующей модели */}
                                {modelData && canAddMoreFiles && !isAddingFiles && (
                                    <Button
                                        type="default"
                                        onClick={handleAddFiles}
                                        style={{marginTop: '8px'}}
                                    >
                                        {t("uploadFilesAddFiles") || "Добавить файлы"}
                                    </Button>
                                )}
                            </div>
                        )}

                        {(!uploaded || isAddingFiles) && (
                            <Upload
                                multiple
                                accept=".txt,.md,.pdf,.doc,.docx,.pptx,.html,.py,.js,.ts,.java,.cpp,.c,.cs,.rb,.php,.sh,.tex,.css,.json"
                                beforeUpload={() => false}
                                fileList={fileList}
                                onChange={handleFilesUpload}
                            >
                                <Button
                                    icon={<UploadOutlined/>}>{t("uploadFilesSelectFiles2") || "Выбрать файлы"}</Button>
                            </Upload>
                        )
                        }
                    </div>
                    <div className="confirm-buttons">
                        <Button
                            type="primary"
                            disabled={fileList.length === 0 || !isSubmitEnabled}
                            onClick={handleSubmitFiles}
                            style={{marginLeft: 16, marginTop: 8, color: "black"}}
                        >
                            {isAddingFiles
                                ? (fileList.length === 1 ? (t("uploadFilesAddFile") || "Добавить файл") : (t("uploadFilesAddFilesPlural") || "Добавить файлы"))
                                : (fileList.length === 1 ? (t("uploadFilesSendFile") || "Отправить файл") : (t("uploadFilesSendFiles") || "Отправить файлы"))
                            }
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
                    {t("uploadFilesModalWhatIsTitle") || "Для чего нужно дообучение модели?"}
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
                    {t("uploadFilesModalWhatIsText") || `Передача файлов Агенту служит очень практичной цели — это позволяет обогатить разговор конкретной, проверенной информацией из ваших документов. Вот зачем это может понадобиться:
📚 Контекст из ваших данных
Файлы дают возможность ориентироваться не только на общие знания, но и на специфику вашего контента — будь то PDF с технической документацией, Markdown с инструкциями, или текстовая выгрузка из БД.
🔍 Поиск и анализ
Позволит Агенту:
- Извлекать ключевую информацию из длинных файлов
- Отвечать на вопросы вроде "что говорит документ по этому поводу"
- Генерировать резюме или выделять главные моменты
- Сравнивать содержимое нескольких файлов, если вы их загрузите
💡 Автоматизация и ускорение работы
Передавая файлы, вы экономите время на объяснения. Вместо того чтобы копировать-вставлять текст вручную, вы просто загружаете файл, а Агент понимает, как с ним работать.
🤖 Примеры применений
- Загрузили .docx с отчётом → Агент делает краткое резюме и в своих ответах ссылается на него
- Передали .py скрипт → Агент анализирует что делает код и отвечает на вопросы по нему
- Передали .json файл настроек → Агент использует эти параметры в своих рассуждениях`}
                </Paragraph>
                <Title
                    style={{
                        fontSize: '16px',
                        color: 'var(--text-color)',
                    }}>
                    {t("uploadFilesModalFormatsTitle") || "Какие файлы можно использовать?"}
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
                    {t("uploadFilesModalFormatsText") || `📄 Документы и текстовые файлы
- .txt — обычный текст
- .md — Markdown
- .pdf — PDF
- .doc, .docx — Microsoft Word
- .pptx — Microsoft PowerPoint
- .html — HTML-файлы
💻 Код и скрипты
- .py — Python
- .js — JavaScript
- .ts — TypeScript
- .java — Java
- .cpp, .c, .cs — C++, C, C#
- .rb — Ruby
- .php — PHP
- .sh — Shell скрипты
- .tex — LaTeX
- .css — CSS
🧠 Форматы данных
- .json — JSON`}
                </Paragraph>
            </Modal>
        </>
    );
};
