import Any = jasmine.Any;
import * as DynamoDB from "aws-sdk/clients/dynamodb";


let AWS = require('aws-sdk');
let attr = require('dynamodb-data-types').AttributeValue;
let fs = require('fs');

export class Migration {
  _db: DynamoDB;
  _migrationPath: string;
  _dynamoMigrationTableName: string;

  /**
   *
   * @param db {DynamoDB} - connection to the dynamodb
   * @param path {string} - path to the migration folder containing migration files
   * @param migrationTableName {string} - optional name of migration table configf
   */
  constructor(db: DynamoDB, path: string, migrationTableName: string = null) {
    this._db = db;
    this._migrationPath = path;
    this._dynamoMigrationTableName = migrationTableName || "MY_DYNAMO_MIGRATION_TABLE";
  }

  /**
   * Dumps the content of the migration table
   */
  list(): void {
    let params = {
      TableName: this._dynamoMigrationTableName
    };

    this._db.scan(params, (err, data) => {
      if (err) {
        console.log(err);
        return;
      }

      console.log(data);
    });
  }

  /**
   * @desc
   * check if migration already ran, otherwise run migration files
   * reading from specified folder.
   *
   */
  migrate(): void {

    fs.readdir(this._migrationPath, (err, files) => {
      if (err) {
        console.error("Unable to get content from dynamo-migrations folder. Reason: ", err);
      }

      this.checkAndCreateMigrationTable((err) => {
        if (err) {
          throw err;
        }

        this.executeMigrations(files, (err, data) => {
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
        if (typeof callback === 'function') {
          callback(null, null);
        }
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
  private executeMigrations(files: string[], callback): void {
    var filename = files[0];
    var fileLocation = this._migrationPath + '/' + filename;
    var migration = require(fileLocation);

    console.log('MIG', fileLocation);

    if (typeof migration.migrate === 'function') {
      console.log("call back found");

      var executeNext = (files, callback2) => {

        if (files.length == 1) {
          if (typeof callback === 'function') {
            callback();
          }
        } else {
          var filtered = files.slice(1, files.length);
          this.executeMigrations(filtered, callback);
        }
      }

      this.checkIfMigrationAlreadyRan(filename, (err) => {
        if (err) {
          throw err;
        }

        console.log('running migration: ', fileLocation);
        migration.migrate((err) => {
          if (err) {
            throw err;
          }

          this.saveMigrationInformation(filename, (err) => {
            console.log('is this');
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
  saveMigrationInformation(filename, callback): void {
    this._db.describeTable({TableName: this._dynamoMigrationTableName}, (err, data) => {

      this._db.putItem({
        Item: attr.wrap({
          id: data.Table.ItemCount + 1,
          name: filename,
          status: 'success',
          createdat: new Date().toISOString()
        }),
        TableName: this._dynamoMigrationTableName
      }, (err, data) => {
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
  checkAndCreateMigrationTable(callback): void {
    this._db.describeTable({TableName: this._dynamoMigrationTableName}, (err, data) => {

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

        this._db.createTable(migTable, (error, data) => {
          if (error) {
            console.log("Migration table creation error: ", error);
            throw new Error("failed to create migrations table");
          }
          callback();
        });

      } else {
        console.log(err);
        if (typeof callback === 'function') {
          callback(err);
        }
      }
    });
  }
}
