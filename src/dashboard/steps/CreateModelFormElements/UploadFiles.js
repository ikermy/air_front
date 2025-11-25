import {Button, Modal, Switch, List, Typography, Popconfirm, Progress} from "antd";
import React, {useEffect, useState} from "react";
import Title from "antd/lib/typography/Title";
import Paragraph from "antd/lib/typography/Paragraph";
import Upload from "antd/lib/upload/Upload";
import {UploadOutlined, FilePdfOutlined, FileOutlined, DeleteOutlined, FileTextOutlined} from "@ant-design/icons";
import {showWarningNotification, showErrorNotification, showNotification} from "../../hotification/showNotification";
import {validateAndRefreshToken} from "../../../utils/easyUtils";

export const UploadFiles = ({onChange, toForm, initialFiles, modelData, setButtonDisabled}) => {
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
            showWarningNotification('Можно загрузить не более 20 файлов');
            validFiles = validFiles.slice(0, maxFiles);
        }

        // Проверка размера файлов
        validFiles = validFiles.filter(file => {
            if (file.size > maxSize) {
                showWarningNotification(`Файл "${file.name}" превышает 50 МБ`);
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
            showWarningNotification('Выберите файлы для загрузки');
            return;
        }

        // Сохраняем файлы, которые успешно загрузились
        const successFiles = [];
        const failedFiles = [];
        const uploadedFilesInfo = [];

        try {
            const LAND_URL = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND) || process.env.REACT_APP_LAND;
            const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
            if (token != null) {
                // Загружаем каждый файл отдельным запросом
                for (const file of fileList) {
                    const formData = new FormData();
                    formData.append('file', file.originFileObj);
                    formData.append('token', token); // token должен быть доступен в компоненте
                    formData.append('purpose', 'assistants');

                    try {
                        const response = await fetch(`${LAND_URL}/mod-fileup`, {
                            method: 'POST',
                            body: formData,
                        });
                        setButtonDisabled(true);
                        if (!response.ok) {
                            throw new Error(`Ошибка загрузки: ${response.status}`);
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
                    // Задержка между запросами для предотвращения перегрузки сервера
                    await new Promise(resolve => setTimeout(resolve, 510));
                }

                if (successFiles.length > 0) {
                    // Если это добавление файлов к существующей модели
                    if (isAddingFiles && modelData) {
                        // Добавляем файлы в модель через /mod-fileadd одним запросом
                        try {
                            const addResponse = await fetch(`${LAND_URL}/mod-fileadd`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    token: token,
                                    files: uploadedFilesInfo.map(fileInfo => ({
                                        fileid: fileInfo.id,
                                        filename: fileInfo.name
                                    }))
                                }),
                            });

                            if (!addResponse.ok) {
                                throw new Error(`Ошибка добавления файлов: ${addResponse.status}`);
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

                                    showNotification("Файлы добавлены в модель:", `${addResult.success_count}`);
                                }

                                // Показываем предупреждения о неуспешных файлах, если есть
                                if (addResult.failed_count > 0) {
                                    const failedNames = addResult.failed_files?.map(f => f.filename).join(', ') || 'неизвестные файлы';
                                    showErrorNotification("Не удалось добавить файлы:", failedNames);
                                }
                            } else {
                                throw new Error('Неожиданный статус ответа');
                            }
                        } catch (error) {
                            console.error('Ошибка при добавлении файлов в модель:', error);
                            showErrorNotification('Ошибка добавления файлов', error.message);
                        }

                        setIsAddingFiles(false);
                    } else {
                        // Обычная загрузка файлов для новой модели
                        showNotification("Успешно загружено файлов:", `${successFiles.length}`);

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
                    showErrorNotification("Не удалось загрузить файлы:", `${failedFiles.join(', ')}`);
                }
            } else {
                showErrorNotification("Ошибка загрузки", "Токен не обновлен!");
                setUploaded(true);
                setButtonDisabled(true)
                return;
            }

        } catch (error) {
            console.error('Ошибка при загрузке файлов:', error);
            showErrorNotification('Произошла ошибка при загрузке файлов', error.message);
        } finally {
            setUploaded(true);
        }

        return uploadedFilesInfo;
    };

    const handleDeleteFile = async (fileToDelete) => {
        try {
            const LAND_URL = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND) || process.env.REACT_APP_LAND;
            const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
            if (token != null) {
                // Отправляем запрос на удаление файла
                const response = await fetch(`${LAND_URL}/mod-filedel`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({file_id: fileToDelete.id, token}),
                });

                if (!response.ok) {
                    throw new Error(`Ошибка удаления: ${response.status}`);
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
                        toForm.setFieldsValue({
                            fileids: [],
                            search: false
                        });
                    }
                } else {
                    // Если файлы еще остались, обновляем список в форме
                    if (toForm) {
                        toForm.setFieldsValue({fileids: updatedFiles});
                    }
                }

                showNotification("Файл удалён", fileToDelete.name);
            } else {
                showErrorNotification("Ошибка удаления", "Токен не обновлен!");
            }

        } catch (error) {
            console.error('Ошибка при удалении файла:', error);
            showErrorNotification('Произошла ошибка при удалении файла', error.message);
        }
    };

    const canAddMoreFiles = existingFiles.length + fileList.length < 20;

    return (
        <>
            <div className="section-title">
                <FileTextOutlined />
                Файлы для дообучения
            </div>
            <div className="section-description">
                Загрузите документы для обогащения знаний модели специфической информацией
            </div>

            <div className="step">
                    <span>
                        {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                        Загрузка файлов для дообучения <a onClick={showModal}>модели</a>&nbsp;
                    </span>
                <Switch
                    checked={switchChecked}
                    checkedChildren={<span style={{color: "black"}}>Да</span>}
                    unCheckedChildren={<span style={{color: "black"}}>Нет</span>}
                    onChange={handleSwitchChange}
                />
            </div>

            {switchChecked && (
                <div className="channel-item">
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '16px'}}>
                        <Typography.Text>Использовано файлов: </Typography.Text>
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
                            Доступно: {maxFiles - existingFiles.length - fileList.length} файлов
                        </Typography.Text>
                    </div>

                    <div className="channel-item-content">

                        {!uploaded && existingFiles.length === 0
                            ? <p>Можно выбрать до 20 файлов, размер одного файла не должен превышать 50 мб</p>
                            : uploaded && existingFiles.length === 0 && !isAddingFiles
                                ? <p>Файлы успешно загружены!</p>
                                : null
                        }

                        {/* Отображаем список ранее загруженных файлов */}
                        {existingFiles && existingFiles.length > 0 && (
                            <div style={{marginBottom: '12px'}}>
                                <Typography.Text strong>Ранее загруженные файлы:</Typography.Text>
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
                                                title="Вы уверены, что хотите удалить этот файл?"
                                                onConfirm={() => handleDeleteFile(file)}
                                                okText="Да"
                                                cancelText="Нет"
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
                                        Добавить файлы
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
                                <Button icon={<UploadOutlined/>}>Выбрать файлы</Button>
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
                                ? (fileList.length === 1 ? "Добавить файл" : "Добавить файлы")
                                : (fileList.length === 1 ? "Отправить файл" : "Отправить файлы")
                            }
                        </Button>
                    </div>
                </div>
            )}

            <Modal
                // title="Дообучение модели а ваших данных"
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
                    "Для чего нужно дообучение модели?"
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
                    Передача файлов Ассистенту служит очень практичной цели — это позволяет обогатить разговор
                    конкретной,
                    проверенной информацией из ваших документов. Вот зачем это может понадобиться:{'\n'}
                    📚 Контекст из ваших данных
                    Файлы дают возможность ориентироваться не только на общие знания, но и на специфику вашего контента
                    — будь то PDF
                    с технической документацией, Markdown с инструкциями, или текстовая выгрузка из БД.{'\n'}
                    🔍 Поиск и анализ{'\n'}
                    Позволит Ассистенту:{'\n'}
                    - Извлекать ключевую информацию из длинных файлов{'\n'}
                    - Отвечать на вопросы вроде “что говорит документ по этому поводу”{'\n'}
                    - Генерировать резюме или выделять главные моменты{'\n'}
                    - Сравнивать содержимое нескольких файлов, если вы их загрузите{'\n'}
                    💡 Автоматизация и ускорение работы{'\n'}
                    Передавая файлы, вы экономите время на объяснения. Вместо того чтобы копировать-вставлять текст
                    вручную, вы просто загружаете файл, а Ассистент понимает, как с ним работать.{'\n'}
                    🤖 Примеры применений{'\n'}
                    - Загрузили .docx с отчётом → Ассистент делает краткое резюме и в своих ответах ссылается на
                    него{'\n'}
                    - Передали .py скрипт → Ассистент анализирует что делает код и отвечает на вопросы по нему{'\n'}
                    - Передали .json файл настроек → Ассистент использует эти параметры в своих рассуждениях{'\n'}
                </Paragraph>
                <Title
                    style={{
                        fontSize: '16px',
                        color: 'var(--text-color)',
                    }}>
                    "Какие файлы можно использовать?"
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
                    📄 Документы и текстовые файлы{'\n'}
                    - .txt — обычный текст{'\n'}
                    - .md — Markdown{'\n'}
                    - .pdf — PDF{'\n'}
                    - .doc, .docx — Microsoft Word{'\n'}
                    - .pptx — Microsoft PowerPoint{'\n'}
                    - .html — HTML-файлы{'\n'}
                    💻 Код и скрипты{'\n'}
                    - .py — Python{'\n'}
                    - .js — JavaScript{'\n'}
                    - .ts — TypeScript{'\n'}
                    - .java — Java{'\n'}
                    - .cpp, .c, .cs — C++, C, C#{'\n'}
                    - .rb — Ruby{'\n'}
                    - .php — PHP{'\n'}
                    - .sh — Shell скрипты{'\n'}
                    - .tex — LaTeX{'\n'}
                    - .css — CSS{'\n'}
                    🧠 Форматы данных{'\n'}
                    - .json — JSON
                </Paragraph>
            </Modal>
        </>
    );
};
