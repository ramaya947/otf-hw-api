"use strict";
const AWS = require('aws-sdk');
AWS.config.update({
  region: 'us-east-1',
});

const ddb = new AWS.DynamoDB.DocumentClient();
const ddbTableName = 'otf-members'

module.exports.handleMemberInfo = async (event) => {
  const path = event.path;
  const method = event.httpMethod;
  const qParams = event.queryStringParameters;
  let response;

  switch (true) {
    case path === '/members' && method === 'GET':
      response = await getAllMembers();
      break;
    case path === '/member' && method === 'GET':
      response = await getMember(qParams.email);
      break;
    case path === '/member' && method === 'POST':
      response = await saveMember(event.body);
      break;
    case path === '/member' && method === 'PUT':
      response = await updateMember(event.body);
      break;
    case path === '/member' && method === 'DELETE':
      response = await deleteMember(qParams.email);
      break;
    default:
      response = createResponse(404, '404 Not Found');
  }

  return response;
};

const updateMember = async (info) => {
  info = (info.constructor == Object) ? info : JSON.parse(info);

  const params = {
    TableName: ddbTableName,
    Key: {
      'email': info.email
    },
    UpdateExpression: `set ${info.colName} = :value`,
    ExpressionAttributeValues: {
      ':value': info.newValue
    },
    ConditionExpression: 'attribute_exists(email)',
    ReturnValues: 'UPDATED_NEW'
  }

  let response, responseBody;
  try {
    response = await ddb.update(params).promise();

    responseBody = {
      Operation: 'UPDATE',
      Message: 'SUCCESS',
      Update: response
    }

    return createResponse(200, responseBody);
  } catch (err) {
    responseBody = {
      Operation: 'UPDATE',
      Message: 'ERROR',
      Error: err.code + ((err.code === 'ConditionalCheckFailedException') ? ': Member does not exist' : '')
    }

    return createResponse(err.statusCode, responseBody);
  }
}

const deleteMember = async (email) => {
  const params = {
    TableName: ddbTableName,
    Key: {
      'email': email
    },
    ReturnValues: 'ALL_OLD'
  }

  let response, responseBody;
  try {
    response = await ddb.delete(params).promise();

    responseBody = {
      Operation: 'DELETE',
      Message: 'SUCCESS',
      Item: response
    }

    return createResponse(200, responseBody);
  } catch (err) {
    responseBody = {
      Operation: 'DELETE',
      Message: 'ERROR',
      Error: err.code
    }

    return createResponse(err.statusCode, responseBody);
  }
}

const saveMember = async (info) => {
  const params = {
    TableName: ddbTableName,
    Item: (info.constructor == Object) ? info : JSON.parse(info),
    ConditionExpression: 'attribute_not_exists(email)'
  }

  let responseBody;
  if (!validateEmail(params.Item.email)) {
    responseBody = {
      Operation: 'SAVE',
      Message: 'ERROR',
      Error: 'Invalid Email Format'
    }

    return createResponse(400, responseBody);
  }

  try {
    await ddb.put(params).promise();

    responseBody = {
      Operation: 'SAVE',
      Message: 'SUCCESS',
      Item: info
    }

    return createResponse(200, responseBody);
  } catch (err) {
    responseBody = {
      Operation: 'SAVE',
      Message: 'ERROR',
      Error: err.code + ((err.code === 'ConditionalCheckFailedException') ? ': Member already exists' : '')
    }

    return createResponse(err.statusCode, responseBody);
  }
}

const getMember = async (email) => {
  const params = {
    TableName: ddbTableName,
    Key: {
      'email': email
    }
  }

  let member;
  try {
    member = await ddb.get(params).promise();
  } catch (err) {
    return createResponse(err.statusCode, { errorCode: err.statusCode, error: err.code });
  }

  return createResponse(200, { member: member.Item });
}

const getAllMembers = async () => {
  const params = {
    TableName: ddbTableName
  }

  let allMembers;
  try {
    allMembers = await scanTable(params, []);
  } catch (err) {
    return createResponse(err.statusCode, { errorCode: err.statusCode, error: err.code } );
  }

  return createResponse(200, { members: allMembers });
}

const scanTable = async (params, items) => {
  const data = await ddb.scan(params).promise();

  items = items.concat(data.Items);

  if (data.LastEvaluatedKey) {
    params.ExclusiveStartKey = data.LastEvaluatedKey;

    return await scanTable(params, items);
  }

  return items;
}

const validateEmail = (email) => {
  const res = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return res.test(String(email).toLowerCase());
}

const createResponse = (status, body) => {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  }
}