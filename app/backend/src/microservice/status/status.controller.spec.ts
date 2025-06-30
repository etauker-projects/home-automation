import 'mocha';
import assert from 'assert';
import moment from 'moment';
import axios, { AxiosResponse } from 'axios';
import { Server } from '../server/server';
// import { StatusController } from './status.controller';
// import { PersistenceConnectorMock } from '../persistence/persistence-connector.mock';

const port = 9999;
const apiRoot = '/mixology/recipes';
const prefix = '/v1/status';

describe(prefix, () => {

    let server: Server;
    // let connector: PersistenceConnectorMock;

    beforeEach(() => {
        // connector = new PersistenceConnectorMock();
        server = new Server({ port, apiRoot })
            // .register(prefix, StatusController.getInstance(connector.realistic()))
            .start();
    });

    afterEach(async () => {
        await server.stop();
        // connector.reset();
    });

    it('GET', () => {

        const url = `http://localhost:${ port }${ apiRoot }${ prefix }`;
        return axios.get(url).then((response: AxiosResponse<any, any>) => {

            // api
            assert.equal(response.status, 200, 'incorrect status code');

            // data
            assert.equal(response.data.status, 'running');
            assert.equal(response.data.mode, 'unknown');
            assert.equal(moment.utc(response.data.time).isValid(), true);

            // // transactions
            // assert.equal(connector.transaction.continue.called, false, 'continue should not be called');
            // assert.equal(connector.transaction.end.called, false, 'end should not be called');
        });
    });
});
