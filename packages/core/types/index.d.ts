export interface EegTariffRecord {
    pk: string;
    sk: string;
    bezeichnung: string;
    energietraeger: string;
    inbetriebnahme: string;
    weitereKriterien?: string;
    anteilige_zuordnung?: string;
    commissioning_date_from?: string;
    commissioning_date_to?: string;
    power_output_from?: number;
    power_output_to?: number;
    einspeiseverguetung?: number;
    anzulegender_wert?: number;
    ausfallverguetung?: number;
    mieterstromzuschlag?: number;
    aufnahmedatum?: string;
}
export interface TariffQuery {
    energyType: string;
    commissioningDate?: string;
    powerOutput?: number;
    criteria?: string;
}
export interface TariffResponse {
    found: boolean;
    records?: EegTariffRecord[];
    error?: string;
    totalCount?: number;
}
export interface EpilotEntity {
    _id: string;
    _schema: string;
    [key: string]: any;
}
export interface EpilotActionConfig {
    app_name: string;
    component_id: string;
    name: string;
    description: string;
    app_id: string;
}
export interface EpilotWebhookData {
    entity: EpilotEntity;
    action_config: EpilotActionConfig;
    resume_token: string;
    callback_post_url: string;
}
export interface EpilotWebhookPayload {
    data: EpilotWebhookData;
    timestamp: string;
    type: string;
}
export interface EpilotCallbackPayload {
    resume_token: string;
}
