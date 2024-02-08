import 'mocha';
import { assert } from 'chai';
import { Lib } from './lib';

describe('Lib', () => {
    describe('getGreeting', () => {
        it('says hello', () => {
            const lib = new Lib('hey');
            assert.equal(lib.getGreeting(), 'hey');
        });
    });
});