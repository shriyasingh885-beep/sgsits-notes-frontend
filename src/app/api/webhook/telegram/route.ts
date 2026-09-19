import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteUploadedFile, saveBufferToR2 } from "@/lib/upload";
import { createHash } from "crypto";

const token = process.env.TELEGRAM_BOT_TOKEN;

async function sendTelegramMessage(chatId: string | number, text: string, replyMarkup?: any) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
      reply_markup: replyMarkup
    })
  });
}

async function editTelegramMessage(chatId: string | number, messageId: number, text: string, replyMarkup?: any) {
  const url = `https://api.telegram.org/bot${token}/editMessageText`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: "Markdown",
      reply_markup: replyMarkup
    })
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Handle incoming text/document messages
    if (body.message) {
      const chatId = body.message.chat.id;

      // Handle PDF Uploads
      if (body.message.document) {
        const doc = body.message.document;
        if (doc.mime_type !== "application/pdf") {
          await sendTelegramMessage(chatId, "❌ Please send a valid PDF file.");
          return NextResponse.json({ success: true });
        }
        if (doc.file_size > 20 * 1024 * 1024) {
          await sendTelegramMessage(chatId, "❌ File is too large! Telegram bots can only download files under 20MB.");
          return NextResponse.json({ success: true });
        }

        const draft = await prisma.telegramDraft.create({
          data: {
            fileId: doc.file_id,
            fileName: doc.file_name || "Uploaded PDF",
            fileSize: doc.file_size,
            step: "AWAITING_SUBJECT"
          }
        });

        const subjects = await prisma.subject.findMany();
        const inlineKeyboard = [];
        for (let i = 0; i < subjects.length; i += 2) {
          const row = [];
          row.push({ text: subjects[i].code, callback_data: `sub_${draft.id}_${subjects[i].id}` });
          if (subjects[i+1]) row.push({ text: subjects[i+1].code, callback_data: `sub_${draft.id}_${subjects[i+1].id}` });
          inlineKeyboard.push(row);
        }

        await sendTelegramMessage(chatId, `📄 Received: *${doc.file_name}*\n\nPlease select the Subject:`, { inline_keyboard: inlineKeyboard });
        return NextResponse.json({ success: true });
      }

      // Handle /stats Command
      if (body.message.text === "/stats" || body.message.text === "/analytics") {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const [activeUsers, visitorsToday, totalUploads, uploadsToday] = await Promise.all([
          prisma.presence.count({ where: { lastSeen: { gte: new Date(Date.now() - 5 * 60 * 1000) } } }),
          prisma.presence.count({ where: { lastSeen: { gte: startOfDay } } }),
          prisma.resource.count(),
          prisma.resource.count({ where: { createdAt: { gte: startOfDay } } })
        ]);

        const aggr = await prisma.resource.aggregate({ _sum: { downloads: true } });
        const totalDownloads = aggr._sum.downloads || 0;

        const statsText = `📊 *Live Website Analytics*
      
🟢 *Active Users Now:* ${activeUsers}
📅 *Visitors Today:* ${visitorsToday}

📚 *Total Uploads:* ${totalUploads} (↑ ${uploadsToday} today)
⬇️ *Total Downloads:* ${totalDownloads.toLocaleString()}

_(Note: The database keeps a running total of downloads rather than a daily log, so downloads are shown as All-Time)._`;

        await sendTelegramMessage(chatId, statsText);
        return NextResponse.json({ success: true });
      }

      // Handle /delete Command
      if (body.message.text && body.message.text.startsWith("/delete")) {
        const query = body.message.text.replace("/delete", "").trim();
        if (!query) {
          await sendTelegramMessage(chatId, "Please specify a search query. Example:\n`/delete physics`");
          return NextResponse.json({ success: true });
        }

        const results = await prisma.resource.findMany({
          where: { title: { contains: query, mode: "insensitive" } },
          take: 5
        });

        if (results.length === 0) {
          await sendTelegramMessage(chatId, `No PDFs found matching "*${query}*".`);
          return NextResponse.json({ success: true });
        }

        const inlineKeyboard = results.map(r => ([{ text: r.title.substring(0, 40), callback_data: `del_${r.id}` }]));
        await sendTelegramMessage(chatId, `Found ${results.length} results. Click one to delete:`, { inline_keyboard: inlineKeyboard });
        return NextResponse.json({ success: true });
      }

      // Fallback for unhandled messages
      if (body.message.text || body.message.photo || body.message.video) {
        await sendTelegramMessage(chatId, "I only understand PDF documents and the `/delete` or `/stats` commands. Please send a PDF file as a Document!");
        return NextResponse.json({ success: true });
      }
    }


    // 2. Handle Callback Queries
    if (body.callback_query) {
      const cb = body.callback_query;
      const data = cb.data as string;
      const chatId = cb.message.chat.id;
      const messageId = cb.message.message_id;

      // Ensure we clear the loading spinner
      await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: cb.id })
      });

      // --- OLD APPROVAL FLOW ---
      if (data.startsWith("approve_") || data.startsWith("reject_")) {
        const [action, resourceId] = data.split("_");
        const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
        let textResponse = "";
        
        if (!resource) {
           textResponse = "Resource not found.";
        } else if (resource.status !== "PENDING") {
           textResponse = `Already processed (${resource.status}).`;
        } else {
          if (action === "approve") {
            await prisma.resource.update({ where: { id: resourceId }, data: { status: "APPROVED" } });
            textResponse = `✅ Approved: ${resource.title}`;
          } else {
            await deleteUploadedFile(resource.fileUrl);
            await prisma.resource.delete({ where: { id: resourceId } });
            textResponse = `❌ Rejected & Deleted: ${resource.title}`;
          }
        }
        await editTelegramMessage(chatId, messageId, cb.message.text + `\n\n*STATUS:* ${textResponse}`, { inline_keyboard: [] });
        return NextResponse.json({ success: true });
      }

      // --- DELETE CONFIRMATION FLOW ---
      if (data.startsWith("del_")) {
        const resId = data.replace("del_", "");
        const resource = await prisma.resource.findUnique({ where: { id: resId } });
        if (!resource) return NextResponse.json({ success: true });
        
        await editTelegramMessage(chatId, messageId, `Are you sure you want to permanently delete:\n*${resource.title}*?`, {
          inline_keyboard: [
            [{ text: "🚨 YES, DELETE", callback_data: `cdel_${resource.id}` }, { text: "Cancel", callback_data: `ccancel` }]
          ]
        });
        return NextResponse.json({ success: true });
      }
      
      if (data.startsWith("cdel_")) {
        const resId = data.replace("cdel_", "");
        const resource = await prisma.resource.findUnique({ where: { id: resId } });
        if (resource) {
          await deleteUploadedFile(resource.fileUrl);
          await prisma.resource.delete({ where: { id: resId } });
          await editTelegramMessage(chatId, messageId, `🗑️ Deleted: *${resource.title}*`, { inline_keyboard: [] });
        }
        return NextResponse.json({ success: true });
      }

      if (data === "ccancel") {
        await editTelegramMessage(chatId, messageId, "Deletion cancelled.", { inline_keyboard: [] });
        return NextResponse.json({ success: true });
      }

      // --- NEW UPLOAD FLOW ---
      if (data.startsWith("sub_")) {
        const [, draftId, subjectId] = data.split("_");
        await prisma.telegramDraft.update({ where: { id: draftId }, data: { subjectId, step: "AWAITING_TYPE" } });
        await editTelegramMessage(chatId, messageId, "Select Resource Type:", {
          inline_keyboard: [
            [{ text: "Notes", callback_data: `typ_${draftId}_NOTES` }, { text: "Class Slides", callback_data: `typ_${draftId}_SLIDES` }],
            [{ text: "PYQ - MST", callback_data: `typ_${draftId}_PYQ_MST` }, { text: "PYQ - EndSem", callback_data: `typ_${draftId}_PYQ_ENDSEM` }]
          ]
        });
        return NextResponse.json({ success: true });
      }

      if (data.startsWith("typ_")) {
        const [, draftId, typeCode, extra] = data.split("_");
        const fullType = extra ? `${typeCode}_${extra}` : typeCode; 
        
        await prisma.telegramDraft.update({ where: { id: draftId }, data: { type: fullType, step: "AWAITING_YEAR" } });

        if (fullType.startsWith("PYQ")) {
          const year = new Date().getFullYear();
          await editTelegramMessage(chatId, messageId, "Select Exam Year:", {
            inline_keyboard: [
              [{ text: `${year}`, callback_data: `yr_${draftId}_${year}` }, { text: `${year-1}`, callback_data: `yr_${draftId}_${year-1}` }],
              [{ text: `${year-2}`, callback_data: `yr_${draftId}_${year-2}` }, { text: `${year-3}`, callback_data: `yr_${draftId}_${year-3}` }]
            ]
          });
        } else {
          // Finish immediately for Notes/Slides
          await handleFinalUpload(draftId, chatId, messageId);
        }
        return NextResponse.json({ success: true });
      }

      if (data.startsWith("yr_")) {
        const [, draftId, year] = data.split("_");
        await prisma.telegramDraft.update({ where: { id: draftId }, data: { year: parseInt(year) } });
        await handleFinalUpload(draftId, chatId, messageId);
        return NextResponse.json({ success: true });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing Telegram webhook:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

async function handleFinalUpload(draftId: string, chatId: number, messageId: number) {
  await editTelegramMessage(chatId, messageId, "⏳ Downloading from Telegram & Uploading to R2...", { inline_keyboard: [] });
  
  const draft = await prisma.telegramDraft.findUnique({ where: { id: draftId } });
  if (!draft || !draft.subjectId || !draft.type) return;

  const subject = await prisma.subject.findUnique({ where: { id: draft.subjectId } });
  if (!subject) return;

  // 1. Get file path from Telegram
  let res = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${draft.fileId}`);
  const json = await res.json();
  if (!json.ok) throw new Error("Failed to get file from Telegram");

  // 2. Download file buffer
  const fileUrl = `https://api.telegram.org/file/bot${token}/${json.result.file_path}`;
  res = await fetch(fileUrl);
  const buffer = Buffer.from(await res.arrayBuffer());

  // 3. Upload to Cloudflare R2
  const saved = await saveBufferToR2(buffer, subject.code.toLowerCase());

  // 4. Clean up title (Add MST/EndSem hint if PYQ)
  let finalTitle = draft.fileName.replace(".pdf", "");
  if (draft.type === "PYQ_MST" && !/mst/i.test(finalTitle)) finalTitle += " — MST";
  if (draft.type === "PYQ_ENDSEM" && !/end[\s-]?sem/i.test(finalTitle)) finalTitle += " — End-Semester";

  // 5. Generate hash
  const fileHash = createHash("sha256").update(buffer).digest("hex");

  // 6. Save to DB
  await prisma.resource.create({
    data: {
      title: finalTitle,
      description: "",
      fileUrl: saved.fileUrl,
      fileType: saved.fileType,
      fileSize: saved.fileSize,
      fileHash,
      tags: "uploader:Admin Bot",
      type: draft.type.startsWith("PYQ") ? "PYQ" : draft.type,
      academicYear: draft.year,
      status: "APPROVED",
      subjectId: subject.id,
      uploadedById: (await prisma.user.findFirst())?.id || "", 
    },
  });

  // 7. Cleanup draft and notify
  await prisma.telegramDraft.delete({ where: { id: draft.id } });
  await editTelegramMessage(chatId, messageId, `✅ Successfully uploaded & published:\n*${finalTitle}*`, { inline_keyboard: [] });
}
