export function formatTgubotData(data: unknown, uids: string | string[]): string {
    const parsedData = typeof data === 'string' ? JSON.parse(data) : (data || {});
    const options = parsedData?.options || {};
    const normalizedToken = typeof parsedData?.token === 'string'
        ? parsedData.token
        : parsedData?.token ? JSON.stringify(parsedData.token) : '';

    return JSON.stringify({
        ...parsedData,
        token: normalizedToken,
        options: {...options, uids: Array.isArray(uids) ? uids.join(' ') : (uids || '')},
    });
}

export function formatWhatsBotData(data: unknown, uids: string | string[]): string {
    const dataObject = typeof data === 'string' ? JSON.parse(data) : data;
    return JSON.stringify({
        ...dataObject,
        Uids: Array.isArray(uids) ? uids.join(' ') : (uids || ''),
    });
}
