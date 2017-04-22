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

class Validator {
    constructor() {
        this._xml = null;
        this._log = null;
        this._parsedXML = null;
        this._replicationConfiguration = {
            Rules: [
                {
                    Destination: {
                        Bucket: 'STRING_VALUE',
                        StorageClass: 'STANDARD',
                    },
                    Prefix: 'STRING_VALUE',
                    Status: 'Enabled',
                    ID: 'STRING_VALUE',
                },
            ],
        };
    }

    setXML(xml) {
        this._xml = xml;
        return this;
    }

    setLog(log) {
        this._log = log;
        return this;
    }

    // Handle the initial parsing of XML using the `parseString` method.
    _parseXML(cb) {
        if (this._xml === '') {
            this._log.debug('request xml is missing');
            return cb(errors.MalformedXML);
        }
        return parseString(this._xml, (err, result) => {
            if (err) {
                this._log.debug('request xml is malformed');
                return cb(errors.MalformedXML);
            }
            this._parsedXML = result;
            return cb();
        });
    }

    _validateRole(cb) {
        const { Role } = this._parsedXML.ReplicationConfiguration;
        if (!Role) {
            return cb(errors.IllegalReplicationConfigurationException);
        }
        this._replicationConfiguration.Role = Role[0];
        return cb();
    }

    // Create a replication configuration object from result of parseString
    // method.
    _createReplicationObj(result) {
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

    getReplicationConfiguration(cb) {
        return waterfall([
            next => this._parseXML(next),
            next => this._validateRole(next),
            // next => this._validateDestination(next),
            // next => this._validateDestinationBucket(next),
            // next => this._validateDestinationStorageClass(next),
            // next => this._validatePrefix(next),
            // next => this._validateStatus(next),
            // next => this._validateID(next),
        ], err => cb(err, this._replicationConfiguration));
    }
}

// Handle the steps for returning a valid replication configuration object.
export default function getReplicationConfiguration(xml, log, cb) {
    const validator = new Validator()
        .setXML(xml)
        .setLog(log);
    return validator.getReplicationConfiguration(cb);
}


// const replicationObj = this._createReplicationObj(result);

// Parse the request XML to ensure all required elements are present and valid.
function validateReplicationObj(request, log, cb) {
    // TODO: Handle constraints and requirements detailed in:
    // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putBucketReplication-property

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
