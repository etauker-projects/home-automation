export type TableColumn<T extends { [key: string]: any }> = {
    key: keyof TableRow<T>;
    label: string;
} | {
    key: 'actions';
    label: string;
}

export type TableRow<T extends { [key: string]: any }> = {
    [K in keyof T]: T[K];
};

export interface TableData<T extends { [key: string]: any }> {
    columns: TableColumn<T>[];
    rows: TableRow<T>[];
    actions: TableAction<T>[];
}

export interface TableAction<T extends { [key: string]: any }> {
    key: string;
    label: string;
    // icon?: string;
    handle: (row: TableRow<T>) => void;
    enabled: (row: TableRow<T>) => boolean;
}
