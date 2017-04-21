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
    console.log('\n\n', request.post, '\n\n');
    return parseString(request.post, (err, result) => {
        if (err) {
            log.debug('request xml is malformed');
            return cb(errors.MalformedXML);
        }
        // TODO: Handle constraints and requirements detailed in:
        // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putBucketReplication-property
        const { Role, Rule } = result.ReplicationConfiguration;
        console.log('\n\n', Rule.length, '\n\n');

        // Ensure Role and Rule properties are defined and within the required
        // constraints.
        if (!Role || !Rule || Rule.length > 1000) {
            log.debug('illegal versioning configuration');
            return cb(errors.IllegalReplicationConfigurationException);
        }
        Rule.forEach(rule => {
            const { Destination, Prefix, Status, ID } = rule;
            assert(Status === 'Enabled' || Status === 'Disabled');
            const { Bucket, StorageClass } = Destination;
            assert(StorageClass === undefined ||
                StorageClass === 'STANDARD' ||
                StorageClass === 'REDUCED_REDUNDANCY' ||
                StorageClass === 'STANDARD_IA');
        });
        });

        return process.nextTick(() => cb(null));
    });
}
