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
const PORT = process.env.PORT || 3000;

// Configuração dos middlewares
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// --- Configuração do Servidor HTTPS com mTLS ---

// Caminho para a pasta de certificados
const certsDir = path.join(__dirname, "..", "certs");
const caDir = path.join(certsDir, "public");
const rotaPrivada = process.env.SSL_CERT_PATH || "private";
const privateDir = path.join(rotaPrivada);

// ATENÇÃO: Coloque os arquivos de certificado corretos na pasta 'certs'
const options = {
  key: fs.readFileSync(path.join(privateDir, "chave-privada.pem")), // Sua chave privada
  cert: fs.readFileSync(path.join(privateDir, "certificado.pem")), // Seu certificado
  ca: fs.readFileSync(path.join(caDir, "certificate-chain-homolog.crt")), // Certificado da CA da Efí

  // Exige que o cliente (Efí) envie um certificado
  requestCert: true,

  // Rejeita qualquer conexão que não tenha um certificado válido assinado pela CA da Efí
  rejectUnauthorized: true,
  minVersion: "TLSv1.2" as const
};

// Cria o servidor HTTPS com as opções de mTLS
const server = https.createServer(options, app);

// Endpoint para configuração do webhook, você precisa cadastrar https://SEUDOMINIO.com/webhook
app.post("/", (request, response) => {
  // Verifica se a requisição que chegou nesse endpoint foi autorizada
  if ((request.socket as TLSSocket).authorized) {
    response.status(200).end();
  } else {
    response.status(401).end();
  }
});

// Rota para receber o webhook com a tipagem aplicada
app.post("/pix", (req: Request, res: Response) => {
  if ((req.socket as TLSSocket).authorized) {
    const payload: Payload = req.body;

    console.log("Webhook recebido:", payload);

    // A Efí espera uma resposta simples para validar o Hand-Shake
    res.status(200).end();
  } else {
    res.status(401).end();
  }
});

server.listen(PORT, () =>
  console.log(`Servidor HTTPS com mTLS rodando na porta ${PORT}`)
);
