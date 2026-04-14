import type { AxiosInstance } from "axios";
interface AxiosClientOpts {
    baseURL?: string;
    token: string;
}
export declare const configureClient: <ClientType extends AxiosInstance>(client: ClientType, opts: AxiosClientOpts) => ClientType;
export {};
