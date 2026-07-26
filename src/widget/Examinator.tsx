import {useContext, useEffect} from 'react';
import {UserContext} from '../UserContext';
import {getOrSetUserId} from '../utils/getOrSetUserId';

export interface ExaminatorProps {
    examId: string;
    setToken: (token: string) => void;
    setIsTokenLoading?: (loading: boolean) => void;
}

export function Examinator({examId, setToken, setIsTokenLoading}: ExaminatorProps) {
    const contextUserId = useContext(UserContext);
    const responderId = contextUserId || getOrSetUserId();

    useEffect(() => {
        const checkPermission = async () => {
            try {
                const response = await fetch('/demo/exam', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({a: examId, c: responderId}),
                });

                if (response.ok) {
                    const data = await response.json() as {token?: string};
                    if (data.token) setToken(data.token);
                }
            } catch (error) {
                console.error('Error:', error);
            } finally {
                setIsTokenLoading?.(false);
            }
        };

        void checkPermission();
    }, [examId, responderId, setIsTokenLoading, setToken]);

    return null;
}
