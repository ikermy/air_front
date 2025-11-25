import React, { useState, useEffect } from 'react';
import { List, Avatar, Empty, Tabs, Input, Modal } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import "./Chanels.css";

const { TabPane } = Tabs;

export const ContactsModal = ({ visible, onClose, contacts: contactsData, onSave, initialSelectedIds = [] }) => {
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

    const availableCategories = Object.keys(categoryTitles)
        .filter(key => contactsData && Array.isArray(contactsData[key]) && contactsData[key].length > 0);

    const hasContacts = availableCategories.length > 0;

    return (
        <Modal
            title="Выберите контакты для Ассистента"
            open={visible}
            onCancel={onClose}
            onOk={handleOk}
            okText="Сохранить выбор"
            cancelText="Отмена"
            width={700}
            className="tg-contact"
            okButtonProps={{ style: { color: "black" } }}
        >
            {/* Компонент поиска */}
            <Input
                placeholder="Поиск контактов..."
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
                                        <Empty description="Ничего не найдено" />
                                    )}
                                </TabPane>
                            );
                        })}
                    </Tabs>
                ) : (
                    <Empty description="Список контактов пуст или еще не загружен." />
                )}
            </div>
        </Modal>
    );
};

// Оставшиеся вспомогательные функции
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
        case 'humans': typeLabel = 'Пользователь'; break;
        case 'bots': typeLabel = 'Бот'; break;
        case 'channels': typeLabel = 'Канал'; break;
        case 'groups': typeLabel = 'Группа'; break;
        case 'supergroups': typeLabel = 'Супергруппа'; break;
        default: typeLabel = 'Контакт';
    }
    return `${typeLabel} ID: ${contact.id}`;
};

// Заголовки для категорий
const categoryTitles = {
    humans: 'Пользователи',
    bots: 'Боты',
    channels: 'Каналы',
    groups: 'Группы',
    supergroups: 'Супергруппы',
};