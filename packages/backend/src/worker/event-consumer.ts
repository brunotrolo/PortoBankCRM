import { SqsService } from "../modules/messages/sqs.service";
import { ConfigService } from "@nestjs/config";
import { Logger } from "@nestjs/common";

export async function startWorker(
  sqsService: SqsService,
  configService: ConfigService
) {
  const logger = new Logger("Worker");
  const queueName = "porto-bank-crm-event-log-drain";
  const region = configService.get("AWS_REGION", "sa-east-1");

  logger.log(`Worker iniciado. Aguardando mensagens na fila: ${queueName}`);

  while (true) {
    try {
      const messages = await sqsService.receiveMessages(queueName, 10, 20);

      for (const message of messages) {
        try {
          logger.log(`Processando mensagem: ${message.MessageId}`);

          const payload = JSON.parse(message.Body || "{}");
          await processEvent(payload);

          // Deleta a mensagem após processamento bem-sucedido
          if (message.ReceiptHandle) {
            await sqsService.deleteMessage(queueName, message.ReceiptHandle);
          }
        } catch (err: any) {
          logger.error(`Erro ao processar mensagem ${message.MessageId}`, err.message);
          // Não deletar — a mensagem volta para a fila após o visibility timeout
          // Ou pode ser enviada para DLQ após maxReceiveCount
        }
      }
    } catch (err: any) {
      logger.error("Erro no loop do worker", err.message);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

async function processEvent(payload: any) {
  const { eventType, entityKind, payload: eventPayload, metadata } = payload;

  logger.log(`Processando evento: ${eventType} (${entityKind})`);

  switch (eventType) {
    case "message.send":
      await handleMessageSend(eventPayload);
      break;
    case "lead.created":
      await handleLeadCreated(eventPayload);
      break;
    case "lead.stage_changed":
      await handleLeadStageChanged(eventPayload);
      break;
    case "lgpd.request":
      await handleLgpdRequest(eventPayload);
      break;
    default:
      logger.warn(`Tipo de evento não tratado: ${eventType}`);
  }
}

async function handleMessageSend(payload: any) {
  // TODO: Integrar com WAHA API para enviar mensagem via WhatsApp
  logger.log(`Enviando mensagem WhatsApp: ${payload.body}`);
}

async function handleLeadCreated(payload: any) {
  // TODO: Disparar automações QUANDO/SE/ENTÃO
  logger.log(`Lead criado: ${payload.title}`);
}

async function handleLeadStageChanged(payload: any) {
  // TODO: Atualizar kanban, notificar responsável
  logger.log(`Lead mudou de estágio: ${payload.stageId}`);
}

async function handleLgpdRequest(payload: any) {
  // TODO: Processar solicitação LGPD (redação, exportação)
  logger.log(`Solicitação LGPD: ${payload.requestType}`);
}
