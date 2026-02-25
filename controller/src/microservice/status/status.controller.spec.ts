import 'mocha';
import assert from 'assert';
import moment from 'moment';
import axios from 'axios';
import { Server } from '../server/server.js';
import { StatusController } from './status.controller.js';

const port = 9999;
const apiRoot = '/mixology/recipes';
const prefix = '/v1/status';

describe(prefix, () => {

    let server: Server;
    // let connector: PersistenceConnectorMock;

    beforeEach(() => {
        // process.env['JWT_SECRET'] = 'test-secret';
        server = new Server({ port, apiRoot })
            .register(prefix, StatusController.getInstance())
            .start();
    });

    afterEach(async () => {
        // delete process.env['JWT_SECRET'];
        await server.stop();
    });

    it('GET', async () => {

        const url = `http://localhost:${ port }${ apiRoot }${ prefix }`;
        const response = await axios.get(url);

        // api
        assert.equal(response.status, 200, 'incorrect status code');

        // data
        assert.equal(response.data.status, 'running');
        assert.equal(response.data.mode, 'test');
        assert.equal(moment.utc(response.data.time).isValid(), true);
    });
});
