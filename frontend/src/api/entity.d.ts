export declare const getEntityClient: (token: string) => import("@epilot/entity-client").Client;
export declare const getEntity: (params: {
    slug: string;
    id: string;
    token: string;
}) => Promise<import("@epilot/entity-client").Paths.GetEntity.Responses.$200>;
