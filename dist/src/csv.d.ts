export class CSV {
    static saveCSV(csvDat?: string, name?: string): void;
    static openCSV(delimiter?: string, onOpen?: (csvDat: any, header: any, path: any) => any): void;
    static openCSVRaw(onOpen?: (csvDat: any, path: any) => any): void;
    constructor(onOpen?: (csvDat?: any[], header?: any[]) => void, saveButtonId?: null, openButtonId?: null);
    onOpen(csvDat?: any[], header?: any[]): void;
    notes: {
        idx: number;
        text: string;
    }[];
    processArraysForCSV(data?: string[], delimiter?: string, header?: string, saveNotes?: boolean): string;
}
export function parseCSVData(data: any, head: any, filename: any, hasend?: boolean, parser?: (lines: any, head: any, filename: any) => {
    filename: any;
    head: any;
}): {
    filename: any;
    head: any;
};
export function processDataForCSV(options?: {}): {
    filename: any;
    header: string;
    body: string;
};
