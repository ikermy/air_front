import React, { useState, useEffect } from 'react';
import { List, Avatar, Empty, Tabs, Input, Modal } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const { TabPane } = Tabs;

export const ContactsModal = ({ visible, onClose, contacts: contactsData, onSave, initialSelectedIds = [] }) => {
    const { t } = useTranslation();
    const [selectedIds, setSelectedIds] = useState(
        new Set(initialSelectedIds.map(id => String(id)))
    );
    const [searchText, setSearchText] = useState('');

    useEffect(() => {
        if (visible) {
            setSelectedIds(new Set(initialSelectedIds.map(id => String(id))));
            setSearchText('');
        }
    }, [visible, initialSelectedIds]);

    const handleToggleContact = (contactId) => {
        setSelectedIds(prevSelectedIds => {
            const newSelectedIds = new Set(prevSelectedIds);
            const contactIdStr = String(contactId);

            if (newSelectedIds.has(contactIdStr)) {
                newSelectedIds.delete(contactIdStr);
            } else {
                newSelectedIds.add(contactIdStr);
            }
            return newSelectedIds;
        });
    };

    const handleSearch = (e) => {
        setSearchText(e.target.value.toLowerCase());
    };

    const filterContacts = (contacts) => {
        if (!searchText) return contacts;

        return contacts.filter(contact => {
            const displayName = getDisplayName(contact).toLowerCase();
            const description = getDescription(contact, '').toLowerCase();
            return displayName.includes(searchText) || description.includes(searchText);
        });
    };

    const handleOk = () => {
        onSave(Array.from(selectedIds));
        onClose();
    };

    const categoryTitles = {
        humans: t("contactTypeHumans") || 'Пользователи',
        bots: t("contactTypeBots") || 'Боты',
        channels: t("contactTypeChannels") || 'Каналы',
        groups: t("contactTypeGroups") || 'Группы',
        supergroups: t("contactTypeSupergroups") || 'Супергруппы',
    };

    const availableCategories = Object.keys(categoryTitles)
        .filter(key => contactsData && Array.isArray(contactsData[key]) && contactsData[key].length > 0);

    const hasContacts = availableCategories.length > 0;

    const getAvatar = (contact) => {
        const name = contact.firstName || contact.title || contact.username || '?';
        const initials = name.charAt(0).toUpperCase();
        return <Avatar className="contact-avatar">{initials}</Avatar>;
    };

    const getDisplayName = (contact) => {
        if (contact.firstName || contact.lastName) {
            return `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
        }
        return contact.title || contact.username || 'Без имени';
    };

    const getDescription = (contact, categoryKey) => {
        if (contact.phone) return contact.phone;
        if (contact.username) return `@${contact.username}`;

        let typeLabel = '';
        switch (categoryKey) {
            case 'humans': typeLabel = t("contactTypeUser") || 'Пользователь'; break;
            case 'bots': typeLabel = t("contactTypeBot") || 'Бот'; break;
            case 'channels': typeLabel = t("contactTypeChannel") || 'Канал'; break;
            case 'groups': typeLabel = t("contactTypeGroup") || 'Группа'; break;
            case 'supergroups': typeLabel = t("contactTypeSupergroup") || 'Супергруппа'; break;
            default: typeLabel = t("contactTypeLabel") || 'Контакт';
        }
        return `${typeLabel} ID: ${contact.id}`;
    };

    return (
        <Modal
            title={t("contactsModalTitle") || "Выберите контакты для Агента"}
            open={visible}
            onCancel={onClose}
            onOk={handleOk}
            okText={t("save") || "Сохранить"}
            cancelText={t("channelsCancelButton") || "Отмена"}
            width={700}
            className="tg-contact"
            okButtonProps={{ style: { color: "black" } }}
        >
            {/* Компонент поиска */}
            <Input
                placeholder={t("contactsModalPlaceholder") || "Поиск контактов..."}
                prefix={<SearchOutlined />}
                onChange={handleSearch}
                value={searchText}
                style={{ marginBottom: 16 }}
                allowClear
            />

            <div className="contacts-modal-content" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                {hasContacts ? (
                    <Tabs defaultActiveKey={availableCategories[0]}>
                        {availableCategories.map((categoryKey) => {
                            const filteredContacts = filterContacts(contactsData[categoryKey]);
                            return (
                                <TabPane
                                    tab={`${categoryTitles[categoryKey]} (${filteredContacts.length}/${contactsData[categoryKey].length})`}
                                    key={categoryKey}
                                >
                                    {filteredContacts.length > 0 ? (
                                        <List
                                            itemLayout="horizontal"
                                            dataSource={filteredContacts}
                                            renderItem={(contact) => {
                                                const isSelected = selectedIds.has(String(contact.id));
                                                return (
                                                    <List.Item
                                                        key={`${categoryKey}-${contact.id}`}
                                                        onClick={() => handleToggleContact(contact.id)}
                                                        className={`contact-list-item ${isSelected ? 'selected-contact-item' : ''}`}
                                                    >
                                                        <List.Item.Meta
                                                            avatar={getAvatar(contact)}
                                                            title={getDisplayName(contact)}
                                                            description={getDescription(contact, categoryKey)}
                                                        />
                                                    </List.Item>
                                                );
                                            }}
                                        />
                                    ) : (
                                        <Empty description={t("contactsModalNotFound") || "Ничего не найдено"} />
                                    )}
                                </TabPane>
                            );
                        })}
                    </Tabs>
                ) : (
                    <Empty description={t("contactsModalEmpty") || "Список контактов пуст или еще не загружен."} />
                )}
            </div>
        </Modal>
    );
};

