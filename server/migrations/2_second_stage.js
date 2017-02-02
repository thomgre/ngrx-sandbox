'use strict';


/**
 * @desc
 * This is an example migrationt o create a table with some attributes
 *
 *
 * @param dynamodb
 * @param callback
 */
exports.migrate = function(dynamodb, callback) {

  var migTable = {
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'N' },
      { AttributeName: 'name', AttributeType: 'S' }
    ],
    GlobalSecondaryIndexes: [
      {IndexName: 'name_index',
        KeySchema: [{AttributeName: 'name', KeyType: 'HASH'}],
        Projection: {ProjectionType: 'ALL'},
        ProvisionedThroughput: {ReadCapacityUnits: 1, WriteCapacityUnits: 1}}
    ],
    KeySchema: [
      { AttributeName: 'id', KeyType: 'HASH' }
    ],
    ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 },
    TableName: 'myfirsttable'
  };

  dynamodb.createTable(migTable, function(error, data) {
    if (error) {
      console.log("myfirsttable cannot be created error: ", error);
    }
    callback(error);
  });
}
