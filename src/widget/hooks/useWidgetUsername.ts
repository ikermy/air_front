import {useEffect, useRef, useState} from 'react';
import {fetchWidgetUsername} from "../widgetUtils";

interface UseWidgetUsernameOptions {
    token: string | null;
    connected?: boolean;
    setToken: (token: string) => void;
    setUserName: (name: string | null) => void;
}

export function useWidgetUsername({token, connected, setToken, setUserName}: UseWidgetUsernameOptions) {
    const [isLoading, setIsLoading] = useState(false);
    const fetchedToken = useRef<string | null>(null);

    useEffect(() => {
        if (!connected || !token || fetchedToken.current === token) return;
        fetchedToken.current = token;
        setIsLoading(true);

        void fetchWidgetUsername({token, setToken, setUserName})
            .catch((error) => console.error('Ошибка при загрузке имени пользователя:', error))
            .finally(() => setIsLoading(false));
    }, [connected, setToken, setUserName, token]);

    return {isLoading};
}
