import { jsPDF } from 'jspdf';
import { Customer, ProviderProfile, Quotation } from '../types';
import { formatDateDisplay } from './formatters';

function formatPdfINR(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `Rs. ${new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe)}`;
}

export function downloadQuotationPdf(
  quotation: Quotation,
  customer: Customer | undefined,
  provider: ProviderProfile
): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 44;
  const contentWidth = pageWidth - margin * 2;
  let y = 48;

  // Header band
  doc.setFillColor(23, 59, 103); // #173B67
  doc.rect(0, 0, pageWidth, 104, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(provider.businessName || 'ServEase Provider', margin, 44);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const providerMeta = [
    provider.serviceCategory,
    provider.serviceArea,
    provider.businessPhone || provider.phone,
  ]
    .filter(Boolean)
    .join('  |  ');
  doc.text(providerMeta, margin, 64);
  if (provider.businessEmail || provider.email) {
    doc.text(provider.businessEmail || provider.email, margin, 80);
  }

  // Quotation label right side
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('QUOTATION', pageWidth - margin, 44, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`No: ${quotation.quotationNumber}`, pageWidth - margin, 64, { align: 'right' });
  doc.text(`Date: ${formatDateDisplay(quotation.date)}`, pageWidth - margin, 80, { align: 'right' });

  y = 134;

  // Customer & Summary split
  doc.setTextColor(107, 114, 128);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('PREPARED FOR', margin, y);
  doc.text('STATUS', pageWidth - margin, y, { align: 'right' });

  y += 16;
  doc.setTextColor(32, 41, 56);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(customer?.name || 'Valued Customer', margin, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(quotation.status.toUpperCase(), pageWidth - margin, y, { align: 'right' });

  y += 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(75, 85, 99);
  if (customer?.phone) {
    doc.text(`Phone: ${customer.phone}`, margin, y);
    y += 14;
  }
  const fullAddress = [customer?.address, customer?.area].filter(Boolean).join(', ');
  if (fullAddress) {
    const addrLines = doc.splitTextToSize(fullAddress, contentWidth * 0.65);
    doc.text(addrLines, margin, y);
    y += addrLines.length * 14;
  }

  y += 14;

  // Service description box
  doc.setDrawColor(229, 233, 240);
  doc.setFillColor(245, 247, 250);
  const descLines = doc.splitTextToSize(quotation.serviceDescription || 'Service Work', contentWidth - 24);
  const boxHeight = Math.max(46, descLines.length * 14 + 28);
  doc.roundedRect(margin, y, contentWidth, boxHeight, 4, 4, 'FD');

  doc.setTextColor(107, 114, 128);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('SERVICE DESCRIPTION', margin + 12, y + 16);

  doc.setTextColor(32, 41, 56);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(descLines, margin + 12, y + 32);

  y += boxHeight + 22;

  // Itemised Table Header
  doc.setFillColor(23, 59, 103);
  doc.rect(margin, y, contentWidth, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('#', margin + 10, y + 17);
  doc.text('Item / Service Detail', margin + 32, y + 17);
  doc.text('Qty', margin + contentWidth - 190, y + 17, { align: 'right' });
  doc.text('Unit Price', margin + contentWidth - 100, y + 17, { align: 'right' });
  doc.text('Amount', margin + contentWidth - 10, y + 17, { align: 'right' });

  y += 26;

  // Item rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  quotation.items.forEach((item, index) => {
    const itemDescLines = doc.splitTextToSize(item.description || '-', contentWidth - 250);
    const rowHeight = Math.max(26, itemDescLines.length * 14 + 12);

    if (y + rowHeight > 740) {
      doc.addPage();
      y = 48;
    }

    if (index % 2 === 1) {
      doc.setFillColor(249, 250, 251);
      doc.rect(margin, y, contentWidth, rowHeight, 'F');
    }

    doc.setDrawColor(235, 238, 243);
    doc.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);

    doc.setTextColor(75, 85, 99);
    doc.text(String(index + 1), margin + 10, y + 17);

    doc.setTextColor(32, 41, 56);
    doc.text(itemDescLines, margin + 32, y + 17);

    doc.text(String(item.quantity), margin + contentWidth - 190, y + 17, { align: 'right' });
    doc.text(formatPdfINR(item.unitPrice), margin + contentWidth - 100, y + 17, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(formatPdfINR(item.quantity * item.unitPrice), margin + contentWidth - 10, y + 17, {
      align: 'right',
    });
    doc.setFont('helvetica', 'normal');

    y += rowHeight;
  });

  // Total section
  y += 16;
  const totalBoxWidth = 220;
  const totalBoxX = margin + contentWidth - totalBoxWidth;
  doc.setFillColor(23, 59, 103);
  doc.roundedRect(totalBoxX, y, totalBoxWidth, 38, 4, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL ESTIMATE', totalBoxX + 14, y + 23);
  doc.setFontSize(13);
  doc.text(formatPdfINR(quotation.totalAmount), totalBoxX + totalBoxWidth - 14, y + 23, {
    align: 'right',
  });

  y += 62;

  // Notes
  if (quotation.notes?.trim()) {
    if (y > 700) {
      doc.addPage();
      y = 48;
    }
    doc.setTextColor(107, 114, 128);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('NOTES', margin, y);
    y += 14;
    doc.setTextColor(55, 65, 81);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    const noteLines = doc.splitTextToSize(quotation.notes, contentWidth);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 13 + 18;
  }

  // Terms & Conditions
  if (quotation.termsAndConditions?.trim()) {
    if (y > 700) {
      doc.addPage();
      y = 48;
    }
    doc.setTextColor(107, 114, 128);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('TERMS & CONDITIONS', margin, y);
    y += 14;
    doc.setTextColor(75, 85, 99);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const termLines = doc.splitTextToSize(quotation.termsAndConditions, contentWidth);
    doc.text(termLines, margin, y);
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 30;
  doc.setDrawColor(229, 233, 240);
  doc.line(margin, footerY - 12, pageWidth - margin, footerY - 12);
  doc.setFontSize(8.5);
  doc.setTextColor(156, 163, 175);
  doc.text(
    `Generated via ServEase · ${provider.businessName}`,
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );

  const safeCustomer = (customer?.name || 'Customer').replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`${quotation.quotationNumber}_${safeCustomer}.pdf`);
}
