const { ConfigServiceClient, DescribeConformancePackComplianceCommand } = require("@aws-sdk/client-config-service");
const { DynamoDBClient, QueryCommand } = require("@aws-sdk/client-dynamodb");
const { UpdateAnswer } = require('./UpdateAnswer');

exports.handler= async function DescribeConformancePack(event){
    const client = new ConfigServiceClient({ region: "us-east-1" });
    const DBclient = new DynamoDBClient({ region: "us-east-1" });

    try{
        //collect all rules without next token
        input = {
            ConformancePackName: 'SecurityPillar',
        }
        //Get the first 50 rules in conformance pack
        const command = new DescribeConformancePackComplianceCommand(input);
        const response = await client.send(command);
        let token = response.NextToken;
        const ConfigRules = response.ConformancePackRuleComplianceList;
        //If more than 50, get the rest of rules in conformance pack
        while (token){
            //console.log(token);

            //collect all rules with next token
            next_rules = {
                    ConformancePackName: 'SecurityPillar',
                    NextToken: token,
                }
            const Rules = new DescribeConformancePackComplianceCommand(next_rules);
            const NewResponse = await client.send(Rules);

            //Add newly found ConfigRuleName into all ConfigRuleName
            ConfigRules.push.apply(ConfigRules, NewResponse.ConformancePackRuleComplianceList);

            // retrieve the next set of ConfigRuleName if exists
            token = NewResponse.NextToken;
        }

        //get WA question id and choice id that we need to update answer in WAFR
        GetQuestionID(ConfigRules, DBclient);
        return true;

    }catch(err){
        console.error(err);
    }
}

async function GetQuestionID(ConfigRules, DBclient){
    try{
        let iteration = 0;
        ConfigRules.forEach(async (ConfigRule) => {
            //If it's compliant based on rules in AWS config, let's retrieve ControlID which is mapped to WA Question and Choice
            if (ConfigRule.ComplianceType == 'COMPLIANT') {
                const AWSConfigRule = ConfigRule.ConfigRuleName.substring(0, ConfigRule.ConfigRuleName.indexOf('-conformance'));
                const params = {
                    TableName: "WAConfigRules",
                    //TableName : 'WAConfigRuleMapping',
                    ExpressionAttributeValues: {
                        ':AWSConfigRule': { S: AWSConfigRule}
                    },
                    KeyConditionExpression: 'AWSConfigRule = :AWSConfigRule',
                    // Need only ControlID to answer the particular best practice in question
                    ProjectionExpression: 'ControlID',
                };
                //console.log(params);
                const command = new QueryCommand(params);
                const result = await DBclient.send(command);
                //console.log(result.Items);
                const answer = await UpdateAnswer(result, iteration);
                console.log("iteration in describe:", iteration);
            }
            //else {
            //    console.log('not compliant or insufficient data');
            //}
        })
        return true;
    } catch (err){
        console.error(err);
        return false;
    }
}
