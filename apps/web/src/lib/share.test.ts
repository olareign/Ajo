import { inviteText, smsUrl, whatsAppUrl } from "./share";

describe("sharing an invite", () => {
  const link = "https://app.ajo.test/join/K7M2QH9R";
  it("puts the link on its own line, in plain words", () => {
    expect(inviteText(link)).toBe(
      `Join me on Àjọ, where we save together. Here's my invite:\n${link}`,
    );
  });
  it("makes a WhatsApp and an SMS link with the whole message encoded", () => {
    expect(whatsAppUrl(link)).toBe(`https://wa.me/?text=${encodeURIComponent(inviteText(link))}`);
    expect(smsUrl(link)).toBe(`sms:?&body=${encodeURIComponent(inviteText(link))}`);
    expect(whatsAppUrl(link)).not.toContain(" ");
  });
});
