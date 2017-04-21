import { waterfall } from 'async';
import { errors } from 'arsenal';
import { parseString } from 'xml2js';

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

// Create a replication configuration object from result of parseString method.
function createReplicationObj(result) {
    const { Role, Rule } = result.ReplicationConfiguration;
    const Rules = Rule.map(rule => {
        const { Destination, Prefix, Status, ID } = rule;
        const { Bucket, StorageClass } = Destination[0];
        return {
            Destination: {
                Bucket: Bucket[0],
                StorageClass: StorageClass[0],
            },
            Prefix: Prefix[0],
            Status: Status[0],
            ID: ID[0],
        };
    });
    return {
        Role: Role[0],
        Rules,
    };
}

// Parse the request XML to ensure all required elements are present and valid.
function validateReplicationObj(request, log, cb) {
    // TODO: Handle constraints and requirements detailed in:
    // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putBucketReplication-property
    // const { Role, Rule } = result.ReplicationConfiguration;
    //
    // // Ensure Role and Rule properties are defined and within the required
    // // constraints.
    // if (!Role || !Rule || Rule.length > 1000) {
    //     log.debug('illegal versioning configuration');
    //     return cb(errors.IllegalReplicationConfigurationException);
    // }
    // Rule.forEach(rule => {
    //     const { Destination, Prefix, Status, ID } = rule;
    //     assert(Status === 'Enabled' || Status === 'Disabled');
    //     const { Bucket, StorageClass } = Destination;
    //     assert(StorageClass === undefined ||
    //         StorageClass === 'STANDARD' ||
    //         StorageClass === 'REDUCED_REDUNDANCY' ||
    //         StorageClass === 'STANDARD_IA');
    // });
    return process.nextTick(() => cb(null));
}

// Handle the initial parsing of XML with the parseString method.
function parseXML(xml, log, cb) {
    if (xml === '') {
        log.debug('request xml is missing');
        return cb(errors.MalformedXML);
    }
    return parseString(xml, (err, result) => {
        if (err) {
            log.debug('request xml is malformed');
            return cb(errors.MalformedXML);
        }
        return cb(null, result);
    });
}

// Handle the steps for returning a valid replication configuration object.
export default function getReplicationConfig(xml, log, cb) {
    return waterfall([
        next => parseXML(xml, log, next),
        (result, next) => {
            const replicationObj = createReplicationObj(result);
            return validateReplicationObj(replicationObj, log, next);
        },
    ], (err, replicationConfiguration) => cb(err, replicationConfiguration));
}
