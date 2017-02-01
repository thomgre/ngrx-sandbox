import {Migration} from "./migration";
import * as DynamoDB from "aws-sdk/clients/dynamodb";

let path = require('path');
let AWS = require('aws-sdk');
let attr = require('dynamodb-data-types').AttributeValue;
let fs = require('fs');

class App {
  _dynamo: DynamoDB;
  _migrate: Migration;

  start(): void {
    console.log("Applications started");
    this._dynamo = new AWS.DynamoDB({
      region: "localhost",
      endpoint: new AWS.Endpoint("http://localhost:8000")
    });
  }

  migrate(): void {

    this._migrate = new Migration(this._dynamo, path.dirname(__filename) + '/migrations');
    this._migrate.migrate();
    this._migrate.list();
  }
}

let app = new App();

app.start();
app.migrate();
