import "dotenv/config";
// Node.js Built-in Modules
import fs from "node:fs";

// External Packages
import express, { type Request, type Response } from "express";
import logger from "morgan";

// Local Modules
import { prisma } from "./lib/prisma";
import type { Payload } from "./types/payload";

const app = express();
const PORT = process.env.PORT || 3005;

// Configuração dos middlewares
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Middleware para verificar certificado do cliente (mTLS)
app.use((req: Request, res: Response, next) => {
  // Verificar se o certificado do cliente foi validado pelo Nginx
  const clientVerify = req.headers["x-ssl-client-verify"];
  const clientDN = req.headers["x-ssl-client-dn"];

  console.log("🔐 Cliente SSL Verify:", clientVerify);
  console.log("🔐 Cliente DN:", clientDN);

  // Se não for uma verificação válida, rejeitar
  if (clientVerify !== "SUCCESS") {
    console.log("❌ Certificado do cliente não válido");
    return res.status(403).json({ error: "Certificado não autorizado" });
  }

  next();
});

// --- APENAS SERVIDOR HTTP (Nginx fará o mTLS) ---
app.listen(PORT, () => {
  console.log(`Servidor HTTP rodando na porta ${PORT}`);
  console.log(
    `Webhook disponível em: https://webhook.sisnato.com.br/webhook/pix`
  );
});

app.post("/webhook", (req: Request, res: Response) => {
  console.log("🚀 ~ req.body:", req.body);
    fs.appendFileSync("payload.json", `${JSON.stringify(req.body, null, 2)}\n`);
  res.status(200).end();
});

/**
 * Endpoint unificado para o webhook da Efí na rota '/pix'.
 * Lida tanto com o Handshake de validação (corpo vazio) quanto com o recebimento
 * de notificações de pagamento PIX (corpo com payload).
 * A Efí exige que esta rota seja cadastrada como: https://webhook.sisnato.com.br/webhook/pix
 */
app.post("/webhook/pix", async (req: Request, res: Response) => {
  const payload: Payload = req.body;
  console.log("🚀 ~ Webhook PIX recebido:", req.body);
  console.log("🔐 ~ Headers SSL:", {
    verify: req.headers["x-ssl-client-verify"],
    dn: req.headers["x-ssl-client-dn"],
    serial: req.headers["x-ssl-client-serial"]
  });

  // Salvar log no arquivo payload.json
  fs.appendFileSync(
    "payload.json",
    `${JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        headers: {
          verify: req.headers["x-ssl-client-verify"],
          dn: req.headers["x-ssl-client-dn"]
        },
        payload
      },
      null,
      2
    )}\n\n`
  );

  // Verificar se é um handshake (corpo vazio) ou notificação real
  if (!payload || Object.keys(payload).length === 0) {
    console.log("📝 Handshake de validação recebido");
    return res.status(200).end();
  }

  if (payload?.pix?.length > 0) {
    console.log(`📦 Processando ${payload.pix.length} transação(ões) PIX`);

    try {
      for (const item of payload.pix) {
        const txid = item.txid;
        const valor = parseFloat(item.valor);
        const horario = item.horario;
        const infoPagador = item.infoPagador;
        const nomePagador = item.gnExtras?.pagador?.nome;
        const documentoPagador =
          item.gnExtras?.pagador?.cnpj || item.gnExtras?.pagador?.cpf;
        const banco = item.gnExtras?.pagador?.codigoBanco;

        console.log(`🔍 Buscando solicitação para TXID: ${txid}`);

        const solicitacao: any = await prisma.read.solicitacao.findFirst({
          where: {
            txid: txid
          }
        });

        fs.appendFileSync(
          "payload.json",
          `${JSON.stringify(
            `Solicitacao encontrada: ${solicitacao?.id || "Nao encontrado"}`,
            null,
            2
          )}\n\n`
        );

        if (solicitacao?.id) {
          console.log(`💾 Atualizando solicitação ID: ${solicitacao.id}`);

          const update = await prisma.write.solicitacao.update({
            where: {
              id: solicitacao.id
            },
            data: {
              valorcd: valor,
              pg_date: new Date(horario).toISOString(),
              pg_status: true,
              pg_andamento: "PAGO",
              estatos_pgto: "PAGO"
            }
          });

          fs.appendFileSync(
            "payload.json",
            `${JSON.stringify(update, null, 2)}\n\n`
          );
          console.log(`✅ Solicitação atualizada com sucesso`);
        }

        // Notificar sistema externo
        console.log(`🔔 Enviando notificação para sistema externo`);

        try {
          const response = await fetch(
            "https://pagamento.sisnato.com.br/pagamentos",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                txid: txid,
                dt_pg: new Date(horario).toISOString(),
                valor: valor,
                forma_pagamento: "PIX",
                infoPagador: infoPagador,
                nomePagador: nomePagador,
                documentoPagador: documentoPagador,
                banco: banco
              })
            }
          );

          if (response.ok) {
            console.log(
              `✅ Notificação enviada com sucesso para TXID: ${txid}`
            );
          } else {
            console.error(
              `❌ Erro ao enviar notificação para TXID: ${txid}`,
              response.status
            );
          }
        } catch (error) {
          console.error(`❌ Erro na requisição para sistema externo:`, error);
        }
      }

      // Responder com sucesso após processar tudo
      res.status(200).end();
    } catch (error) {
      console.error("❌ Erro ao processar webhook:", error);
      fs.appendFileSync(
        "payload.json",
        `${JSON.stringify(
          { error: error, timestamp: new Date().toISOString() },
          null,
          2
        )}\n\n`
      );
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  } else {
    console.log("📝 Webhook recebido sem dados PIX");
    res.status(200).end();
  }
});
