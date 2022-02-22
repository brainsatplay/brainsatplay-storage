export function checkFolder(onResponse?: (result: any) => void): void;
export function createDriveFolder(name?: string): void;
export function listDriveFiles(onload?: (files: any) => void): void;
export function backupToDrive(filename: any, directory?: string): void;
