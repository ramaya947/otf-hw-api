const assert = require('chai').assert;
const API = require('../handler');
const RandomUser = require('randomuser');

const userClient = new RandomUser();

describe('Full API Test', () => {
    let user;

    //Generate New User
    before(() => {
        return new Promise((resolve) => {
            userClient.getUsers({results: 1}, (data) => {
                user = data[0];
                resolve();
            });
        });
    }); 

    it('Saving user', async () => {        
        const event = generateProxyEvent(generateSaveBody(user), 'POST', '/member');
        const response = await API.handleMemberInfo(event);
        const responseBody = JSON.parse(response.body);

        assert(response.statusCode === 200 && responseBody.Message === 'SUCCESS');
    });

    it('Save user with bad email', async () => {
        const event = generateProxyEvent(generateBadSaveBody(user), 'POST', '/member');
        const response = await API.handleMemberInfo(event);
        const responseBody = JSON.parse(response.body);

        assert(response.statusCode === 400 && responseBody.Message === 'ERROR' && responseBody.Error === 'Invalid Email Format');
    });

    it('Getting User', async () => {
        const event = generateProxyEvent({}, 'GET', '/member', { email: user.email });
        const response = await API.handleMemberInfo(event);
        const responseBody = JSON.parse(response.body);

        assert(response.statusCode === 200 && (responseBody.member !== null || responseBody.member !== undefined));
    });

    it('Updating Middle Initial from D to X', async () => {
        const event = generateProxyEvent(generateUpdateBody(user.email, 'middleInitial', 'X'), 'PUT', '/member', {});
        const response = await API.handleMemberInfo(event);
        const responseBody = JSON.parse(response.body);

        assert(response.statusCode === 200 && responseBody.Update.Attributes.middleInitial === 'X');
    });

    it('Delete Previously Created User', async () => {
        const event = generateProxyEvent({}, 'DELETE', '/member', { email: user.email });
        const response = await API.handleMemberInfo(event);
        const responseBody = JSON.parse(response.body);

        assert(response.statusCode === 200 && responseBody.Message === 'SUCCESS');
    });

    it('Ensure User is Gone', async () => {
        const event = generateProxyEvent({}, 'GET', '/member', { email: user.email });
        const response = await API.handleMemberInfo(event);
        const responseBody = JSON.parse(response.body);

        assert(response.statusCode === 200 && (responseBody.member === null || responseBody.member === undefined));
    });

    it('Handle Bad Request', async () => {
        const event = generateProxyEvent({}, 'GET', '/mamber', {});
        const response = await API.handleMemberInfo(event);

        assert(response.statusCode === 404);
    });
})

generateProxyEvent = (body, method, path, qParams) => {
    const event = {
        body: body,
        headers: {},
        httpMethod: method,
        isBase64Encoded: false,
        path: path,
        pathParameters: {},
        queryStringParameters: qParams,
        stageVariables: {},
        requestContext: {},
        resource: ''
    }

    return event;
}

generateUpdateBody = (email, colName, newValue) => {
    return {
        email: email,
        colName: colName,
        newValue: newValue
    }
}

generateBadSaveBody = (info) => {
    return {
        email: 'bademail-com',
        firstName: info.name.first,
        lastName: info.name.last,
        middleInitial: 'D',
        phone: info.cell,
        gender: (info.gender === 'male' ? 'm' : 'f')
    }
}

generateSaveBody = (info) => {
    return {
        email: info.email,
        firstName: info.name.first,
        lastName: info.name.last,
        middleInitial: 'D',
        phone: info.cell,
        gender: (info.gender === 'male' ? 'm' : 'f')
    }
}