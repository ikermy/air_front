import { authFetch } from "../../../utils/easyUtils";


export async function totpSetup(): Promise<Response> {
    return authFetch(`/v1/totp/setup`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    });
}


export async function totpConfirm(code: string): Promise<Response> {
    return authFetch(`/v1/totp/confirm`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
    });
}


export async function totpDisable(code: string): Promise<Response> {
    return authFetch(`/v1/totp`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
    });
}

// POST /auth/totp — Второй шаг входа: ввод TOTP-кода
export async function authTotp(totpToken: string, code: string): Promise<Response> {
    return authFetch(`/v1/auth/totp`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ totp_token: totpToken, code }),
    });
}
