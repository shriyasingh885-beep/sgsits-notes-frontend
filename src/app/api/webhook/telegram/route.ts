import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteUploadedFile } from "@/lib/upload";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Check if it's a callback query (inline button press)
    if (body.callback_query) {
      const callbackQuery = body.callback_query;
      const data = callbackQuery.data; // e.g. "approve_xyz" or "reject_xyz"
      const chatId = callbackQuery.message.chat.id;
      const messageId = callbackQuery.message.message_id;

      const [action, resourceId] = data.split("_");

      if (action === "approve" || action === "reject") {
        const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
        
        let textResponse = "";

        if (!resource) {
          textResponse = "Resource not found. It may have already been processed.";
        } else if (resource.status !== "PENDING") {
          textResponse = `Resource was already processed (Current Status: ${resource.status}).`;
        } else {
          if (action === "approve") {
            await prisma.resource.update({
              where: { id: resourceId },
              data: { status: "APPROVED" },
            });
            textResponse = `✅ Approved: ${resource.title}`;
          } else if (action === "reject") {
            // Delete from R2
            await deleteUploadedFile(resource.fileUrl);
            // Delete from DB
            await prisma.resource.delete({
              where: { id: resourceId },
            });
            textResponse = `❌ Rejected & Deleted: ${resource.title}`;
          }
        }

        const token = process.env.TELEGRAM_BOT_TOKEN;
        
        // 1. Answer the callback query so the loading spinner on the button stops
        await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callback_query_id: callbackQuery.id,
            text: action === "approve" ? "Approved!" : "Rejected!",
          }),
        });

        // 2. Edit the original message to remove the buttons and show the outcome
        await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            text: callbackQuery.message.text + `\n\n*STATUS:* ${textResponse}`,
            parse_mode: "Markdown",
            reply_markup: { inline_keyboard: [] } // Clear buttons
          }),
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing Telegram webhook:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
