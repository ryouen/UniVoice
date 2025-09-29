/**
 * Export utilities for UniVoice
 * Handles Word and PDF export functionality
 */

import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer } from 'docx';
import jsPDF from 'jspdf';

interface ExportData {
  className: string;
  duration: string;
  date: Date;
  summary: {
    ja: string;
    en: string;
  };
  vocabulary: Array<{
    en: string;
    ja: string;
  }>;
  history: Array<{
    original: string;
    translation: string;
  }>;
  memos: Array<{
    timestamp: string;
    japanese: string;
    english: string;
  }>;
}

/**
 * Export report as Word document
 */
export async function exportToWord(data: ExportData): Promise<void> {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        // Title
        new Paragraph({
          text: '📚 UniVoice 授業レポート',
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        }),
        
        // Class info
        new Paragraph({
          children: [
            new TextRun({ text: '授業: ', bold: true }),
            new TextRun(data.className)
          ],
          spacing: { after: 200 }
        }),
        
        new Paragraph({
          children: [
            new TextRun({ text: '日時: ', bold: true }),
            new TextRun(data.date.toLocaleString('ja-JP'))
          ],
          spacing: { after: 200 }
        }),
        
        new Paragraph({
          children: [
            new TextRun({ text: '録音時間: ', bold: true }),
            new TextRun(data.duration)
          ],
          spacing: { after: 400 }
        }),
        
        // Summary section
        new Paragraph({
          text: '📝 授業の要約',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 }
        }),
        
        new Paragraph({
          children: [
            new TextRun({ text: 'English Summary', bold: true })
          ],
          spacing: { after: 100 }
        }),
        
        new Paragraph({
          text: data.summary.en,
          spacing: { after: 300 }
        }),
        
        new Paragraph({
          children: [
            new TextRun({ text: '日本語要約', bold: true })
          ],
          spacing: { after: 100 }
        }),
        
        new Paragraph({
          text: data.summary.ja,
          spacing: { after: 400 }
        }),
        
        // Vocabulary section
        new Paragraph({
          text: '📖 重要単語',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 }
        }),
        
        ...data.vocabulary.map(vocab => 
          new Paragraph({
            children: [
              new TextRun({ text: `• ${vocab.en}`, bold: true }),
              new TextRun(` - ${vocab.ja}`)
            ],
            spacing: { after: 100 }
          })
        ),
        
        // Memos section (if any)
        ...(data.memos.length > 0 ? [
          new Paragraph({
            text: '📌 メモ',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 }
          }),
          ...data.memos.map(memo => 
            new Paragraph({
              children: [
                new TextRun({ text: `[${memo.timestamp}] `, bold: true }),
                new TextRun(memo.japanese || memo.english)
              ],
              spacing: { after: 100 }
            })
          )
        ] : []),
        
        // History section (abbreviated)
        new Paragraph({
          text: '📋 授業内容（抜粋）',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 }
        }),
        
        ...data.history.slice(0, 5).map(entry => [
          new Paragraph({
            text: entry.original,
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: entry.translation, italics: true })
            ],
            spacing: { after: 200 }
          })
        ]).flat()
      ]
    }]
  });
  
  const blob = await Packer.toBlob(doc);
  const fileName = `UniVoice_${data.className}_${data.date.toISOString().split('T')[0]}.docx`;
  saveAs(blob, fileName);
}

/**
 * Export report as PDF
 */
export function exportToPDF(data: ExportData): void {
  const pdf = new jsPDF();
  let yPosition = 20;
  
  // Title
  pdf.setFontSize(20);
  pdf.text('UniVoice 授業レポート', 105, yPosition, { align: 'center' });
  yPosition += 15;
  
  // Class info
  pdf.setFontSize(12);
  pdf.text(`授業: ${data.className}`, 20, yPosition);
  yPosition += 8;
  pdf.text(`日時: ${data.date.toLocaleString('ja-JP')}`, 20, yPosition);
  yPosition += 8;
  pdf.text(`録音時間: ${data.duration}`, 20, yPosition);
  yPosition += 15;
  
  // Summary
  pdf.setFontSize(14);
  pdf.text('授業の要約', 20, yPosition);
  yPosition += 8;
  
  pdf.setFontSize(11);
  pdf.text('English Summary:', 20, yPosition);
  yPosition += 6;
  
  // Word wrap for long text
  const englishLines = pdf.splitTextToSize(data.summary.en, 170);
  englishLines.forEach((line: string) => {
    if (yPosition > 270) {
      pdf.addPage();
      yPosition = 20;
    }
    pdf.text(line, 20, yPosition);
    yPosition += 5;
  });
  
  yPosition += 5;
  pdf.text('日本語要約:', 20, yPosition);
  yPosition += 6;
  
  const japaneseLines = pdf.splitTextToSize(data.summary.ja, 170);
  japaneseLines.forEach((line: string) => {
    if (yPosition > 270) {
      pdf.addPage();
      yPosition = 20;
    }
    pdf.text(line, 20, yPosition);
    yPosition += 5;
  });
  
  // Vocabulary
  yPosition += 10;
  if (yPosition > 240) {
    pdf.addPage();
    yPosition = 20;
  }
  
  pdf.setFontSize(14);
  pdf.text('重要単語', 20, yPosition);
  yPosition += 8;
  
  pdf.setFontSize(11);
  data.vocabulary.forEach(vocab => {
    if (yPosition > 270) {
      pdf.addPage();
      yPosition = 20;
    }
    pdf.text(`• ${vocab.en} - ${vocab.ja}`, 25, yPosition);
    yPosition += 6;
  });
  
  // Save PDF
  const fileName = `UniVoice_${data.className}_${data.date.toISOString().split('T')[0]}.pdf`;
  pdf.save(fileName);
}

/**
 * Install file-saver if not present
 */
export function saveAs(blob: Blob, filename: string): void {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}