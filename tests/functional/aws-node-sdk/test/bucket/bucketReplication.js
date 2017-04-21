import assert from 'assert';
import { S3 } from 'aws-sdk';

import getConfig from '../support/config';

const bucket = `replication-bucket-${Date.now()}`;

describe('aws-node-sdk test bucket replication', function testSuite() {
    this.timeout(60000);
    let s3;

    // setup test
    before(done => {
        const config = getConfig('default', { signatureVersion: 'v4' });
        s3 = new S3(config);
        s3.createBucket({ Bucket: bucket }, done);
    });

    // delete bucket after testing
    after(done => s3.deleteBucket({ Bucket: bucket }, done));

    it('should not accept empty replication configuration', done => {
        const params = {
            Bucket: bucket,
            ReplicationConfiguration: {},
        };
        s3.putBucketReplication(params, err => {
            console.log(err);
            assert.strictEqual(err, null,
                'accepted empty replication configuration');
            assert.strictEqual(err.statusCode, 400);
            assert.strictEqual(err.code,
                'IllegalReplicationConfigurationException');
            return done();
        });
    });
});
