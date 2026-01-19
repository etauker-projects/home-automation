import { MetaDto } from '../metadata/meta.dto.js';
import { RoleDto } from './role.dto.js';

export interface RoleWithMetaDto extends RoleDto {
    meta: MetaDto;
}