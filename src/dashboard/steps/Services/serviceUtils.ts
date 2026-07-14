import { authFetch } from "../../../utils/easyUtils";

// Refactor to return Responses for withTokenRefresh compatibility
export const AvailableServicesList = async (): Promise<Response> => {
    return authFetch(`/v1/services/list`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });
};

export const AddService = async (name: string): Promise<Response> => {
    return authFetch(`/v1/services/add`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            service: name
        }),
    });
};

export const DelService = async (name: string): Promise<Response> => {
    return authFetch(`/v1/services/delete`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            service: name
        }),
    });
};
