import { randomUUID } from 'crypto';
import moment from 'moment';
import { Role } from './role.js';
import { RoleWithMetaDto } from './role-with-meta.dto.js';
import { RoleDso } from './role.dso.js';
import { RoleDto } from './role.dto.js';
import { RoleMapper } from './role.mapper.js';

export class RoleMock {

    private role: RoleDso;

    constructor(partial: Partial<RoleDso> = {}) {
        this.role = { ...RoleMock.generateDso(), ...partial };
    }

    // returns data storage object
    public get(): Role {
        return RoleMapper.fromDso(this.getDso());
    }

    // returns data storage object
    public getDso(): RoleDso {
        return { ...this.role };
    }

    // returns data transfer object
    public getDto(): RoleDto {
        return RoleMapper.toDto(this.get());
    }
    public getDtoWithMeta(): RoleWithMetaDto {
        return RoleMapper.toDtoWithMeta(this.get());
    }

    public static generate(): Role {
        return RoleMapper.fromDso(RoleMock.generateDso());
    }

    public static generateDso(): RoleDso {
        const id = randomUUID();
        const now = moment.utc().toISOString();
        const owner = randomUUID();

        return {
            id: id,
            name: `Mock Role (${ id })`,
            description: `Mock role for test purposes - ${ id }`,
            created_by: owner,
            created_at: now,
            updated_by: owner,
            updated_at: now,
        };
    }

    public static generateDto(): RoleDto {
        return RoleMapper.toDto(RoleMock.generate());
    }

    public static generateDtoWithMeta(): RoleWithMetaDto {
        return RoleMapper.toDtoWithMeta(RoleMock.generate());
    }
}