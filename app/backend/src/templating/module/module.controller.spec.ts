import supertest from 'supertest';
import { resolve } from 'path';
import type { AppConfiguration } from '../../app';
import { Server } from '../../microservice/server/server';
import type { ServerConfig } from '../../microservice/server/server-config.interface';
import { ModuleController } from './module.controller';
import { describe } from 'mocha';
import { expect } from 'chai';
import type { Module } from './module.interfaces';
import type { IResponse } from '../../microservice/api/response.interface';

const serverConfig: ServerConfig = {
    apiRoot: '/api',
    port: 9999,
}

const templatePath = resolve('./src/test', 'test-templates');
const appConfig: AppConfiguration = {
    inputDirectory: resolve(templatePath, 'source'),
    outputDirectory: resolve(templatePath, 'destination'),
};

process.env.JWT_SECRET = 'secret';
process.env.LOGGER_LOG_LEVEL='INFO'
process.env.LOGGER_OUTPUT_FORMAT='GROUP'

const server = new Server(serverConfig);
const connector = {};
server.register('/modules', ModuleController.getInstance(connector, appConfig));

describe('ModuleController', () => {
    before(() => {
        server.start();
    });

    after(() => {
        return server.stop();
    });

    it('should return correct response for /api/modules', async () => {
        const response: IResponse<Module[]> = await supertest(server.getApp())
            .get('/api/modules')
            .set('Accept', 'application/json')
        ;

        expect(response.status).equals(200);

        expect(response.body.length).equals(1);
        expect(Object.keys(response.body[0]).length).equals(6);
        expect(response.body[0].id).equals('8ce9cdbe-1908-4206-af2a-8f2904142e37');
        expect(response.body[0].key).equals('power_monitoring');
        expect(response.body[0].name).equals('Power Monitoring');
        expect(response.body[0].description).equals('Module for monitoring power usage and statistics.');

        expect(response.body[0].templates!.length).equals(1);
        expect(Object.keys(response.body[0].templates![0]).length).equals(2);
        expect(response.body[0].templates?.[0].id).equals('84c09c8a-8b90-4262-b534-d4a5816e5aa4');
        expect(response.body[0].templates?.[0].type).equals('template_sensor');

        expect(response.body[0].entities!.length).equals(1);
        expect(response.body[0].entities?.[0].templateId).equals('c8166f12-e08d-4d1b-b4b1-e65b48297ec4');
        expect(response.body[0].entities?.[0].type).equals('utility_meter');
        expect(response.body[0].entities?.[0].managed).equals('true');
        expect((response.body[0].entities?.[0] as any).content).undefined
        expect(response.body[0].entities?.[0].variables.name).equals('Managed');
        expect(response.body[0].entities?.[0].variables.id).equals('managed');
    });
});