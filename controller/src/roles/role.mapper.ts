import { Role } from './role.js';
import { MetaMapper } from '../metadata/meta.mapper.js';
import { RoleDto } from './role.dto.js';
import { RoleWithMetaDto } from './role-with-meta.dto.js';
import { RoleDso } from './role.dso.js';
import { Meta } from '../metadata/meta.js';
import { HttpError } from '../api/api.module.js';

export class RoleMapper {

    public static fromDso(dso: RoleDso): Role {
        const meta = new Meta(
            dso.created_by,
            dso.created_at,
            dso.updated_by,
            dso.updated_at,
        );
        return new Role(meta, dso.id, dso.name, dso.description);
    }

    public static toDso(role: Role): RoleDso {
        const id = role.getId();
        const name = role.getName();
        const description = role.getDescription();
        const meta = role.getMeta();

        if (!id || !name || !description || !meta) {
            throw new HttpError(400, 'Role is missing required fields');
        }

        return {
            id,
            name,
            description,
            created_by: meta.getCreatedBy(),
            created_at: meta.getCreatedAt(),
            updated_by: meta.getUpdatedBy(),
            updated_at: meta.getUpdatedAt(),
        };
    }

    public static fromDto(dto: RoleDto): Role {
        // TODO: review
        // Create a temporary Meta - will be replaced when saved to database
        const tempMeta = new Meta('', '', '', '');
        return new Role(tempMeta, dto.id, dto.name, dto.description);
    }

    public static toDto(role: Role): RoleDto {
        if (!role) {
            throw new HttpError(404, 'Role not found');
        }
        const id = role.getId();
        const name = role.getName();
        const description = role.getDescription();

        if (!id || !name || !description) {
            throw new HttpError(400, 'Role is missing required fields');
        }

        return {
            id,
            name,
            description,
        };
    }

    public static toDtoWithMeta(role: Role): RoleWithMetaDto {
        if (!role) {
            throw new HttpError(404, 'Role not found');
        }
        const meta = role.getMeta();
        if (!meta) {
            throw new HttpError(400, 'Role is missing metadata');
        }
        return {
            ...RoleMapper.toDto(role),
            meta: MetaMapper.toDto(meta)
        };
    }
}