const aws = require('aws-sdk');
const ynabApi = require('ynab');
const config = require('./config');
const s3 = new aws.S3();


var  raiseError = (error, stack, callback) => {
    console.log(error);
    console.log(stack);
    callback(error);
};




var processEvent = (bucket_config, event, callback) => {

    let ynab = new ynabApi.api(bucket_config['personalAccessToken']);
    let budget_id = bucket_config.budgetId;
    let trn = {
        transactions: [
            {
                account_id: bucket_config.accountId,
                date: event.data.created,
                //date: ynabApi.utils.getCurrentDateInISOFormat(),
                amount: event.data.amount * 10,
                memo: event.data.category + " : " + event.data.description,
                payee_name: event.data.merchant.name,
            }
        ]
      }

      try { 
          ynab.transactions.bulkCreateTransactions(budget_id, trn).catch(e => {
            raiseError("Unable to create transaction", e, callback);
          })
      }
      catch (e) {
          raiseError("Parameters for bulkCreateTransaction invalid", e, callback);
      }

      var response = {
          "statusCode": 200,
          "headers": {},
          "body": null,
          "isBase64Encoded": false
      }

      callback(null, response);
}

var putEvent = (bucket_config, event, callback) => {

    let eventDate = new Date(event.data.created);
    let key = eventDate.getFullYear() + '/' + (eventDate.getMonth() + 1 )  + '/' + eventDate.getDate() + '/' + event.data.id;

    let params = {
        Body: new Buffer(JSON.stringify(event), 'binary'),
        Bucket: config.config.Bucket,
        Key:  key,
        //ACL: "authenticated-read"
    };


    s3.putObject(params, function(err, data) {
        if (err) console.log(err);
    })

}



exports.handler = (event, context, callback) => {

    s3.getObject(config['config'], function(err, data){
        if (err) raiseError(err, err.stack, callback); // an error occurred
        else {
            try {
                var bucket_config = JSON.parse(data.Body.toString('utf-8'));
            }
            catch (e) {
                raiseError("Unable to parse bucket config", e, callback);
            }

            putEvent(bucket_config, event, callback);
            processEvent(bucket_config, event, callback);
        }
    })

};

