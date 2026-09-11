// src/lib/mailer.ts
// Abstração de envio de e-mail via nodemailer.
// Se as variáveis SMTP não estiverem configuradas, imprime no console (útil em dev).
import nodemailer from 'nodemailer'
import { env } from '../env'
import { logger } from './logger'

function buildTransporter() {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    return null
  }

  return nodemailer.createTransport({
    host:   env.SMTP_HOST,
    port:   env.SMTP_PORT ?? 587,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  })
}

const transporter = buildTransporter()

interface SendMailOptions {
  to:      string
  subject: string
  html:    string
  text:    string
}

export async function sendMail({ to, subject, html, text }: SendMailOptions): Promise<void> {
  if (!transporter) {
    logger.info({ to, subject, text }, '[DEV] E-mail não enviado — SMTP não configurado. Conteúdo abaixo:')
    return
  }

  await transporter.sendMail({
    from:     env.SMTP_FROM,
    replyTo:  env.SMTP_USER,
    to,
    subject,
    text,
    html,
  })
}
