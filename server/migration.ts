import Any = jasmine.Any;
import * as Promise from 'bluebird';

import * as DynamoDB from "aws-sdk/clients/dynamodb";
/**
 * Created by hpfs on 01/02/2017.
 */
var AWS = require('aws-sdk');
var attr = require('dynamodb-data-types').AttributeValue;
var fs = require('fs');

class Migration {
  _db : DynamoDB;
  _migrationPath: string;

  _dynamoMigrationTableName: string;

  constructor(db: DynamoDB, path: string) {
    this._db = db;
    this._migrationPath = path;
    this._dynamoMigrationTableName = "MY_DYNAMO_MIGRATION_TABLE";
  }

  /**
   * @desc
   * check if migration already ran, otherwise run migration files
   * reading from specified folder.
   *
   */
  migrate(): void {
    var migrationLocation = process.env.PWD + "/dynamo-migrations";
    fs.readdir(migrationLocation, function (err, files) {
      if (err) {
        console.error("Unable to get content from dynamo-migrations folder. Reason: ", err);
      }

      var dynamodb = new AWS.DynamoDB({endpoint: new AWS.Endpoint(process.env.AWS_DYNAMODB_ENDPOINT)});
      this.checkAndCreateMigrationTable(dynamodb, function (err) {
        if (err) {
          throw err;
        }

        this.executeMigrations(dynamodb, files, function(err, data) {
          if (err) {
            console.log("ERROR: ", err);
            return;
          }

          console.log("SUCCESS");
        });
      });
    });
  }

  /**
   * check if migration already ran by check ..
   *
   * @param filename
   * @param callback
   * @param skipCallback
   */
  private checkIfMigrationAlreadyRan(filename, callback, skipCallback) {
      var params = {
        TableName: this._dynamoMigrationTableName,
        IndexName: 'name_index',
        KeyConditions: {
          'name': {
            AttributeValueList: [{'S': filename}],
            ComparisonOperator: 'EQ'
          }
        }
      };

      this._db.query(params, function (err, data) {
        if (err) {
          callback(err);
        }

        if (data.Items.length > 0) {
          skipCallback();
        } else {
          callback(null, null);
        }
      });
  }

  /**
   * @desc
   * execute the migration files and then launch the callback at the end of the process
   *
   * @param files {array:string} the list of migration files
   * @param callback {function} callback called at the end of the process
   */
  private executeMigrations(files:string[],callback): void {
    var filename = files[0];
    var fileLocation = process.env.PWD + "/migrations/" + filename;
    var migration = require(fileLocation);
    if (typeof migration.migrate === 'function') {
      var executeNext = function (files, callback) {

        if (files.length == 1) {
          if (typeof callback === 'function') {
            callback();
          }
        } else {
          var filtered = files.slice(1, files.length);
          this.executeMigrations(filtered, callback);
        }
      }

      this.checkIfMigrationAlreadyRan(filename, function (err) {
        if (err) {
          throw err;
        }

        console.log('running migration: ', fileLocation);
        migration.migrate(this._db, function (err) {
          if (err) {
            throw err;
          }

          this.saveMigrationInformation( filename, function (err) {
            executeNext(files, callback);
          });
        });
      }, function () {
        executeNext(files, callback);
      });
    } else {
      console.error("'migrate' function not found.", fileLocation);
      throw new Error("'migrate' function not found in: " + fileLocation);
    }

  }

  /**
   * @desc
   * at the end of migration process save migration information
   * in the specified table so it would not get a second run.
   *
   * the table name and defination is in the class as an attribute
   *
   * @param filename {string}  is the file that has run
   * @param callback {function} the callback called at the end of the process
   */
  saveMigrationInformation(filename, callback) : void {
    this._db.describeTable({TableName: this._dynamoMigrationTableName}, function (err, data) {
      this._db.putItem({
        Item: attr.wrap({
          id: data.Table.ItemCount + 1,
          name: filename,
          status: 'success',
          createdat: new Date().toISOString()
        }),
        TableName: this._dynamoMigrationTableName
      }, function (err, data) {
        callback(err);
      });
    });
  }

  /**
   * @desc
   * check if the migration table exist, otherwise it would create it. It also
   * check if migration file has already run
   * @param callback
   */
  checkAndCreateMigrationTable (callback) : void {
    this._db.describeTable({TableName: this._dynamoMigrationTableName}, function (err, data) {
      if (err != null && err.code == 'ResourceNotFoundException') {
        var migTable = {
          AttributeDefinitions: [
            {AttributeName: 'id', AttributeType: 'N'},
            {AttributeName: 'name', AttributeType: 'S'}
          ],
          GlobalSecondaryIndexes: [
            {
              IndexName: 'name_index',
              KeySchema: [{AttributeName: 'name', KeyType: 'HASH'}],
              Projection: {ProjectionType: 'ALL'},
              ProvisionedThroughput: {ReadCapacityUnits: 1, WriteCapacityUnits: 1}
            }
          ],
          KeySchema: [
            {AttributeName: 'id', KeyType: 'HASH'}
          ],
          ProvisionedThroughput: {ReadCapacityUnits: 1, WriteCapacityUnits: 1},
          TableName: this._dynamoMigrationTableName
        };

        console.log('creating migration table.')

        this._db.createTable(migTable, function (error, data) {
          if (error) {
            console.log("Migration table creation error: ", error);
            throw new Error("failed to create migrations table");
          }
          callback();
        });
      } else {
        callback();
      }
    });
  }
}
