import { Router } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { prisma } from "../prisma";

export const importedTransactionsRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

interface ParsedRow {
  date?: string | number;
  Date?: string | number;
  Description?: string;
  description?: string;
  Amount?: number;
  amount?: number;
  Category?: string;
  category?: string;
}

function excelSerialToDate(value: string | number | undefined): Date {
  if (typeof value === "number") {
    // Excel serial date (days since 1899-12-30)
    return new Date(Math.round((value - 25569) * 86400 * 1000));
  }
  return value ? new Date(value) : new Date();
}

importedTransactionsRouter.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "file is required" });

  const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0]!;
  const rows = XLSX.utils.sheet_to_json<ParsedRow>(workbook.Sheets[sheetName]!);

  const created = await Promise.all(
    rows
      .filter((row) => (row.Amount ?? row.amount) !== undefined)
      .map((row) =>
        prisma.importedTransaction.create({
          data: {
            date: excelSerialToDate(row.Date ?? row.date),
            description: row.Description ?? row.description ?? "",
            amount: Number(row.Amount ?? row.amount),
            categoryGuess: row.Category ?? row.category ?? null,
            sourceFile: req.file!.originalname,
            reconciled: false,
          },
        })
      )
  );

  res.status(201).json({ imported: created.length, transactions: created });
});

importedTransactionsRouter.get("/", async (req, res) => {
  const { reconciled } = req.query;
  const transactions = await prisma.importedTransaction.findMany({
    where: reconciled !== undefined ? { reconciled: reconciled === "true" } : undefined,
    orderBy: { date: "desc" },
  });
  res.json(transactions);
});

importedTransactionsRouter.put("/:id/reconcile", async (req, res) => {
  const { linkedTransactionId } = req.body;
  const updated = await prisma.importedTransaction.update({
    where: { id: Number(req.params.id) },
    data: { reconciled: true, linkedTransactionId },
  });
  res.json(updated);
});
