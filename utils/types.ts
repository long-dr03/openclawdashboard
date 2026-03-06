export interface AgentConfig {
    id: string;
    identity?: {
        name?: string;
        [key: string]: unknown;
    };
    workspace?: string;
    model?: string;
    enabled?: boolean;
    [key: string]: unknown;
}

export interface SessionData {
    updatedAt: number;
    model?: string;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    lastChannel?: string;
    sessionId?: string;
    [key: string]: unknown;
}

export interface AppConfig {
    agents?: {
        list?: AgentConfig[];
        defaults?: {
            model?: {
                primary?: string;
                [key: string]: unknown;
            };
            [key: string]: unknown;
        };
    };
    bindings?: unknown[];
    channels?: {
        telegram?: {
            accounts?: Record<string, unknown>;
            botToken?: string;
            [key: string]: unknown;
        };
        [key: string]: unknown;
    };
    skills?: {
        entries?: Record<string, unknown>;
    };
    models?: {
        providers?: Record<string, unknown>;
    };
    _googleIntegration?: {
        clientId?: string;
        clientSecret?: string;
        hasTokens?: boolean;
    };
    [key: string]: unknown;
}
