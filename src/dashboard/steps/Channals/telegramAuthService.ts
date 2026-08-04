import { getAuthToken } from "../../../utils/easyUtils";

type Translator = (key: string) => string;
type AuthParams = { appId: string | number; appHash: string; phone: string };
type Callbacks = {
  onQrCode?: (payload: unknown) => void;
  onPasswordRequest?: () => void;
  onSuccess?: () => void;
  onError?: (message: string) => void;
  onUpdateToken?: () => void;
};

export class TelegramAuthService {
  private socket: WebSocket | null = null;
  private authParams: { app_id: number; app_hash: string; phone: string } | null = null;
  private readonly t: Translator;
  private callbacks: Callbacks = {};

  constructor(t?: Translator) { this.t = t ?? ((key) => key); }

  setCallbacks(callbacks: Callbacks): void { this.callbacks = { ...this.callbacks, ...callbacks }; }

  async startAuthentication(params: AuthParams): Promise<boolean> {
    try {
      const token = getAuthToken();
      if (!token) { this.callbacks.onUpdateToken?.(); return false; }
      this.authParams = { app_id: Number.parseInt(String(params.appId), 10), app_hash: params.appHash, phone: params.phone };
      this.connectWebSocket(token);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.callbacks.onError?.(`${this.t("telegramAuthStartError") || "Ошибка запуска аутентификации:"} ${message}`);
      throw error;
    }
  }

  private connectWebSocket(token: string): void {
    const devEnvoy = window.location.port === "3001";
    const wsUrl = devEnvoy
      ? "wss://localhost/v1/ws/tguser"
      : `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/v1/ws/tguser`;
    const socket = new WebSocket(wsUrl, [token]);
    this.socket = socket;
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as { type: string; payload?: unknown };
        switch (data.type) {
          case "request_auth_data": this.authParams ? socket.send(JSON.stringify({ type: "auth_data", ...this.authParams })) : this.callbacks.onError?.(this.t("telegramAuthParamsNotFound")); break;
          case "qr_code": this.callbacks.onQrCode?.(data.payload); break;
          case "need_password": this.callbacks.onPasswordRequest?.(); break;
          case "success": this.callbacks.onSuccess?.(); break;
          case "error": this.callbacks.onError?.(String(data.payload ?? "")); break;
          default: this.callbacks.onError?.(String(data.payload ?? this.t("telegramAuthUnknownError")));
        }
      } catch { this.callbacks.onError?.(this.t("telegramAuthProcessError")); }
    };
    socket.onerror = () => this.callbacks.onError?.(this.t("telegramAuthWebSocketError"));
  }

  submitPassword(password: string): void {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify({ type: "password", password }));
    else this.callbacks.onError?.(this.t("telegramAuthWebSocketInactive"));
  }

  closeConnection(): void { this.socket?.close(); this.socket = null; this.authParams = null; }
}
