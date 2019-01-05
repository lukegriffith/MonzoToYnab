const aws = require('aws-sdk');
const ynabApi = require('ynab');
const config = require('./config');
const s3 = new aws.S3();


var  raiseError = (error, stack, callback) => {
    console.log(error);
    console.log(stack);
    callback(error);
};




var createTransaction = (bucket_config, event, callback) => {

    console.log("createTransaction: Obtaining access token.")

    let ynab = new ynabApi.api(bucket_config['personalAccessToken']);

    console.log("createTransaction: Getting budget ID.")

    let budget_id = bucket_config.budgetId;

    console.log("createTransaction: Building ynab transaction.")

    let trn = {
        transactions: [
            {
                account_id: bucket_config.accountId,
                date: event.data.created,
                //date: ynabApi.utils.getCurrentDateInISOFormat(),
                amount: event.data.amount * 10,
                memo: event.data.category + " : " + event.data.description,
                // merchant is null if you pay someone.
                payee_name: (event.data.merchant != null ? event.data.merchant.name : null),
            }
        ]
    }

    console.log("createTransaction: Creating transaction.")
    try { 
        ynab.transactions.bulkCreateTransactions(budget_id, trn).catch(e => {
          raiseError("createTransaction: Unable to create transaction.", e, callback);
        })
    }
    catch (e) {
        raiseError("createTransaction: Parameters for bulkCreateTransaction invalid.", e, callback);
    }

    var response = {
        "statusCode": 200,
        "headers": {},
        "body": null,
        "isBase64Encoded": false
    }

    console.log("createTransaction: Sending callback.")

    callback(null, response);
}

var processEvent = (bucket_config, event, callback) => {

    console.log("ProcessEvent: Parsing event.")

    let eventDate = new Date(event.data.created);
    let key = eventDate.getFullYear() + '/' + (eventDate.getMonth() + 1 )  + '/' + eventDate.getDate() + '/' + event.data.id;

    console.log("ProcessEvent: Building params.")

    let params = {
        //Body: new Buffer(JSON.stringify(event), 'binary'),
        Bucket: config.config.Bucket,
        Key:  key,
        //ACL: "authenticated-read"
    };

    console.log("ProcessEvent: Checking S3 object existance.")

    s3.getObject(params, function(err, data){
        if(err) {
            console.log("ProcessEvent: " + err)
            console.log("ProcessEvent: Object does not exist. Creating transaction.")
            createTransaction(bucket_config, event, callback)
        }else {
          console.log("ProcessEvent: Transaction already exists.")
       }
    });

    console.log("ProcessEvent: Putting transaction to S3.")

    params['Body'] = new Buffer(JSON.stringify(event), 'binary')

    s3.putObject(params, function(err, data) {
        if (err) console.log(err);
    })

}


exports.handler = (event, context, callback) => {

    console.log("Event recieved.")

    s3.getObject(config['config'], function(err, data){

        if (err) raiseError(err, err.stack, callback); // an error occurred
        else {

            console.log("Obtaining config from bucket.")

            try {
                var bucket_config = JSON.parse(data.Body.toString('utf-8'));
            }
            catch (e) {
                raiseError("Unable to parse bucket config", e, callback);
            }

            processEvent(bucket_config, event, callback)
        }
    })
};

