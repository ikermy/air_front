import OpenAILogo from '../../../assets/img/openai-logo.svg';
import MistralAILogo from '../../../assets/img/mistral-ai-logo.png';
import GeminiLogo from '../../../assets/img/gemini-logo.png';

/**
 * Единый список AI-провайдеров проекта.
 * Импортируйте AI_PROVIDERS или getProviderInfo везде, где нужны данные о провайдерах.
 */
export const AI_PROVIDERS = [
    {
        key: 'openai',
        name: 'OpenAI',
        logo: OpenAILogo,
        color: '#10a37f',
        description: 'ChatGPT, GPT-4, GPT-5',
    },
    {
        key: 'mistral',
        name: 'MistralAI',
        logo: MistralAILogo,
        color: '#f88500',
        description: 'Voxtral, Magistral, Mistral',
    },
    {
        key: 'google',
        name: 'Gemini',
        logo: GeminiLogo,
        color: '#1092ff',
        description: 'Gemini 3 Pro, Nano Banana',
    },
];

/**
 * Возвращает данные провайдера по его ключу/названию.
 * Поддерживает алиасы: openai -> openai, mistralai -> mistral, gemini -> google.
 * @param {string} providerName
 * @returns {{ key: string, name: string, logo: string|null, color: string, description: string }}
 */
export const getProviderInfo = (providerName) => {
    const key = providerName?.toLowerCase().replace(/\s+/g, '');
    const aliases = { openai: 'openai', mistralai: 'mistral', gemini: 'google' };
    const resolved = aliases[key] || key;
    return AI_PROVIDERS.find(p => p.key === resolved) || {
        key: resolved || 'unknown',
        name: providerName || 'Unknown provider',
        logo: null,
        color: '#666',
        description: '',
    };
};
