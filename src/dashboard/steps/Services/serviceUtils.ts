import { validateAndRefreshToken } from "../../../utils/easyUtils";

// const LAND_URL = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND) || process.env.REACT_APP_LAND;
const LAND_URL = process.env.REACT_APP_LAND;

export const AvailableServicesList = async (token: string): Promise<string[]> => {
    try {
        const validToken = await validateAndRefreshToken(token);
        if (!validToken) {
            throw new Error("Token validation failed");
        }

        const response = await fetch(`${LAND_URL}/services-list`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${validToken}`,
            },
        });

        if (!response.ok) {
            let errorMessage = `HTTP Error: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch {
                errorMessage = response.statusText || errorMessage;
            }
            throw new Error(errorMessage);
        }

        return await response.json();
    } catch (error) {
        console.error("Error checking services:", error);
        throw error;
    }
};

// "lead-haunter"
export const AddService = async (token, name: string): Promise<void> => {
    try {
        const validToken = await validateAndRefreshToken(token);
        if (!validToken) {
            throw new Error("Token validation failed");
        }

        const response = await fetch(`${LAND_URL}/services-add`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${validToken}`,
            },
            body: JSON.stringify({
                service: name
            }),
        });

        if (!response.ok) {
            let errorMessage = `HTTP Error: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch {
                errorMessage = response.statusText || errorMessage;
            }
            throw new Error(errorMessage);
        }
    } catch (error) {
        console.error("Error adding new service:", error);
        throw error;
    }
};

// "lead-haunter"
export const DelService = async (token, name: string): Promise<void> => {
    try {
        const validToken = await validateAndRefreshToken(token);
        if (!validToken) {
            throw new Error("Token validation failed");
        }

        const response = await fetch(`${LAND_URL}/services-delete`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${validToken}`,
            },
            body: JSON.stringify({
                service: name
            }),
        });

        if (!response.ok) {
            let errorMessage = `HTTP Error: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch {
                errorMessage = response.statusText || errorMessage;
            }
            throw new Error(errorMessage);
        }
    } catch (error) {
        console.error("Error deleting service:", error);
        throw error;
    }
};

