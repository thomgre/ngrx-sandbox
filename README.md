

Docker
--
We will use dockerize development to setup a testing environment.

On linux
1
```bash
$ sudo apt-get -y install docker-engine
```
refer to [Guide](https://docs.docker.com/engine/installation/linux/ubuntu/)


**DynamoDB Local**

I'll setup a locla docker container to handle a local docker setup 
with replica of the database from json.

Setup steps

To pull and install the container
```bash
$ docker pull forty8bit/dynamodb-local
```

To run the container (might require sudo)
```bash
$ docker run -p 8000:8000 forty8bit/dynamodb-local -sharedDb
```

A runner has been specified in the package.json so i can run the 
```bash
$ npm run dynamo:local
```

to stop running you have to break execution in the shell you run the 
the docker container. The dynamodb container can be accessed at 
the address [http://localhost:8000/shell](http://localhost:8000/shell).

**Lambda Function Local**

In the same way of the local dynamo, we will replicate the test environment 
using a docker image for *aws lambda function* so we can easy mockup 
an environment where to install the lambda function as if the where
working on AWS.

```bash
$ docker run -v \"$PWD\":/var/task lambci/lambda
```
