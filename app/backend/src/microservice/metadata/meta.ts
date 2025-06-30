export class Meta {

    private id: string;
    private createdBy: string;
    private createdAt: string;
    private updatedBy: string;
    private updatedAt: string;

    constructor(
        id: string,
        createdBy: string,
        createdAt: string,
        updatedBy: string,
        updatedAt: string,
    ) {
        this.id = id;
        this.createdBy = createdBy;
        this.createdAt = createdAt;
        this.updatedBy = updatedBy;
        this.updatedAt = updatedAt;
    }

    public getId(): string {
        return this.id;
    }
    public getCreatedBy(): string {
        return this.createdBy;
    }
    public getCreatedAt(): string {
        return this.createdAt;
    }
    public getUpdatedBy(): string {
        return this.updatedBy;
    }
    public getUpdatedAt(): string {
        return this.updatedAt;
    }
}