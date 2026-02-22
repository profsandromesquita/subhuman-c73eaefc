/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Redefinir sua senha no {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://akkbfzfjappludgsrwsw.supabase.co/storage/v1/object/public/email-assets/logo-subhumano.svg?v=1"
          alt="Subhumano"
          width="140"
          style={logo}
        />
        <Heading style={h1}>Redefinir senha</Heading>
        <Text style={text}>
          Recebemos uma solicitação para redefinir sua senha no {siteName}. Clique no botão abaixo para escolher uma nova senha.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Redefinir senha
        </Button>
        <Text style={footer}>
          Se você não solicitou a redefinição de senha, pode ignorar este e-mail. Sua senha não será alterada.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: "Inter, 'Helvetica Neue', Arial, sans-serif" }
const container = { padding: '32px 24px' }
const logo = { margin: '0 0 24px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#000000',
  margin: '0 0 20px',
  letterSpacing: '-0.02em',
}
const text = {
  fontSize: '14px',
  color: '#6b7280',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const button = {
  backgroundColor: '#000000',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600' as const,
  borderRadius: '8px',
  padding: '12px 24px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#9ca3af', margin: '32px 0 0' }
