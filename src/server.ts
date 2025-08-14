import "dotenv/config";
// Node.js Built-in Modules
import fs from "node:fs";
import https from "node:https";
import path from "node:path";

// External Packages
import express, { type Request, type Response } from "express";
import logger from "morgan";

// Local Modules
import type { Payload } from "./types/payload";
import { prisma } from "./lib/prisma";

const app = express();
const PORT = process.env.PORT || 3005;

// Configuração dos middlewares
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// --- Configuração do Servidor HTTPS com mTLS ---

/**
 * Define os caminhos para os certificados TLS/mTLS.
 * Utiliza a variável de ambiente SSL_CERT_PATH para o diretório do certificado do domínio,
 * ou assume um subdiretório 'private' dentro de 'certs' como padrão.
 */
const certsDir = path.join(process.cwd(), "certs");
const caDir = path.join(certsDir, "public");
console.log("🚀 ~ caDir:", caDir);
const privateKeyDir = process.env.SSL_CERT_PATH
  ? path.resolve(process.env.SSL_CERT_PATH)
  : path.join(certsDir, "private");
console.log("🚀 ~ privateKeyDir:", privateKeyDir);

/**
 * Opções de configuração para o servidor HTTPS com mTLS (Mutual TLS).
 */
const options = {
  /**
   * Chave privada do seu certificado de domínio (privkey.pem).
   */
  key: fs.readFileSync(path.join(privateKeyDir, "privkey.pem")),
  /**
   * Certificado público do seu domínio (fullchain.pem).
   */
  cert: fs.readFileSync(path.join(privateKeyDir, "fullchain.pem")),
  /**
   * Certificado da Autoridade Certificadora (CA) da Efí.
   * Usado para validar o certificado apresentado pelo cliente (Efí).
   */
  // ca: fs.readFileSync(path.join(caDir, "certificate-chain-prod.crt")),
  ca: fs.readFileSync(path.join(caDir, "certificate-chain-homolog.crt")),
  /**
   * Exige que o cliente (Efí) apresente um certificado.
   */
  requestCert: true,
  /**
   * Rejeita qualquer conexão cujo certificado não seja assinado pela CA fornecida.
   * Garante que apenas a Efí possa se conectar.
   */
  rejectUnauthorized: false,
  /**
   * Define a versão mínima do TLS, conforme exigido pela Efí.
   */
  minVersion: "TLSv1.2" as const
};

/**
 * Cria uma instância do servidor HTTPS, aplicando as opções de mTLS ao app Express.
 */
// Servidor HTTP para o proxy NGINX
app.listen(PORT, () => {
  console.log(`Servidor HTTP rodando na porta ${PORT}`);
});

// Servidor HTTPS com mTLS para acesso direto
const httpsServer = https.createServer(options, app);
httpsServer.listen(3004, () => {
  console.log(`Servidor HTTPS com mTLS rodando na porta 3004`);
});

app.post("/webhook", (req: Request, res: Response) => {
  fs.writeFileSync("payload.json", JSON.stringify(req.body, null, 2));
  res.status(200).end();
});

/**
 * Endpoint unificado para o webhook da Efí na rota '/pix'.
 * Lida tanto com o Handshake de validação (corpo vazio) quanto com o recebimento
 * de notificações de pagamento PIX (corpo com payload).
 * A Efí exige que esta rota seja cadastrada como: https://SEUDOMINIO.com/pix
 */
app.post("/webhook/pix", async (req: Request, res: Response) => {
  const payload: Payload = req.body;
  if (payload?.pix?.length > 0) {
    // responder depois de processar o payload
    if (payload.pix[0].txid) {
      res.status(200).end();
    }
    for (const item of payload.pix) {
      const txid = item.txid;
      const valor = parseFloat(item.valor);
      const horario = item.horario;

      const solicitacao: any = await prisma.read.solicitacao.findFirst({
        where: {
          txid: txid
        }
      });

      if (solicitacao?.id) {
        await prisma.write.solicitacao.update({
          where: {
            id: solicitacao.id
          },
          data: {
            valorcd: valor,
            pg_date: new Date(horario),
            pg_status: true,
            pg_andamento: "PAGO",
            estatos_pgto: "PAGO"
          }
        });
      }
      console.log("Webhook PIX recebido:", JSON.stringify(item, null, 2));
      fs.writeFileSync("payload_pix.json", JSON.stringify(item, null, 2));
    }
  } else {
    res.status(200).end();
  }
});
