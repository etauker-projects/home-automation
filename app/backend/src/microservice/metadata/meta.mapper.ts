import { Meta } from './meta.js';
import { MetaDto } from './meta.dto.js';

export class MetaMapper {

    public static fromDto(dto: MetaDto): Meta {
        return new Meta(
            dto.id,
            dto.created_by,
            dto.created_at,
            dto.updated_by,
            dto.updated_at,
        );
    }

    public static toDto(meta: Meta): MetaDto {
        return {
            id: meta.getId(),
            created_by: meta.getCreatedBy(),
            created_at: meta.getCreatedAt(),
            updated_by: meta.getUpdatedBy(),
            updated_at: meta.getUpdatedAt(),
        };
    }
}