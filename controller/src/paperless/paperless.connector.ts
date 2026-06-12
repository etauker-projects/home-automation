import { RestConnector } from '../framework/rest/rest.connector.js';
import { Semaphore } from '../backup/semaphore.js';
import { mkdir } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import * as https from 'https';

interface PaperlessCorrespondent {
    id: number;
    slug: string;
    name: string;
    match: string;
    matching_algorithm: number;
    is_insensitive: boolean;
    document_count: number;
    owner: number;
    user_can_change: boolean;
}

interface PaperlessDocumentType {
    id: number;
    slug: string;
    name: string;
    match: string;
    matching_algorithm: number;
    is_insensitive: boolean;
    document_count: number;
    owner: number;
    user_can_change: boolean;
}

interface PaperlessTag {
    id: number;
    slug: string;
    name: string;
    color: string;
    text_color: string;
    match: string;
    matching_algorithm: number;
    is_insensitive: boolean;
    is_inbox_tag: boolean;
    document_count: number;
    owner: number;
    user_can_change: boolean;
    parent: any | null;
    children: any[];
}

interface PaperlessCustomField {
    id: number;
    name: string;
    data_type: string;
    extra_data: { select_options: any[], default_currency: null | 'EUR' };
    document_count: number;
}

interface PaperlessIterator {
    count: number;
    next?: string | null;
    previous?: string | null;
    all: number[]; // IDs
}

interface PaperlessResult {
    id: number; // ID
    correspondent: number; // ID
    document_type: number; // ID
    storage_path: number; // ID
    title: string;
    content: string;
    tags: number[]; // IDs
    created: string;
    created_date: string;
    modified: string;
    added: string;
    deleted_at?: string | null;
    archive_serial_number?: string | null;
    original_file_name: string;
    archived_file_name: string;
    owner: number;
    user_can_change: boolean;
    is_shared_by_requester: boolean;
    notes: any[];
    custom_fields: {
        value: string;
        field: number; // ID
    }[];
    page_count: number;
    mime_type: string;
}

interface PaperlessMetadata extends PaperlessIterator {
    results: PaperlessResult[];
}

/**
 * Paperless result with enhanced metadata, e.g. with linked IDs resolved to actual values.
 */
interface EnhancedResult {
    paperlessId: number;
    title: string;
    // content: string;
    correspondent?: string;
    documentType?: string;
    // storagePath?: string;
    tags: string[];
    archiveSerialNumber?: string | null;
    created: string;
    // original_file_name: string;
    // archived_file_name: string;
    // owner: string;
    notes: any[];
    customFields: { [key: string]: string };
    pageCount: number;
    mimeType: string;
    path: string;
}

interface DownloadResult {
    document: EnhancedResult;
    filePath?: string;
    success: boolean;
    error?: string;
}

interface DownloadSummary {
    total: number;
    successful: number;
    failed: number;
    results: DownloadResult[];
}

export class PaperlessConnector {

    private host: string = 'https://paperless.office.etauker.com';
    private connector: RestConnector;
    private semaphore: Semaphore;

    constructor(private downloadDirectory: string, private token: string) {
        this.connector = new RestConnector(this.host);
        this.semaphore = new Semaphore(4);
    }

    // TODO: these should be fetched from the API and cached, with a TTL
    private correspondents: { [key: number]: string } = {};
    private documentTypes: { [key: number]: string } = {};
    // private storagePaths: { [key: number]: string } = {};
    private customFields: { [key: string]: string } = {};
    private tags: { [key: number]: string } = {};
    // private users: { [key: number]: string } = {};

    public async list(page: number = 1): Promise<EnhancedResult[]> {
        console.log(`Fetching documents (page ${page})`);
        const changedSince = '2024-01-01'; // TODO: make configurable
        const original = await this.searchDocuments(changedSince, page);

        if (original.results.length === 0) {
            console.log('No documents found.');
            return [];
        }

        console.log(`Processing (page ${page})`);
        const results = await Promise.all(original.results.map(res => this.enhanceResult(res)));
        const upstream = original.next ? await this.list(page + 1) : [];

        console.log(`Done (page ${page})`);
        return [...results, ...upstream];
    }

    public async searchDocuments(changedSince: string, page: number): Promise<PaperlessMetadata> {

        const response = await this.connector.call<PaperlessMetadata>({
            method: 'GET',
            url: '/api/documents/',
            query: {
                modified__gte: changedSince,
                // page: 1,
                page: page,
                page_size: 10
            },
            headers: { 'Authorization': `Token ${this.token}` }
        });

        return response.data;
    }

    public async enhanceResult(result: PaperlessResult): Promise<EnhancedResult> {

        const [
            // storagePath,
            correspondent,
            documentType,
            // owner,
            tags,
            customFields,
        ] = await Promise.all([
            // this.resolveStoragePath(result.storage_path),
            this.resolveCorrespondentName(result.correspondent),
            this.resolveDocumentTypeName(result.document_type),
            // this.resolveUserName(result.owner),
            this.resolveTagNames(result.tags),
            this.resolveCustomFields(result.custom_fields),
        ]);

        return Promise.resolve({
            paperlessId: result.id,
            title: result.title,
            // content: result.content,
            correspondent: correspondent,
            documentType: documentType,
            // storagePath,
            tags: tags,
            created: result.created,
            archiveSerialNumber: result.archive_serial_number,
            // owner: this.resolveUserName(result.owner),
            notes: result.notes,
            customFields,
            pageCount: result.page_count,
            mimeType: result.mime_type,
            path: this.formatPath(
                result.title,
                correspondent,
                documentType,
                result.created ?? '0000-00-00',
                result.mime_type,
                customFields,
            ),
        });
    }

    private async resolveCorrespondentName(id: number): Promise<string> {
        if (this.correspondents[id]) {
            return this.correspondents[id];
        }

        const fallbackCorrespondent = 'Unknown Correspondent';
        return this.connector.call<{ results: PaperlessCorrespondent[] }>({
            method: 'GET',
            url: `/api/correspondents/`,
            headers: { 'Authorization': `Token ${this.token}` }
        }).then(response => {
            const results = response.data.results;
            // console.log('Fetched correspondents:', results);
            this.correspondents = results.reduce((acc, item) => {
                acc[item.id] = item.name;
                return acc;
            }, {} as { [key: number]: string });
            return this.correspondents[id] ?? fallbackCorrespondent;
        }).catch(err => {
            console.error(`Failed to resolve correspondent name for ID ${id}`, err);
            return fallbackCorrespondent;
        });
    }

    private async resolveDocumentTypeName(id: number): Promise<string> {
        if (this.documentTypes[id]) {
            return this.documentTypes[id];
        }

        const fallbackDocumentType = 'Unknown Document Type';
        return this.connector.call<{ results: PaperlessDocumentType[] }>({
            method: 'GET',
            url: `/api/document_types/`,
            headers: { 'Authorization': `Token ${this.token}` }
        }).then(response => {
            const results = response.data.results;
            // console.log('Fetched document types:', results);
            this.documentTypes = results.reduce((acc, item) => {
                acc[item.id] = item.name;
                return acc;
            }, {} as { [key: number]: string });
            return this.documentTypes[id] ?? fallbackDocumentType;
        }).catch(err => {
            console.error(`Failed to resolve document type name for ID ${id}`, err);
            return fallbackDocumentType;
        });
    }

    private async resolveTagNames(ids: number[]): Promise<string[]> {
        if (ids.every(id => this.tags[id])) {
            return ids.map(id => this.tags[id]) as string[];
        }

        return this.connector.call<{ results: PaperlessTag[] }>({
            method: 'GET',
            url: `/api/tags/`,
            headers: { 'Authorization': `Token ${this.token}` }
        }).then(response => {
            const results = response.data.results;
            // console.log('Fetched tags:', results);
            this.tags = results.reduce((acc, item) => {
                acc[item.id] = item.name;
                return acc;
            }, {} as { [key: number]: string });

            return ids.map(id => this.tags[id]) as string[];
        }).catch(err => {
            console.error(`Failed to resolve tag names for IDs ${ids.join(',')}`, err);
            return [];
        });
    }

    private async resolveCustomFields(fields: { field: number; value: string }[]): Promise<{ [key: string]: string }> {
        if (fields.every(f => this.customFields[f.field])) {
            return fields.reduce((acc, field) => {
                const name = this.customFields[field.field];
                if (name) acc[name] = field.value;
                return acc;
            }, {} as { [key: string]: string });
        }

        return this.connector.call<{ results: PaperlessCustomField[] }>({
            method: 'GET',
            url: `/api/custom_fields/`,
            headers: { 'Authorization': `Token ${this.token}` }
        }).then(response => {
            const results = response.data.results;
            // console.log('Fetched custom fields:', results);
            this.customFields = results.reduce((acc, item) => {
                acc[item.id] = item.name;
                return acc;
            }, {} as { [key: string]: string });

            return fields.reduce((acc, field) => {
                const name = this.customFields[field.field];
                if (name) acc[name] = field.value;
                return acc;
            }, {} as { [key: string]: string });
        }).catch(err => {
            console.error(`Failed to resolve custom fields for IDs ${fields.map(f => f.field).join(',')}`, err);
            return {};
        });
    }

    private formatPath(title: string, correspondent: string, documentType: string, created: string, _mimeType: string, customFields: Record<string, string>): string {
        created = created?.split('T')?.[0];
        const createdYear = created.split('-')[0];
        const accountNumber = customFields['Account Number'];
        const externalId = customFields['External ID'];


        if (!title) {
            title = documentType ? `${correspondent} - ${documentType}` : correspondent;
        }

        if (externalId && !title.includes(externalId)) {
            title += ` (${externalId})`;
        }

        let path = `${createdYear}/${documentType}/${correspondent}/`;
        path += accountNumber ? `${accountNumber}/` : '';
        path += `${title}.pdf`;

        return path;
    }

    public async download(): Promise<DownloadSummary> {
        console.log('Starting document download process...');

        // Get all documents
        const documents = await this.list();
        console.log(`Found ${documents.length} documents to download`);

        const results: DownloadResult[] = [];

        // Download each document with concurrency control
        await Promise.all(
            documents.map(doc =>
                this.semaphore.acquire(async () => {
                    const result = await this.downloadDocument(doc);
                    results.push(result);
                })
            )
        );

        // Calculate summary
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;

        const summary: DownloadSummary = {
            total: documents.length,
            successful,
            failed,
            results
        };

        console.log(`Download complete: ${successful} successful, ${failed} failed`);
        return summary;
    }

    private async downloadDocument(doc: EnhancedResult): Promise<DownloadResult> {
        try {
            console.log(`Downloading document ${doc.paperlessId}: ${doc.title}`);

            // Construct the full file path
            const fullPath = path.join(this.downloadDirectory, doc.path);
            const dirPath = path.dirname(fullPath);

            // Create directories if they don't exist
            await mkdir(dirPath, { recursive: true });

            // Download using native HTTPS with streaming to avoid binary corruption
            // Paperless archives everything as PDF, to download original file pass original=true as query parameter
            await this.downloadBinaryFile(
                `/api/documents/${doc.paperlessId}/download/`,
                fullPath
            );

            console.log(`Successfully downloaded: ${fullPath}`);

            // Add 1 second delay after downloading each file
            await new Promise(resolve => setTimeout(resolve, 1000));

            return {
                document: doc,
                filePath: fullPath,
                success: true
            };

        } catch (error: any) {
            const errorMessage = error?.message || String(error);
            console.error(`Failed to download document ${doc.paperlessId} (${doc.title}):`, errorMessage);

            return {
                document: doc,
                success: false,
                error: errorMessage
            };
        }
    }

    /**
     * Downloads a binary file using native HTTPS streaming.
     * This avoids the UTF-8 string conversion that corrupts binary PDFs.
     */
    private async downloadBinaryFile(apiPath: string, outputPath: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const url = new URL(apiPath, this.host);

            const options: https.RequestOptions = {
                hostname: url.hostname,
                port: url.port || 443,
                path: url.pathname + url.search,
                method: 'GET',
                headers: {
                    'Authorization': `Token ${this.token}`,
                    'User-Agent': 'PaperlessConnector/1.0'
                }
            };

            const request = https.request(options, (response) => {
                // Check for successful response
                if (response.statusCode !== 200) {
                    reject(new Error(
                        `Download failed with status ${response.statusCode}: ${response.statusMessage}`
                    ));
                    return;
                }

                // Create write stream and pipe response directly to file
                const fileStream = createWriteStream(outputPath);

                response.pipe(fileStream);

                fileStream.on('close', () => {
                    resolve();
                });

                fileStream.on('error', (err) => {
                    fileStream.close();
                    reject(new Error(`File write error: ${err.message}`));
                });

                response.on('error', (err) => {
                    fileStream.close();
                    reject(new Error(`Response error: ${err.message}`));
                });
            });

            request.on('error', (err) => {
                reject(new Error(`HTTPS request error: ${err.message}`));
            });

            request.on('timeout', () => {
                request.destroy();
                reject(new Error('Request timeout'));
            });

            request.setTimeout(60000); // 60 second timeout for large files
            request.end();
        });
    }
}