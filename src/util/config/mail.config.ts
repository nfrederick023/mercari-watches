import SMTPTransport from "nodemailer/lib/smtp-transport";

export const mailConfig: SMTPTransport.Options = {
  host: '',
  port: 25,
  secure: false,
  auth: {
    user: '',
    pass: '',
  },
}

export const fromEmail = ""