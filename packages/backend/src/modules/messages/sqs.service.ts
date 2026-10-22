import {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  GetQueueUrlCommand,
} from "@aws-sdk/client-sqs";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class SqsService {
  private readonly logger = new Logger(SqsService.name);
  private readonly sqsClient: SQSClient;
  private queueUrls = new Map<string, string>();

  constructor(private readonly configService: ConfigService) {
    this.sqsClient = new SQSClient({
      region: this.configService.get("AWS_REGION", "sa-east-1"),
      endpoint: this.configService.get("AWS_ENDPOINT_URL"), // LocalStack em dev
    });
  }

  private async getQueueUrl(queueName: string): Promise<string> {
    if (this.queueUrls.has(queueName)) {
      return this.queueUrls.get(queueName)!;
    }

    const command = new GetQueueUrlCommand({
      QueueName: queueName,
    });

    const response = await this.sqsClient.send(command);
    const url = response.QueueUrl!;
    this.queueUrls.set(queueName, url);
    return url;
  }

  async sendMessage(
    queueName: string,
    messageBody: string,
    messageAttributes?: Record<string, { DataType: string; StringValue: string }>
  ) {
    const queueUrl = await this.getQueueUrl(queueName);

    const command = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: messageBody,
      MessageAttributes: messageAttributes,
    });

    const response = await this.sqsClient.send(command);
    this.logger.log(`Mensagem enviada para ${queueName}: ${response.MessageId}`);
    return response.MessageId;
  }

  async receiveMessages(
    queueName: string,
    maxNumberOfMessages: number = 10,
    waitTimeSeconds: number = 20
  ) {
    const queueUrl = await this.getQueueUrl(queueName);

    const command = new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: maxNumberOfMessages,
      WaitTimeSeconds: waitTimeSeconds,
      AttributeNames: ["All"],
      MessageAttributeNames: ["All"],
    });

    const response = await this.sqsClient.send(command);
    return response.Messages || [];
  }

  async deleteMessage(queueName: string, receiptHandle: string) {
    const queueUrl = await this.getQueueUrl(queueName);

    const command = new DeleteMessageCommand({
      QueueUrl: queueUrl,
      ReceiptHandle: receiptHandle,
    });

    await this.sqsClient.send(command);
  }
}
