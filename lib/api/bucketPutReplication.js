import { errors } from 'arsenal';
import { waterfall } from 'async';
import { parseString } from 'xml2js';

import collectCorsHeaders from '../utilities/collectCorsHeaders';
import metadata from '../metadata/wrapper';
import { metadataValidateBucket } from '../metadata/metadataUtils';

/**
    Example XML request:

    <ReplicationConfiguration>
        <Role>IAM-role-ARN</Role>
        <Rule>
            <ID>Rule-1</ID>
            <Status>rule-status</Status>
            <Prefix>key-prefix</Prefix>
            <Destination>
                <Bucket>arn:aws:s3:::bucket-name</Bucket>
                <StorageClass>
                    optional-destination-storage-class-override
                </StorageClass>
            </Destination>
        </Rule>
        <Rule>
            <ID>Rule-2</ID>
            ...
        </Rule>
        ...
    </ReplicationConfiguration>
*/

// Parse the request XML to ensure all required elements are present and valid.
function _parseXML(request, log, cb) {
    if (request.post === '') {
        log.debug('request xml is missing');
        return cb(errors.MalformedXML);
    }
    return parseString(request.post, (err, result) => {
        if (err) {
            log.debug('request xml is malformed');
            return cb(errors.MalformedXML);
        }
        return cb(errors.IllegalReplicationConfigurationException);
        // TODO: Handle constraints and requirements detailed in:
        // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putBucketReplication-property
        const { Role, Rule } = result.ReplicationConfiguration;
        // if (!Role || !Role[0]) {
        //     log.debug('illegal versioning configuration');
        //     return cb(errors.IllegalReplicationConfigurationException);
        // }
        if (!Rule || Rule.length < 1 || Rule.length > 1000) {
            log.debug('illegal versioning configuration');
            return cb(errors.IllegalReplicationConfigurationException);
        }
        for (let i = 0; i < Rule.length; i++) {
            const { Destination, Prefix, Status } = Rule[i];
            // return cb(errors.IllegalReplicationConfigurationException);
        }
        return process.nextTick(() => cb(null));
    });
}

/**
 * bucketPutReplication - Create or update bucket replication configuration
 * @param {AuthInfo} authInfo - Instance of AuthInfo class with requester's info
 * @param {object} request - http request object
 * @param {object} log - Werelogs logger
 * @param {function} callback - callback to server
 * @return {undefined}
 */
export default function bucketPutReplication(authInfo, request, log, callback) {
    log.debug('processing request', { method: 'bucketPutReplication' });

    const bucketName = request.bucketName;
    const metadataValParams = {
        authInfo,
        bucketName,
        requestType: 'bucketPutReplication',
    };

    return waterfall([
        next => _parseXML(request, log, next),
        next => metadataValidateBucket(metadataValParams, log,
            (err, bucket) => next(err, bucket)),
        (bucket, next) => parseString(request.post, (err, result) => {
            if (err) {
                return next(err, bucket);
            }
            const replicationConfig = {};
            return next(null, bucket, replicationConfig);
        }),
        (bucket, replicationConfig, next) => {
            bucket.setReplicationConfiguration(replicationConfig);
            // TODO all metadata updates of bucket should be using CAS
            metadata.updateBucket(bucket.getName(), bucket, log, err =>
                next(err, bucket));
        },
    ], (err, bucket) => {
        const corsHeaders = collectCorsHeaders(request.headers.origin,
            request.method, bucket);
        if (err) {
            log.trace('error processing request', { error: err,
                method: 'bucketPutReplication' });
        }
        // TODO push metrics for bucketPutReplication
        // else {
        //  pushMetric('bucketPutReplication', log, {
        //      authInfo,
        //      bucket: bucketName,
        //   }
        // }
        return callback(err, corsHeaders);
    });
}
