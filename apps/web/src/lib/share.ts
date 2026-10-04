/** What an invite says, in the person's own words, with the link on its own line. */
export const inviteText = (link: string): string =>
  `Join me on Àjọ, where we save together. Here's my invite:\n${link}`;

export const whatsAppUrl = (link: string): string =>
  `https://wa.me/?text=${encodeURIComponent(inviteText(link))}`;
export const smsUrl = (link: string): string =>
  `sms:?&body=${encodeURIComponent(inviteText(link))}`;
