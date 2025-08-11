import "dotenv/config";
// Node.js Built-in Modules
import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import type { TLSSocket } from "node:tls";

// External Packages
import express, { type Request, type Response } from "express";
import logger from "morgan";

// Local Modules
import type { Payload } from "./types/payload";

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
const privateKeyDir = process.env.SSL_CERT_PATH
  ? path.resolve(process.env.SSL_CERT_PATH)
  : path.join(certsDir, "private");

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
  ca: fs.readFileSync(path.join(caDir, "certificate-chain-homolog.crt")),
  /**
   * Exige que o cliente (Efí) apresente um certificado.
   */
  requestCert: true,
  /**
   * Rejeita qualquer conexão cujo certificado não seja assinado pela CA fornecida.
   * Garante que apenas a Efí possa se conectar.
   */
  rejectUnauthorized: true,
  /**
   * Define a versão mínima do TLS, conforme exigido pela Efí.
   */
  minVersion: "TLSv1.2" as const
};

/**
 * Cria uma instância do servidor HTTPS, aplicando as opções de mTLS ao app Express.
 */
const server = https.createServer(options, app);

/**
 * Endpoint unificado para o webhook da Efí na rota '/pix'.
 * Lida tanto com o Handshake de validação (corpo vazio) quanto com o recebimento
 * de notificações de pagamento PIX (corpo com payload).
 * A Efí exige que esta rota seja cadastrada como: https://SEUDOMINIO.com/pix
 */
app.post("/pix", (req: Request, res: Response) => {
  // 1. Valida se a conexão foi autenticada via mTLS.
  if (!(req.socket as TLSSocket).authorized) {
    console.warn("Conexão não autorizada na rota /pix. Recusado.");
    return res.status(401).send("Cliente não autorizado.");
  }

  const payload: Payload = req.body;

  // 2. Verifica se é uma notificação de pagamento ou um handshake.
  if (payload?.pix?.length > 0) {
    // É uma notificação de pagamento
    console.log("Webhook PIX recebido:", JSON.stringify(payload, null, 2));
    fs.writeFileSync("payload.json", JSON.stringify(payload, null, 2));
    // TODO: Adicionar a lógica para processar o payload (salvar no banco, etc.)
    res.status(200).send("Notificação recebida.");
  } else {
    // É um Handshake de validação (corpo da requisição vazio)
    console.log("Handshake do Webhook validado com sucesso.");
    res.status(200).end();
  }
});

server.listen(PORT, () =>
  console.log(`Servidor HTTPS com mTLS rodando na porta ${PORT}`)
);
