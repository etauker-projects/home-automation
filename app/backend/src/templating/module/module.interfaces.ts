export interface Module {
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

export interface TemplateFile extends TemplateMetadata {
    content: string;
}

export interface EntityMetadata {
    id: string;
    templateId: string;
    type: string;
    managed: boolean;
    variables: { [key: string]: string };
}

export interface EntityFile extends EntityMetadata {
    content: string;
}