export async function sendApprovalMessage(resource: any, subjectName: string, uploaderName: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

  if (!token || !chatId) {
    console.warn("Telegram bot token or chat ID is missing. Skipping notification.");
    return;
  }

  const text = `
📄 *New PDF Uploaded for Review*
*Title:* ${resource.title}
*Subject:* ${subjectName}
*Type:* ${resource.type}
*Uploader:* ${uploaderName || "Anonymous"}
*Description:* ${resource.description || "N/A"}

[View PDF](${resource.fileUrl})
`;

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const body = {
    chat_id: chatId,
    text: text,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ Approve", callback_data: `approve_${resource.id}` },
          { text: "❌ Reject", callback_data: `reject_${resource.id}` }
        ]
      ]
    }
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error("Failed to send Telegram message:", await res.text());
    }
  } catch (error) {
    console.error("Error sending Telegram message:", error);
  }
}
