// mm.js
import express from "express";
import OpenAI from "openai";
import fs from "fs";
import PDFDocument from "pdfkit";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper: Fetch text from URL
async function fetchWebContent(url) {
  const response = await fetch(url);
  const html = await response.text();
  return html.replace(/<[^>]+>/g, " "); // إزالة HTML tags
}

// Serve simple web form
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>AI Content-to-PDF Enhancer</title>
      <style>
        body { font-family: Arial; margin: 40px; background: #f9f9f9; }
        form { background: #fff; padding: 20px; border-radius: 10px; width: 400px; }
        textarea, input { width: 100%; margin-bottom: 10px; padding: 8px; }
        button { padding: 8px 12px; background: #0078d7; color: #fff; border: none; border-radius: 5px; cursor: pointer; }
        button:hover { background: #005bb5; }
      </style>
    </head>
    <body>
      <h1>📄 AI Content-to-PDF Enhancer</h1>
      <form action="/process" method="post">
        <label>Enter Text:</label><br>
        <textarea name="text" rows="5"></textarea><br>
        <label>Or Enter URL:</label><br>
        <input type="text" name="url" placeholder="https://example.com"><br>
        <button type="submit">Generate PDF</button>
      </form>
    </body>
    </html>
  `);
});

// Route: Process PDF
app.post("/process", async (req, res) => {
  try {
    let { text, url } = req.body;
    if (url) text = await fetchWebContent(url);
    if (!text) return res.status(400).send("❌ Please send text or URL");

    // AI summarization
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Summarize and enrich this content:\n\n${text}` }],
    });

    const summary = response.choices[0].message.content;

    // Generate PDF
    const pdfPath = "output.pdf";
    const doc = new PDFDocument();
    const writeStream = fs.createWriteStream(pdfPath);
    doc.pipe(writeStream);

    doc.fontSize(20).text("📄 AI Content-to-PDF Report", { align: "center" });
    doc.moveDown();
    doc.fontSize(14).text("Original Content:", { underline: true });
    doc.fontSize(12).text(text.substring(0, 2000));
    doc.moveDown();
    doc.fontSize(14).text("AI Enhanced Summary:", { underline: true });
    doc.fontSize(12).text(summary);

    doc.end();

    writeStream.on("finish", () => {
      res.download(pdfPath, "result.pdf");
    });
  } catch (error) {
  console.error("❌ Error:", error);
  res.status(500).send({
    message: "❌ Something went wrong",
    error: error.message,   // يوريك نص الخطأ
    stack: error.stack      // يوريك مكان الخطأ في الكود
  });
}

});

app.listen(3000, () => {
  console.log("🚀 Server running at http://localhost:3000");
});
