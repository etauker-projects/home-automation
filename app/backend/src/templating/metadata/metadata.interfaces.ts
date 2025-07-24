export interface Metadata {
    modules: ModuleMetadata[];
}

export interface ModuleMetadata {
    id: string;
    key: string;
    name: string;
    description: string;
    templates?: TemplateMetadata[];
    entities?: EntityMetadata[];
}

export interface TemplateMetadata {
    id: string;
    type: string;
}

export interface EntityMetadata {
    id: string;
    templateId: string;
    type: string;
    managed: boolean;
    variables: { [key: string]: string };
}

export interface Identifier {
    id: string;
    type: string;
    moduleId: string;
    moduleKey: string;
}

export interface MetaResponse<T> {
    id: Identifier;
    value?: T;
}
