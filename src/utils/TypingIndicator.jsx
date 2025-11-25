import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTypingAnimation } from './useTypingAnimation';

export function TypingIndicator({ isTyping, intervalTime, name }) {
    const { t } = useTranslation();
    const typingAnimation = useTypingAnimation(isTyping, intervalTime);

    let content = '';
    switch (typingAnimation) {
        case 0:
            content = `${name} ${t('ChatWindow-typing')}&nbsp;<b>.&nbsp;</b><i>.&nbsp;</i><i>.&nbsp;</i>`;
            break;
        case 1:
            content = `${name} ${t('ChatWindow-typing')}&nbsp;<i>.&nbsp;</i><b>.&nbsp;</b><i>.&nbsp;</i>`;
            break;
        case 2:
            content = `${name} ${t('ChatWindow-typing')}&nbsp;<i>.&nbsp;</i><i>.&nbsp;</i><b>.&nbsp;</b>`;
            break;
        default:
            content = '';
    }

    return <div className="typing-indicator" dangerouslySetInnerHTML={{ __html: content }} />;
}
