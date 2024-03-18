import { SQSEvent, Handler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { InputOrdenCompra } from "./models/InputOrdenCompra";
import moment from "moment-timezone";

const dynamoDBClient = new DynamoDBClient({ region: "us-east-1" });
const ddbDocClient = DynamoDBDocumentClient.from(dynamoDBClient);

export const handler: Handler = async (event: SQSEvent) => {

  for (const record of event.Records) {
    const ordenCompraData = JSON.parse(record.body) as InputOrdenCompra;

    console.info(`Starting Domicilios - Orden Compra ID: ${ordenCompraData.ordenCompraId}`);

    try {

      if (!ordenCompraData.data.mockDLQ?.process) {
        throw new Error("MockDLQ process is in false");
      }

      const timezone = 'America/Bogota';
      const currentTime = moment().tz(timezone).format();

      const item = {
        TableName: "DynamoDb-Orden-Compra",
        Key: { ordenCompraId: ordenCompraData.ordenCompraId },
        UpdateExpression: "SET stages.domiciliosProcessed.success = :successDomiciliosProcessed, stages.domiciliosProcessed.updatedAt = :successUpdatedAt, updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":successDomiciliosProcessed": true,
          ":successUpdatedAt": currentTime.toString(),
          ":updatedAt": currentTime.toString(),
        },
      };

      await ddbDocClient.send(new UpdateCommand(item));

      console.info(`Domicilios - Orden Compra ID: ${ordenCompraData.ordenCompraId} Processed`);
    } catch (errDynamoDb) {
      console.error("Error processing record", record, errDynamoDb);
      throw new Error(`Errors occurred processing records: ${errDynamoDb}`);
    }
  }
};