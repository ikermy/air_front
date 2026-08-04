import {Button, Modal, Switch, List, Typography, Popconfirm, Progress, Tooltip, Input, Space, Spin} from "antd";
import React, {useEffect, useState, useCallback} from "react";
import Title from "antd/lib/typography/Title";
import Paragraph from "antd/lib/typography/Paragraph";
import {DeleteOutlined, FileTextOutlined, PlusOutlined, CopyOutlined, CheckOutlined} from "@ant-design/icons";
import {showWarningNotification, showErrorNotification, showNotification} from "../../hotification/showNotification";
import { uploadEmbedding, listUserDocuments, deleteDocument } from "./embUtils";
import {useTranslation} from "react-i18next";


// Типы и интерфейсы, ранее в embUtils.ts
export interface DocumentMetadata {
  source?: string;
  createdAt?: string;
  [key: string]: any;
}

export interface UploadEmbeddingResponse {
  success: boolean;
  doc_id: string;
  message: string;
}

export interface Document {
  id: string;
  name: string;
  content?: string;
  metadata?: DocumentMetadata;
  createdAt?: string;
  [key: string]: any;
}

export interface ListDocumentsResponse {
  success: boolean;
  documents: Document[];
  count: number;
}

interface EmbeddingProps {
  onChange?: (documents: Document[]) => void;
  toForm?: any;
  initialDocuments?: Document[];
  modelData?: any;
  provider?: string;
  onEmbeddingChange?: () => void; // Callback для автоматического обновления модели
}

export const Embedding: React.FC<EmbeddingProps> = ({
  onChange,
  toForm,
  initialDocuments = [],
  modelData,
  provider,
  onEmbeddingChange
}) => {
  const {t} = useTranslation();
  const [isModalOpen, setModalOpen] = useState(false);
  const [switchChecked, setSwitchChecked] = useState(false);
  const [textContent, setTextContent] = useState("");
  const [docName, setDocName] = useState("");
  const [existingDocuments, setExistingDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitEnabled, setSubmitEnabled] = useState(true);
  const [uploaded, setUploaded] = useState(false);
  const [isAddingDocs, setIsAddingDocs] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const maxCharacters = 65000;


  // Получение списка документов при загрузке
  const fetchDocuments = useCallback(async () => {
    if (!provider) {
      setExistingDocuments([]);
      return;
    }
    try {
      setLoadingDocs(true);

      const response: ListDocumentsResponse = await listUserDocuments(provider);
      if (response.success && response.documents) {
        setExistingDocuments(response.documents);

        // Обновляем форму, если она существует
        if (toForm && toForm.getFieldsValue) {
          toForm.setFieldsValue({
            embedding_docs: response.documents,
            embedding_enabled: response.documents.length > 0,
            search: response.documents.length > 0  // search = true если есть документы
          });
        }
      } else if (response.success) {
        // Документов нет - это нормально, не ошибка
        setExistingDocuments([]);
        if (toForm && toForm.getFieldsValue) {
          toForm.setFieldsValue({
            embedding_docs: [],
            embedding_enabled: false,
            search: false
          });
        }
      }
    } catch (error) {
      // При ошибке загрузки просто показываем пустой список
      // Это может быть временная проблема с сетью/сервером, но не критическая
      console.error("Ошибка при загрузке документов:", error);
      setExistingDocuments([]);
      if (toForm && toForm.getFieldsValue) {
        toForm.setFieldsValue({
          embedding_docs: [],
          embedding_enabled: false,
          search: false
        });
      }
    } finally {
      setLoadingDocs(false);
    }
  }, [toForm, t, provider]);

  // Инициализация при загрузке компонента
  useEffect(() => {
    // Если есть initialDocuments, используем их
    if (initialDocuments && initialDocuments.length > 0) {
      setSwitchChecked(true);
      setExistingDocuments(initialDocuments);
      setUploaded(true);

      // Обновляем форму только если она уже создана
      setTimeout(() => {
        if (toForm && toForm.getFieldsValue) {
          toForm.setFieldsValue({
            embedding_docs: initialDocuments,
            embedding_enabled: true,
            search: true
          });
        }
      }, 0);
    }
    // Если modelData.search === true ИЛИ есть embedding_docs (для Google модели), включаем switch и загружаем документы
    else if (modelData?.search === true || (modelData?.embedding_docs && modelData.embedding_docs.length > 0)) {
      setSwitchChecked(true);
      fetchDocuments();

      // Обновляем форму только если она уже создана
      setTimeout(() => {
        if (toForm && toForm.getFieldsValue) {
          toForm.setFieldsValue({
            embedding_enabled: true,
            search: true
          });
        }
      }, 0);
    }
    // Если switch уже был включён вручную, загружаем документы
    else if (switchChecked) {
      fetchDocuments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSwitchChange = (checked: boolean) => {
    setSwitchChecked(checked);

    if (!checked) {
      setIsAddingDocs(false);
      setTextContent("");
      setDocName("");
      setUploaded(false);

      if (toForm && toForm.getFieldsValue) {
        toForm.setFieldsValue({
          embedding_docs: [],
          embedding_enabled: false,
          search: false  // Выключаем search при выключении эмбеддингов
        });
      }
    } else {
      // Загружаем документы при включении
      fetchDocuments();

      if (toForm && toForm.getFieldsValue) {
        toForm.setFieldsValue({
          embedding_enabled: true,
          search: true  // Включаем search при включении эмбеддингов
        });
      }
    }
  };

  const handleCancel = () => {
    setModalOpen(false);
  };

  const showModal = () => {
    setModalOpen(true);
  };

  // Валидация текста
  const validateText = useCallback((): boolean => {
    if (!textContent.trim()) {
      showWarningNotification(t("warning") || "Предупреждение", t("embeddingPleaseEnterText") || "Пожалуйста, введите текст");
      return false;
    }

    if (textContent.length > maxCharacters) {
      showWarningNotification(
        t("warning") || "Предупреждение",
        t("embeddingTextExceedsMax", { max: maxCharacters, current: textContent.length }) || `Текст не должен превышать ${maxCharacters} знаков. Сейчас: ${textContent.length}`
      );
      return false;
    }

    if (!docName.trim()) {
      showWarningNotification(t("warning") || "Предупреждение", t("embeddingPleaseEnterName") || "Пожалуйста, введите название документа");
      return false;
    }

    return true;
  }, [textContent, docName, t]);

  // Загрузка эмбеддинга
  const handleSubmitText = useCallback(async () => {
    if (!provider) {
      console.warn("Embedding: provider is required before uploading documents");
      return;
    }
    if (!validateText()) {
      return;
    }

    try {
      setLoading(true);
      setSubmitEnabled(false);

      const metadata: DocumentMetadata = {
        source: "text_input",
        createdAt: new Date().toISOString(),
        characterCount: textContent.length
      };

      const response: UploadEmbeddingResponse = await uploadEmbedding(
        provider,
        docName,
        textContent,
        metadata
      );

      if (response.success) {
        showNotification(t("success") || "Успешно", t("embeddingDocumentUploaded", { name: docName }) || `Документ "${docName}" загружен`);

        // Очищаем форму
        setTextContent("");
        setDocName("");
        setSubmitEnabled(true);

        // Перезагружаем список документов
        await fetchDocuments();
        setUploaded(true);
        setIsAddingDocs(false);

        // Вызываем callback
        if (typeof onChange === "function") {
          const updatedDocs = [...existingDocuments, { id: response.doc_id, name: docName, content: textContent, metadata }];
          onChange(updatedDocs);
        }

        // Вызываем callback для автоматического обновления модели
        if (typeof onEmbeddingChange === "function") {
          onEmbeddingChange();
        }
      }
    } catch (error) {
      console.error("Ошибка при загрузке эмбеддинга:", error);
      showErrorNotification(
        t("embeddingUploadError") || "Ошибка загрузки",
        error instanceof Error ? error.message : t("embeddingUploadFailed") || "Не удалось загрузить документ"
      );
      setSubmitEnabled(true);
    } finally {
      setLoading(false);
    }
  }, [validateText, textContent, docName, provider, onChange, onEmbeddingChange, existingDocuments, fetchDocuments, t]);

  // Удаление документа
  const handleDeleteDocument = useCallback(async (docToDelete: Document) => {
    try {
      await deleteDocument(docToDelete.id, provider);

      const updatedDocs = existingDocuments.filter(doc => doc.id !== docToDelete.id);
      setExistingDocuments(updatedDocs);

      // Обновляем форму
      if (toForm && toForm.getFieldsValue) {
        toForm.setFieldsValue({
          embedding_docs: updatedDocs,
          embedding_enabled: updatedDocs.length > 0,
          search: updatedDocs.length > 0  // search = false если документов больше нет
        });
      }

      // Выключаем switch если документов больше нет
      if (updatedDocs.length === 0) {
        setSwitchChecked(false);
        setUploaded(false);
        setIsAddingDocs(false);
        setTextContent("");
        setDocName("");
      }

      showNotification(t("embeddingDeleted") || "Удалено", t("embeddingDocumentDeleted", { name: docToDelete.name }) || `Документ "${docToDelete.name}" удален`);

      // Вызываем callback
      if (typeof onChange === "function") {
        onChange(updatedDocs);
      }

      // Вызываем callback для автоматического обновления модели
      if (typeof onEmbeddingChange === "function") {
        onEmbeddingChange();
      }
    } catch (error) {
      console.error("Ошибка при удалении документа:", error);
      showErrorNotification(
        t("embeddingDeleteError") || "Ошибка удаления",
        error instanceof Error ? error.message : t("embeddingDeleteFailed") || "Не удалось удалить документ"
      );
    }
  }, [provider, existingDocuments, toForm, onChange, onEmbeddingChange, t]);

  // Копирование ID документа в буфер обмена
  const handleCopyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      showNotification(t("embeddingCopied") || "Скопировано", t("embeddingIdCopied") || "ID документа скопирован в буфер обмена");

      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      showErrorNotification(t("error") || "Ошибка", t("embeddingCopyFailed") || "Не удалось скопировать ID");
    }
  };

  // Добавление новых документов
  const handleAddDocuments = () => {
    setIsAddingDocs(true);
    setUploaded(false);
  };

  const characterCount = textContent.length;
  const characterPercent = Math.round((characterCount / maxCharacters) * 100);
  const characterStatus = characterCount > maxCharacters ? "exception" : characterCount > maxCharacters * 0.8 ? "active" : "normal";

  // Если provider не передан, ничего не рендерим
  if (!provider) {
    console.error('Embedding: provider is required');
    return null;
  }

  return (
    <>
      <div className="section-title">
        <FileTextOutlined />
        {t("embeddingTitle") || "Эмбеддинги текстов"}
      </div>
      <div className="section-description">
        {t("embeddingDescription") || "Загрузите текстовые фрагменты для контекстного обучения модели"}
      </div>

      <div className="step">
        <span>
          {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
          {t("embeddingUseInModel") || "Использовать текстовые эмбеддинги"} <a onClick={showModal}>{t("embeddingInModel") || "в моделе"}</a>&nbsp;
        </span>
        <Tooltip
          title={!modelData ? t("operatorNeedCreateModel") || "Сначала нужно создать модель!" : ""}
          placement="top"
        >
          <Switch
            checked={switchChecked}
            checkedChildren={<span style={{ color: "black" }}>{t("Yes") || "Да"}</span>}
            unCheckedChildren={<span style={{ color: "black" }}>{t("No") || "Нет"}</span>}
            onChange={handleSwitchChange}
            disabled={!modelData}
          />
        </Tooltip>
      </div>

      {switchChecked && (
        <Spin spinning={loadingDocs}>
          <div className="channel-item">
            <div className="channel-item-content">
            {/* Загруженные документы */}
            {existingDocuments && existingDocuments.length > 0 && (
              <div style={{ marginBottom: "16px" }}>
                <Typography.Text strong>{t("embeddingLoadedDocuments") || "Загруженные документы"} ({existingDocuments.length}):</Typography.Text>
                <List
                  size="small"
                  dataSource={existingDocuments}
                  renderItem={(doc: Document) => (
                    <List.Item
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        paddingLeft: "8px",
                        paddingRight: "8px"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", flex: 1, overflow: "hidden" }}>
                        <FileTextOutlined
                          style={{
                            marginRight: "8px",
                            color: "#1890ff",
                            flexShrink: 0
                          }}
                        />
                        <div style={{ flex: 1, overflow: "hidden" }}>
                          <Typography.Text
                            ellipsis
                            style={{
                              display: "block",
                              maxWidth: "100%"
                            }}
                          >
                            {doc.name}
                          </Typography.Text>
                          <Typography.Text
                            type="secondary"
                            style={{ fontSize: "12px" }}
                          >
                            ID: {doc.id}
                          </Typography.Text>
                        </div>
                      </div>

                      <Space size="small" style={{ flexShrink: 0, marginLeft: "8px" }}>
                        <Tooltip title={t("embeddingCopyId") || "Скопировать ID"}>
                          <Button
                            type="text"
                            size="small"
                            icon={copiedId === doc.id ? <CheckOutlined /> : <CopyOutlined />}
                            onClick={() => handleCopyId(doc.id)}
                            style={{
                              color: copiedId === doc.id ? "#52c41a" : "inherit"
                            }}
                          />
                        </Tooltip>

                        <Popconfirm
                          title={t("embeddingDeleteConfirmTitle") || "Вы уверены?"}
                          description={t("embeddingDeleteConfirmDesc") || "Вы действительно хотите удалить этот документ?"}
                          onConfirm={() => handleDeleteDocument(doc)}
                          okText={t("Yes") || "Да"}
                          cancelText={t("No") || "Нет"}
                          okButtonProps={{ style: { color: "black" } }}
                        >
                          <Button
                            type="text"
                            size="small"
                            icon={<DeleteOutlined />}
                            style={{ color: "red" }}
                          />
                        </Popconfirm>
                      </Space>
                    </List.Item>
                  )}
                  style={{ width: "100%" }}
                />

                {/* Кнопка добавления документов */}
                {!isAddingDocs && (
                  <Button
                    type="default"
                    icon={<PlusOutlined />}
                    onClick={handleAddDocuments}
                    style={{ marginTop: "8px" }}
                  >
                    {t("embeddingAddDocument") || "Добавить документ"}
                  </Button>
                )}
              </div>
            )}

            {/* Форма загрузки текста */}
            {(!uploaded || isAddingDocs) && (
              <>
                {/* Название документа */}
                <div style={{ marginBottom: "12px" }}>
                  <Typography.Text strong>{t("embeddingDocumentName") || "Название документа"}:</Typography.Text>
                  <Input
                    placeholder={t("embeddingDocumentNamePlaceholder") || "Например: 'Инструкция по настройке' или 'FAQ'"}
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    disabled={loading}
                    maxLength={100}
                    style={{ marginTop: "4px" }}
                  />
                </div>

                {/* Текстовое содержимое */}
                <div style={{ marginBottom: "12px" }}>
                  <Typography.Text strong>{t("embeddingDocumentText") || "Текст документа"}:</Typography.Text>
                  <Typography.Text type="secondary" style={{ display: "block", fontSize: "12px" }}>
                    {t("embeddingMaxCharacters") || "Максимум"} {maxCharacters} {t("embeddingCharacters") || "знаков"}
                  </Typography.Text>
                  <Input.TextArea
                    placeholder={t("embeddingTextPlaceholder") || "Введите текст для эмбеддинга..."}
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    disabled={loading}
                    rows={6}
                    maxLength={maxCharacters + 1}
                    style={{ marginTop: "4px" }}
                  />
                  <div style={{ marginTop: "8px", display: "flex", justifyContent: "space-between" }}>
                    <Typography.Text type="secondary">
                      {t("embeddingUsed") || "Использовано"}: {characterCount} / {maxCharacters} {t("embeddingCharacters") || "знаков"}
                    </Typography.Text>
                    {characterCount > 0 && (
                      <Progress
                        type="circle"
                        percent={characterPercent}
                        size={30}
                        status={characterStatus}
                        strokeColor={{
                          "0%": "#52c41a",
                          "80%": "#faad14",
                          "100%": "#ff4d4f"
                        }}
                      />
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Сообщение когда документы заполнены */}
            {uploaded && existingDocuments.length > 0 && !isAddingDocs && (
              <p>
                ✓ {t("embeddingDocumentsLoaded") || "Документы успешно загружены!"}
              </p>
            )}
            {/* Кнопка отправки */}
            <div className="confirm-buttons">
              {(!uploaded || isAddingDocs) && (
                <Button
                  type="primary"
                  disabled={!textContent.trim() || !docName.trim() || loading || characterCount > maxCharacters || !isSubmitEnabled}
                  onClick={handleSubmitText}
                  loading={loading}
                  style={{ marginLeft: 16, marginTop: 8, color: "black" }}
                >
                  {isAddingDocs ? t("embeddingAddDocument") || "Добавить документ" : t("embeddingUploadDocument") || "Загрузить документ"}
                </Button>
              )}
            </div>
            </div>
          </div>
        </Spin>
      )}

      {/* Информационный модал */}
      <Modal
        open={isModalOpen}
        onCancel={handleCancel}
        footer={null}
        width={700}
      >
        <Title style={{ fontSize: "16px" }}>
          {t("embeddingModalTitle") || "Для чего нужны текстовые эмбеддинги?"}
        </Title>
        <Paragraph
          code={true}
          style={{
            whiteSpace: "pre-wrap",
            display: "block",
            fontSize: "14px",
            lineHeight: "1.6"
          }}
        >
          {t("embeddingModalContent") || `📚 Контекстное обучение без фин-тюнинга
Текстовые эмбеддинги позволяют добавить специфичную информацию в контекст модели без длительного дообучения.

🔍 Применение эмбеддингов:
- Загружаете инструкции → модель использует их в ответах
- Загружаете FAQ → модель ищет ответы в загруженном контексте
- Загружаете документацию → модель цитирует и ссылается на её

💡 Преимущества:
- Быстрая загрузка (не требует дообучения)
- Легко обновлять информацию
- Можно использовать для разных моделей
- Безопасно (исходный текст хранится отдельно)

⚙️ Технические детали:
- Каждый документ преобразуется в векторное представление (эмбеддинг)
- При обработке запроса модель находит релевантные фрагменты
- Модель использует найденный контекст для формирования ответа

📊 Рекомендации по использованию:
- Один документ = один логически завершённый фрагмент
- До 65,000 символов на один документ
- Используйте понятные названия для поиска`}
        </Paragraph>
      </Modal>
    </>
  );
};
