export interface TableColumn<T extends { [key: string]: any }> {
    key: keyof TableRow<T>;
    label: string;
}

export type TableRow<T extends { [key: string]: any }> = {
    [K in keyof T]: T[K];
};

export interface TableData<T extends { [key: string]: any }> {
    columns: TableColumn<T>[];
    rows: TableRow<T>[];
}

// export interface TableAction {
//     label: string;
//     icon?: string;
//     action: (row: TableRow) => void;
// }
