export type MailboxKind = 'normal' | 'agent';

export type MailboxImapSmtpStatus =
  | 'ready'
  | 'pending'
  | 'retrying'
  | 'unavailable';

export type MailboxHealth = 'no_data' | 'healthy' | 'at_risk' | 'poor';

export interface MailboxServer {
  host: string;
  port: number;
  security: string;
}

/**
 * IMAP/SMTP login for a mailbox. The password is also an API key for that
 * mailbox, so store it like one.
 */
export interface MailboxCredentials {
  username: string;
  password: string;
  imap: MailboxServer;
  smtp: MailboxServer;
}

export interface Mailbox {
  object: 'mailbox';
  id: string;
  address: string;
  kind: MailboxKind;
  agent_inbox_id: string | null;
  imap_smtp: MailboxImapSmtpStatus;
  domain_id: string | null;
  domain: string | null;
  warmup_enabled: boolean;
  warmup_changed_at: string | null;
  created_at: string;
  /** Emails sent in the last 30 days. */
  sent: number;
  /** Emails sent since the mailbox was created. */
  sent_total: number;
  delivered: number;
  bounced: number;
  complained: number;
  last_sent_at: string | null;
  health: MailboxHealth;
  /** Whether POST /emails accepts this address as From now (the API's own rule). */
  can_send: boolean;
  /** Why it cannot send, in a short line; null when it can. */
  send_reason: string | null;
  /** Free mailboxes carry extra fields (`pool`, `origin`, `receive_only`, `sending`...). */
  [key: string]: unknown;
}
