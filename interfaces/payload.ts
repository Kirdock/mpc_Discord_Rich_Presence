export interface Payload {
    state?: string;
    details?: string;
    buttons?: {label: string; url: string }[];
    instance?: boolean;
    startTimestamp?: number;
    endTimestamp?: number;
    largeImageKey?: string;
    largeImageText?: string;
    smallImageKey?: string;
    smallImageText?: string;
    partySize?: number;
    partyId?: string;
    partyMax?: number;
    matchSecret?: string;
    joinSecret?: string;
    spectateSecret?: string;
}