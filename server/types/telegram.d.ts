declare module 'node-telegram-bot-api' {
  export interface TelegramBotOptions {
    polling?: boolean | {
      interval?: number;
      autoStart?: boolean;
      params?: {
        timeout?: number;
        limit?: number;
        offset?: number;
      };
    };
    baseApiUrl?: string;
    filepath?: boolean;
    badRejection?: boolean;
    request?: any;
    onlyFirstMatch?: boolean;
    request_timeout?: number;
    disable_notification?: boolean;
    disable_web_page_preview?: boolean;
    parse_mode?: string;
    protect_content?: boolean;
    allow_sending_without_reply?: boolean;
  }

  export interface SendMessageOptions {
    parse_mode?: string;
    disable_web_page_preview?: boolean;
    disable_notification?: boolean;
    reply_to_message_id?: number;
    reply_markup?: any;
  }

  export default class TelegramBot {
    constructor(token: string, options?: TelegramBotOptions);
    sendMessage(chatId: string | number, text: string, options?: SendMessageOptions): Promise<any>;
    getMe(): Promise<any>;
    setWebHook(url: string, options?: any): Promise<any>;
    deleteWebHook(): Promise<any>;
    getWebHookInfo(): Promise<any>;
    getUpdates(options?: any): Promise<any>;
    processUpdate(update: any): void;
    on(event: string, listener: (...args: any[]) => void): this;
    startPolling(options?: any): Promise<any>;
    stopPolling(options?: any): Promise<any>;
  }
}