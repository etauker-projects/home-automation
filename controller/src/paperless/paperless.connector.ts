import { RestConnector } from '../framework/rest/rest.connector';

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

export class PaperlessConnector {

    private host: string = 'https://paperless.office.etauker.com';
    private connector: RestConnector;

    constructor() {
        this.connector = new RestConnector(this.host);
    }

    // TODO: these should be fetched from the API and cached, with a TTL
    private correspondents: { [key: number]: string } = {};
    private documentTypes: { [key: number]: string } = {};
    // private storagePaths: { [key: number]: string } = {};
    private customFields: { [key: string]: string } = {};
    private tags: { [key: number]: string } = {};
    private users: { [key: number]: string } = {};

    public async download(page: number = 1): Promise<EnhancedResult[]> {
        console.log(`Fetching documents (page ${page})`);
        const changedSince = '2026-01-01';
        const original = await this.searchDocuments(changedSince, page);

        if (original.results.length === 0) {
            console.log('No documents found.');
            return [];
        }

        console.log(`Processing (page ${page})`);
        const results = await Promise.all(original.results.map(res => this.enhanceResult(res)));
        const upstream = original.next ? await this.download(page + 1) : [];

        console.log(`Done (page ${page})`);
        return [...results, ...upstream];
    }

    // TODO: implement API call
    // curl -s -H "Authorization: Token $TOKEN" "$API/documents/?modified__gte=2026-01-01&page=1&page_size=10" | jq
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
            headers: { 'Authorization': `Token ${process.env.PAPERLESS_TOKEN}` }
        });

        // console.log('response', response);
        return response.data;

        // const mockedResponse: PaperlessMetadata = {
        //     "count": 12,
        //     "next": "http://paperless.office.etauker.com/api/documents/?modified__gte=2026-01-01&page=2&page_size=1",
        //     "previous": null,
        //     "all": [ 79, 78, 55, 68, 72, 73, 67, 69, 65, 66, 70, 71 ],
        //     "results": [
        //         {
        //         "id": 79,
        //         "correspondent": 9,
        //         "document_type": 2,
        //         "storage_path": 3,
        //         "title": "2026-01-12 Electricity Bill",
        //         "content": "Electricity\n\n\n\n10304474113\nM DG MCC Proﬁle\n\nDG1 MCC01 01\n\nTautvydas Kersulis Customer Service\n16 Ballymore Lane 041 214 9500\nBallymore MON – FRI 9:00am – 5:30pm\nCraughwell\nGalway EMERGENCY CONTACT:\nH91 PNY6 , For emergencies, power outages or to\nIRL report dangerous situations please\ncontact ESB NETWORKS:\n\n1800 37 29 99\nSupply Address\nBilling Period 08/11/2025–07/01/2026\n16, LANA AN BHAILE DWELLING BALLYMORE\nCRAUGHWELL Galway H91 PNY6, IRL\nBill Summary Amount\nYour last Bill €0.00 Account Information\nPayment Received Thank You €0.00 Account Number: 400111251\nDate of Issue: 12/01/2026\nBalance brought forward €0.00 Invoice Number: INV1000237477\nNet Bill for this period €163.04 MIC: 12\n\nTotal VAT €14.67 Tariff category:\nDG1 Residential 24 Hour Dual Fuel Fixed Rate\nCurrent Bill €177.71\nContract End Date: 07/11/2026\n\nTotal Due €177.71 Current Bill due date: 26/01/2026\n\n\nYour fuel mix is presented on the back of this bill. For further information on your fuel mix, Payment method: Direct Debit\nplease contact customer service on 041-2149500\n\n\n\n\nPayment Slip\nBuilding 2, 3rd & 4th Floor,\nThe Green,\nDublin Airport Central,\nAccount No: 400111251\nDublin Airport,\nSwords, MPRN: 10304474113\nCo. Dublin,\nK67 E2H3\n\nT: 041 214 9500\nE: info@flogas.ie\nTransaction Date: 26/01/2026\nÍ!:*$Ï+,SR1m1}{fÃÎ\nwww.flogas.ie\nTotal Due €: 177.71 01261 004001112515 0177717 939170\nDescription Meter No From Meter Readings Multiplier Consumption Payment Options\nPrevious Present See www.flogas.ie for all payment options.\n24hr 22372990 08/11/2025 5161 A 5692 A 1 531\nDirect Debit: Call 041 2149500\nA – Actual, C – Customer Read, E – Estimate Electronic Funds transfer:\nFollowing details required to pay via EFT:\nBill Information Units Rate ﴾€﴿ VAT Unit Amount ﴾€﴿ Payment reference: ELECTRICITY ACCOUNT 400111251\nIBAN: IE69BARC99021246508900\n24 Hour Units 531 0.221 9% €/kWh 117.35\nBIC: BARCIE2D\nPSO Levy 1 2.01 9% €/Month 2.01 Debit/Credit Cards: www.flogas.ie or call 041 2149500.\n08/11 - 30/11 Cheque: Make payable to Flogas Natural Gas Ltd.\nPSO Levy 1 1.46 9% €/Month 1.46 Include your MPRN on Cheque.\n01/12 - 31/12 Please do not send cash by post. If this is your final bill and your\nStanding Charge 61 0.6922 9% €/Day 42.22 account is in credit, please contact us on the above number to\narrange for a refund if you don’t pay by Direct debit.\nNet total 163.04\nVAT 9% 14.67 Contact Details\nPlease have your account number to hand when you contact us.\nCurrent Bill 177.71 We can only discuss account information with the account holder.\nPrevious Outstanding Balance 0.00 041 2149500 Mon-Fri 9am-5:30pm\nEmail: customersupport@flogas.ie\nTotal Due 177.71 Address: Flogas Natural Gas ltd, Building 2, 3rd & 4th Floor, The\nGreen, Dublin Airport Central, Dublin Airport, Swords, Co. Dublin,\nK67 E2H3\nSocial Media: @FlogasIreland\nVAT Reg No: IE 4530571M\nCustomers with payment queries should contact our Credit\nControl Department on 041 2149500 or email asu@flogas.ie\n\n\nCustomer Complaints\nFlogas is committed to providing an excellent level of customer\nservice. If however, you have a complaint, contact us on 041\n2149500 or complaints@flogas.ie. Your complaint will be\nregistered and a reference number issued. Every effort will be\nmade to resolve your complaint in a speedy and professional\nmanner. Some issues, by their nature, may take longer to\ninvestigate and rectify. If you feel your complaint has not been\nresolved to your satisfaction by Flogas, then you may refer your\nunresolved dispute to:\nThe Customer Care Team,\nCommission for Regulation of Utilities,\nPO Box 11934,\nTallaght, Dublin 24.\nTelephone 1800 404 404.\nEmail: customercare@cru.ie\n\n\nEnergy Saving Hints and tips Public Service Obligation ﴾PSO﴿ Levy\n These days we use many electrical devices & appliances to get through our day. It would be The PSO Levy is determined by the CRU ﴾Commission for\ndiﬃcult for any of us to stop using them, but making small changes to our habits can help to Regulation of Utilities﴿ and relates to any additional cost incurred\nreduce energy consumption over time & being a bit smarter in the times we use devices can help by the ESB in purchasing or generating electricity from\nto lessen use at peak times. sustainable, renewable and indigenous sources. It is charged to all\n Switch oﬀ unused devices at the wall socket when you are not using them. When devices are electricity customers.\nsleeping or in standby mode, they still use small amounts of electricity. Timers or smart plugs can\nbe a good way to do this.\nYou can save money by renewing your contract or switching supplier if your existing agreement is due\nto cease or if you are out of contract. Comparison tools can be found on www.cru.ie.\n.\n\nIf you have any queries & would like\nFlogas Fuel Mix Disclosure\nadditional support, there are a number\nJanuary 2024 to December 2024\nConsumption\nof impartial bodies who can help\nFor general advice: Electricity % of total\nCitizen Information supplied has Electricity Average for All\nwww.citizensinformation.ie | T: 0818 07 4000 been sourced Supplied by Island Market\nfrom the Flogas ﴾for\navailable Monday to Friday 9am – 8pm\nfollowing fuels comparison﴿\nFor advice on payment or debt issues: Renewable 100.0 62.4\nMoney Advice & Budgeting Service (MABS) Natural gas 0.0 34.7\nwww.mabs.ie | T: 0818 07 2000 Coal 0.0 1.1\navailable Monday to Friday 9am – 8pm Oil 0.0 1.3\nOther 0.0 0.5\nFor help and support on reducing your Total 100.0 100.0\nenergy bill, grants available, energy Environmental Impact\nefficiency and emission costs: CO2 Emissions 0g CO2/kWh 163g CO2/kWh\nSustainable Energy Authority Ireland (SEAI) Consumption comparison to last year ﴾kWh﴿. Average residential electricity\nwww.seai.ie | T: 01808 2100 For information on your fuel mix and on the environmental consumption is 350kWh per month.\nimpact of your electricity supply, visit www.flogas.ie or, for\nfurther details call 0412149500.",
        //         "tags": [
        //             1
        //         ],
        //         "created": "2026-01-26",
        //         "created_date": "2026-01-26",
        //         "modified": "2026-02-20T01:12:03.437553Z",
        //         "added": "2026-01-16T22:44:27.415797Z",
        //         "deleted_at": null,
        //         "archive_serial_number": null,
        //         "original_file_name": "2026-01-26 Electricity Bill.pdf",
        //         "archived_file_name": "2026-01-26 FloGas 2026-01-12 Electricity Bill.pdf",
        //         "owner": 3,
        //         "user_can_change": true,
        //         "is_shared_by_requester": false,
        //         "notes": [],
        //         "custom_fields": [
        //             {
        //             "value": "400111251",
        //             "field": 2
        //             },
        //             {
        //             "value": "EUR177.71",
        //             "field": 5
        //             },
        //             {
        //             "value": "INV1000237477",
        //             "field": 6
        //             }
        //         ],
        //         "page_count": 2,
        //         "mime_type": "application/pdf"
        //         }
        //     ]
        // };

        // return Promise.resolve(mockedResponse);
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
            headers: { 'Authorization': `Token ${process.env.PAPERLESS_TOKEN}` }
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
            headers: { 'Authorization': `Token ${process.env.PAPERLESS_TOKEN}` }
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

    // private async resolveStoragePath(id: number): Promise<string | undefined> {
    //     if (this.storagePaths[id]) {
    //         return this.storagePaths[id];
    //     }

    //     // https://paperless.office.etauker.com/api/schema/view/#/storage_paths/storage_paths_list
    //     return this.connector.call<{ results: { id: number; path: string }[] }>({
    //         method: 'GET',
    //         url: `/api/storage_paths/`,
    //         headers: { 'Authorization': `Token ${process.env.PAPERLESS_TOKEN}` }
    //     }).then(response => {
    //         const results = response.data.results;
    //         console.log('Fetched storage paths:', results);
    //         // console.log(results[0].path.split('/'));
    //         this.storagePaths = results.reduce((acc, item) => {
    //             acc[item.id] = item.path;
    //             return acc;
    //         }, {} as { [key: number]: string });

    //         return this.storagePaths[id];
    //     }).catch(err => {
    //         console.error(`Failed to resolve storage path for ID ${id}`, err);
    //         return undefined;
    //     });
    // }

    private async resolveTagNames(ids: number[]): Promise<string[]> {
        if (ids.every(id => this.tags[id])) {
            return ids.map(id => this.tags[id]) as string[];
        }

        return this.connector.call<{ results: PaperlessTag[] }>({
            method: 'GET',
            url: `/api/tags/`,
            headers: { 'Authorization': `Token ${process.env.PAPERLESS_TOKEN}` }
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
            headers: { 'Authorization': `Token ${process.env.PAPERLESS_TOKEN}` }
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

    // private formatPath(correspondent: string, documentType: string, created: string, mimeType: string, customFields: Record<string, string>): string {
    //     created = created?.split('T')?.[0];
    //     const createdYear = created.split('-')[0];
    //     const accountNumber = customFields['Account Number'];
    //     const externalId = customFields['External ID'];

    //     let path = `${createdYear}/${documentType}/${correspondent}/`
    //     path += accountNumber ? `${accountNumber}/` : ''

    //     let filename = `[${created}] `;
    //     filename += documentType ? `${correspondent} - ${documentType}` : correspondent;
    //     filename += externalId ? ` (${externalId})` : '';
    //     filename += this.findExtension(mimeType);
    //     path += filename;

    //     return path;
    // }

    private formatPath(title: string, correspondent: string, documentType: string, created: string, mimeType: string, customFields: Record<string, string>): string {
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
        path += `${title}.${this.findExtension(mimeType)}`;

        return path;
    }

    private findExtension(mimeType: string): string {
        switch (mimeType) {
            case 'application/pdf':
                return 'pdf';
            case 'image/jpeg':
                return 'jpg';
            case 'image/png':
                return 'png';
            default:
                return 'unknown';
        }
    }

    // private async resolveUserName(id: number): Promise<string | undefined> {
    //     // TODO: if not found, fetch from API and cache
    //     return this.users[id];
    // }

    // private determineOutputPaths(metadata: EnhancedResult): string[] {
    //     const paths = [ this.formatFinancialPath('', '', metadata) ];

        // if (metadata.tags.includes('Banking')) {
        //     if (metadata.tags.includes('Current')) {
        //         paths.push(this.formatFinancialPath('Banking', 'Current', metadata));
        //     }
        //     if (metadata.tags.includes('Savings')) {
        //         paths.push(this.formatFinancialPath('Banking', 'Savings', metadata));
        //     }
        //     if (metadata.tags.includes('Shares')) {
        //         paths.push(this.formatFinancialPath('Banking', 'Shares', metadata));
        //     }
        // }

        // if (metadata.tags.includes('Work')) {
        //     if (metadata.tags.includes('Payslip')) {
        //         paths.push(this.formatFinancialPath('Work', 'Payslip', metadata));
        //     }
        // }

        // if (metadata.tags.includes('Tax')) {
        //     if (metadata.tags.includes('Capital Gains')) {
        //         paths.push(this.formatFinancialPath('Tax', 'Capital Gains', metadata));
        //     }
        // }

        // if (metadata.tags.includes('Meter Readings')) {
        //     if (metadata.tags.includes('Gas')) {
        //         paths.push(this.formatFinancialPath('Meter Readings', 'Gas', metadata));
        //     }
        //     if (metadata.tags.includes('Electricity')) {
        //         paths.push(this.formatFinancialPath('Meter Readings', 'Electricity', metadata));
        //     }
        // }

        // if (metadata.tags.includes('Bills')) {
        //     if (metadata.tags.includes('Electricity')) {
        //         paths.push(this.formatFinancialPath('Bills', 'Electricity', metadata));
        //     }
        //     if (metadata.tags.includes('Gas')) {
        //         paths.push(this.formatFinancialPath('Bills', 'Gas', metadata));
        //     }
        //     if (metadata.tags.includes('Internet')) {
        //         paths.push(this.formatFinancialPath('Bills', 'Internet', metadata));
        //     }
        //     if (metadata.tags.includes('Bins')) {
        //         paths.push(this.formatFinancialPath('Bills', 'Bins', metadata));
        //     }
        // }

        // if (metadata.tags.includes('Insurance')) {
        //     if (metadata.tags.includes('House')) {
        //         paths.push(this.formatFinancialPath('Insurance', 'House', metadata));
        //     }
        //     if (metadata.tags.includes('Motor')) {
        //         paths.push(this.formatFinancialPath('Insurance', 'Motor', metadata));
        //     }
        //     if (metadata.tags.includes('Travel')) {
        //         paths.push(this.formatFinancialPath('Insurance', 'Travel', metadata));
        //     }
        //     if (metadata.tags.includes('Medical')) {
        //         paths.push(this.formatFinancialPath('Insurance', 'Medical', metadata));
        //     }
        //     if (metadata.tags.includes('Dental')) {
        //         paths.push(this.formatFinancialPath('Insurance', 'Dental', metadata));
        //     }
        //     if (metadata.tags.includes('Optical')) {
        //         paths.push(this.formatFinancialPath('Insurance', 'Optical', metadata));
        //     }
        // }

        // if (metadata.tags.includes('Expenses')) {
        //     if (metadata.tags.includes('House')) {
        //         paths.push(this.formatFinancialPath('Expenses', 'House', metadata));
        //     }
        //     if (metadata.tags.includes('Motor')) {
        //         paths.push(this.formatFinancialPath('Expenses', 'Motor', metadata));
        //     }
        //     if (metadata.tags.includes('Travel')) {
        //         paths.push(this.formatFinancialPath('Expenses', 'Travel', metadata));
        //     }
        //     if (metadata.tags.includes('Medical')) {
        //         paths.push(this.formatFinancialPath('Expenses', 'Medical', metadata));
        //     }
        //     if (metadata.tags.includes('Dental')) {
        //         paths.push(this.formatFinancialPath('Expenses', 'Dental', metadata));
        //     }
        //     if (metadata.tags.includes('Optical')) {
        //         paths.push(this.formatFinancialPath('Expenses', 'Optical', metadata));
        //     }
        // }

        // if (paths.length === 0) {
        //     paths.push('Unclassified/' + metadata.title);
        // }

    //     return paths;
    // }

    // private formatFinancialPath(type: string, subType: string, metadata: EnhancedResult): string {
    //     const correspondent = metadata.correspondent ?? 'Unknown Correspondent';
    //     const documentType = metadata.documentType ?? 'Unknown Type';
    //     const createdDate = metadata.created?.split('T')?.[0] || '0000-00-00';
    //     const createdYear = createdDate.split('-')[0];
    //     const accountNumber = metadata.customFields['Account Number'];
    //     const externalId = metadata.customFields['External ID'];

    //     // let path = `Financial/${type}/${subType}/`;
    //     // path += accountNumber ? `${correspondent} - ${accountNumber}` : correspondent;

    //     // option 1: format title here
    //     // path += `/[${createdDate}] `;
    //     // path += documentType ? `${correspondent} - ${documentType}` : correspondent;
    //     // path += externalId ? ` (${externalId})` : '';
    //     // 'Financial/Biils/Electricity/FloGas - 400111251/[2026-01-26] FloGas - Invoice (INV1000237477).pdf'
    //     // 'Financial/Biils/Gas/FloGas - 1277513/[2026-01-09] FloGas - Invoice (3948346).pdf'
    //     // 'Financial/Insurance/Travel/Vhi - 8437077/[2026-01-01] Vhi - Policy Document.pdf'
    //     // 'Financial/Biils/Gas/FloGas - 1277513/[2025-12-03] FloGas - Invoice (3918809).pdf'
    //     // 'Financial/Insurance/Travel/Vhi - 8437077/[2025-01-01] Vhi - Policy Document.pdf'
    //     // 'Financial/Insurance/Travel/Vhi - 8437077/[2025-01-01] Vhi - Policy Document.pdf'
    //     // 'Financial/Insurance/Travel/Vhi - 8437077/[2025-01-01] Vhi - Policy Document.pdf'
    //     // 'Financial/Insurance/Travel/Vhi - 8437077/[2024-01-01] Vhi - Policy Document.pdf'
    //     // 'Financial/Insurance/Travel/Vhi - 8437077/[2024-01-01] Vhi - Policy Document.pdf'
    //     // 'Financial/Insurance/Travel/Vhi - 8437077/[2023-01-01] Vhi - Policy Document.pdf'
    //     // 'Financial/Insurance/Travel/Vhi - 8437077/[2023-01-01] Vhi - Policy Document.pdf'
    //     // 'Financial/Insurance/Travel/Vhi - 8437077/[2022-01-01] Vhi - Policy Document.pdf'

    //     // option 2: format title inside paperless (manual?)
    //     // path += `/${metadata.title}`;
    //     // 'Financial/Biils/Electricity/FloGas - 400111251/2026-01-12 Electricity Bill.pdf'
    //     // 'Financial/Biils/Gas/FloGas - 1277513/2026-01-09 Gas Bill.pdf'
    //     // 'Financial/Insurance/Travel/Vhi - 8437077/[2026-01-01] Vhi MultiTrip - Notification of Renewal.pdf'
    //     // 'Financial/Biils/Gas/FloGas - 1277513/2025-12-03 Gas Bill.pdf'
    //     // 'Financial/Insurance/Travel/Vhi - 8437077/[2025-01-01] Vhi MultiTrip - Policy Certificate.pdf'
    //     // 'Financial/Insurance/Travel/Vhi - 8437077/[2026-01-01] Vhi MultiTrip - Policy Certificate.pdf'
    //     // 'Financial/Insurance/Travel/Vhi - 8437077/[2025-01-01] Vhi MultiTrip - Notification of Renewal.pdf'
    //     // 'Financial/Insurance/Travel/Vhi - 8437077/[2024-01-01] Vhi MultiTrip - Notification of Renewal.pdf'
    //     // 'Financial/Insurance/Travel/Vhi - 8437077/[2023-01-01] Vhi MultiTrip - Policy Certificate.pdf'
    //     // 'Financial/Insurance/Travel/Vhi - 8437077/[2023-01-01] Vhi MultiTrip - Notification of Renewal.pdf'
    //     // 'Financial/Insurance/Travel/Vhi - 8437077/[2022-01-01] Vhi MultiTrip - Policy Certificate.pdf'
    //     // 'Financial/Insurance/Travel/Vhi - 8437077/[2021-01-01] Vhi MultiTrip - Policy Certificate.pdf'

    //     // option 3: document type and correspondent
    //     let path = `${createdYear}/${documentType}/${correspondent}/`
    //     path += accountNumber ? `${accountNumber}/` : ''

    //     let filename = `[${createdDate}] `;
    //     filename += documentType ? `${correspondent} - ${documentType}` : correspondent;
    //     filename += externalId ? ` (${externalId})` : '';
    //     filename += '.pdf'; // TODO: handle others
    //     path += filename;

    //     // '2026/Appointment/Mayo University Hospital/0896279/[2026-05-26] Mayo University Hospital - Appointment.pdf'

    //     return path;
    // }

}