

Docker
--
We will use dockerize development to setup a testin environment

**DynamoDB Local**

I'll setup a locla docker container to handle a local docker setup 
with replica of the database from json.

Setup steps

To pull and install the container
```bash
$ docker pull forty8bit/dynamodb-local
```


To run the container
```bash
$ docker run -p 8000:8000 forty8bit/dynamodb-local -sharedDb