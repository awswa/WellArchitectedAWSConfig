const { WellArchitectedClient, UpdateAnswerCommand } = require("@aws-sdk/client-wellarchitected");
const { DynamoDBClient, QueryCommand, PutItemCommand } = require("@aws-sdk/client-dynamodb");

async function UpdateAnswer(answers){
    const WAclient = new WellArchitectedClient({ region: "us-east-1" });
    const DBclient = new DynamoDBClient({ region: "us-east-1" });
    console.log("Updating Answer...Please wait.");
    //console.log("results: ", answers);

    try{
        //const id= 'SEC-3.7';
        let iteration = 0;
        IDs = answers;
        IDs.forEach(async (ID) => {
            // Retrieve Contol ID from WAQuestionTable table
            const id = ID.ControlID.S;
            const input = {
                TableName : 'WAQuestionTable',
                ExpressionAttributeValues: {
                    ':id': { S: id}
                },
                KeyConditionExpression: 'id = :id',
                // Need only ControlID to answer the particular best practice in question
                ProjectionExpression: 'QuestionId,ChoiceId',
            };
            //console.log(input);
            // Get QuestionId and ChoiceID to update answer in your workload
            const command = new QueryCommand(input);
            const result = await DBclient.send(command);

            //console.log('ChoiceID: ', result.Items[0].ChoiceId.S);
            //console.log('QuestionId: ', result.Items[0].QuestionId.S);

            const ChoiceId = result.Items[0].ChoiceId.S;
            const QuestionId = result.Items[0].QuestionId.S;

            //Update answer in your workload
            const params = {
                LensAlias: 'wellarchitected',
                QuestionId: QuestionId,
                WorkloadId: 'XXXXXXXXXXXXXXX',
                ChoiceUpdates: {
                    [ChoiceId] : {
                        Status: 'SELECTED'
                    }
                },
            }
            
            //console.log(params);
            // adding artificial delay for 600ms to avoid write conflicts

            //const WAcommand = new UpdateAnswerCommand(params);
            //const response = await WAclient.send(WAcommand);
            //console.log(QuestionId, response);
            //delay between each call to UpdateAnswer
            const response = sleep(UpdateWA, WAclient, params, iteration);
            iteration += 1;
        })


        //test param to test out the artifical delay
        /*
        const params = {
            LensAlias: 'wellarchitected',
            QuestionId: 'permissions',
            WorkloadId: 'b42cbfef6ff80e452190ddc4e690bbe4',
            ChoiceUpdates: { 'sec_permissions_emergency_process' : { Status: 'SELECTED' } }
        }

        const response = sleep(UpdateWA, WAclient, params, iteration)
        */
        return true;

    } catch(err){
        console.error(err);
        return false;
    }
}

// wait 2s before calling UpdateWA(WAclient, params)
// Sleep in an exponential manner.
function sleep (UpdateWA, WAclient, params, iteration) {
    //console.log(iteration);
    return new Promise((resolve) => {
        setTimeout(() => resolve(UpdateWA(WAclient, params)), (iteration+1) * 1000);
    })
}

// update answer in WA
async function UpdateWA(WAclient, params){
        const WAcommand = new UpdateAnswerCommand(params);
        const response = await WAclient.send(WAcommand);
        return response;
        //return true;
}

module.exports.UpdateAnswer = UpdateAnswer;
