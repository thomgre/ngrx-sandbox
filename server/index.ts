var AWS = require("aws-sdk");
var dm = require("dynamodb-migrations");


class App {
  start(): void {
      console.log("Applications started");
  }

  migrate(): void {
    console.log("Database migration");
    var options = {region: 'localhost', endpoint: "http://localhost:8000"},
      dynamodb = {raw: new AWS.DynamoDB(options), doc: new AWS.DynamoDB.DocumentClient(options)};

    var path = require('path');
    var relPath = 'migrations';
    var absolutePath = path.dirname(__filename) + '/' + relPath;

    var dynamodb = {raw: new AWS.DynamoDB(), doc: new AWS.DynamoDB.DocumentClient()};
    dm.init(dynamodb, absolutePath);
    dm.create('sampleTable');
    dm.execute('sampleTable', {prefix: 'dev-', suffix: '-sample'});

  }

}

let app = new App();

app.migrate();


