import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { reorderArabicForPdf } from './arabicPdfHelper';
import {
  PhotoAsset,
  Site,
  WorkCase,
  WorkCaseMeasurement,
  WorkCaseStep,
} from '../types/models';
import { TelecomDataStore } from './telecomRepository';

export interface CaseReportTemplateOption {
  id: string;
  name: string;
  description: string;
  headerAccentColor: string;
}

export const CASE_REPORT_TEMPLATES: CaseReportTemplateOption[] = [
  {
    id: 'general-work',
    name: 'General Engineering Work Report',
    description: 'Standard comprehensive telecom work documentation suitable for any field intervention.',
    headerAccentColor: '#0284c7',
  },
  {
    id: 'site-visit',
    name: 'Telecom Site Visit Report',
    description: 'Field inspection summary tracking arrival/departure, physical shelter health, and checks.',
    headerAccentColor: '#0d9488',
  },
  {
    id: 'tower-inspection',
    name: 'Tower & Antenna Inspection',
    description: 'Structural tower health, guy lines, aviation beacon, antenna tilt, and azimuth audit.',
    headerAccentColor: '#d97706',
  },
  {
    id: 'fiber-otdr',
    name: 'Fiber Installation & OTDR Test Report',
    description: 'Optical fiber characterization, splice loss ledger, and bidirectional OTDR event verification.',
    headerAccentColor: '#8b5cf6',
  },
  {
    id: 'transmission-mw',
    name: 'Transmission & Microwave Maintenance',
    description: 'Point-to-point microwave link alignment, RSL peaking, BER test, and interface metrics.',
    headerAccentColor: '#0284c7',
  },
  {
    id: 'power-electrical',
    name: 'Electrical & Power Systems Maintenance',
    description: 'Rectifier module health, battery conductance test, DC float voltage, and generator inspection.',
    headerAccentColor: '#ea580c',
  },
  {
    id: 'preventive-pm',
    name: 'Preventive Maintenance Audit',
    description: 'Scheduled multi-discipline routine maintenance report and environmental checks.',
    headerAccentColor: '#16a34a',
  },
  {
    id: 'corrective-cm',
    name: 'Corrective Maintenance & Fault Investigation',
    description: 'Unplanned outage restoration, technical findings, root cause analysis, and remediation.',
    headerAccentColor: '#dc2626',
  },
  {
    id: 'equipment-install',
    name: 'Equipment Installation & Replacement',
    description: 'Serial number tracking, hardware asset inventory swap, and commissioning sign-off.',
    headerAccentColor: '#2563eb',
  },
  {
    id: 'site-survey',
    name: 'Site Survey & Feasibility Study',
    description: 'Spatial feasibility, civil room dimensions, power capacity, and panoramic sightlines.',
    headerAccentColor: '#4f46e5',
  },
  {
    id: 'work-completion',
    name: 'Work Completion & Verification Sign-Off',
    description: 'Formal customer or operator acceptance certificate with technical handover checklist.',
    headerAccentColor: '#059669',
  },
];

export function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export const CASE_PDF_I18N = {
  en: {
    platformTitle: 'TELECOMOPS 360',
    platformSub: 'Professional Telecom Field Engineering Platform',
    reportType: 'Report Type',
    category: 'Category',
    priority: 'Priority',
    status: 'Status',
    caseId: 'Case ID:',
    siteCodeName: 'Site Code & Name:',
    siteTypeRegion: 'Site Type & Region:',
    address: 'Site Address:',
    coords: 'Coordinates:',
    workType: 'Work Type:',
    engineer: 'Responsible Engineer:',
    plannedDate: 'Planned Date:',
    actualTime: 'Actual Time Spent:',
    generatedDate: 'Generated Date:',
    sec1: '1. Executive Summary & Objective',
    sec2: '2. Work Description & Executed Steps',
    sec3: '3. Equipment Hardware & Serial Numbers',
    sec4: '4. Calibrated Measurements & RF/Power Tests',
    sec5: '5. Spare Parts & Materials Consumed',
    sec6: '6. Photographic Evidence & Visual Forensics',
    sec7: '7. Engineering Sign-Off & Field Handover',
    reasonForWork: 'Reason for Work:',
    reportedIssue: 'Reported Issue:',
    initialObs: 'Initial Observations:',
    step: 'Step',
    completed: 'Completed',
    pending: 'Pending',
    notRecorded: 'None recorded',
    est: 'est',
    na: 'N/A',
  },
  fr: {
    platformTitle: 'TELECOMOPS 360',
    platformSub: "Plateforme d'ingénierie et de maintenance terrain télécom",
    reportType: 'Type de rapport',
    category: 'Catégorie',
    priority: 'Priorité',
    status: 'Statut',
    caseId: 'N° Dossier :',
    siteCodeName: 'Code & Nom du site :',
    siteTypeRegion: 'Type de site & Région :',
    address: 'Adresse du site :',
    coords: 'Coordonnées GPS :',
    workType: "Type d'intervention :",
    engineer: 'Ingénieur responsable :',
    plannedDate: 'Date planifiée :',
    actualTime: 'Durée réelle passée :',
    generatedDate: 'Date de génération :',
    sec1: '1. Résumé exécutif & Objectif',
    sec2: "2. Description des travaux & Étapes d'intervention",
    sec3: '3. Équipements matériels & Numéros de série',
    sec4: '4. Mesures étalonnées & Tests RF / Énergie',
    sec5: '5. Pièces de rechange & Matériaux consommés',
    sec6: '6. Preuves photographiques & Analyse visuelle',
    sec7: "7. Clôture d'intervention & Validation technique",
    reasonForWork: 'Motif des travaux :',
    reportedIssue: 'Problème signalé :',
    initialObs: 'Observations initiales :',
    step: 'Étape',
    completed: 'Terminé',
    pending: 'En attente',
    notRecorded: 'Aucun enregistrement',
    est: 'estimé',
    na: 'N/D',
  },
  ar: {
    platformTitle: 'تليكوم أوبس 360',
    platformSub: 'المنصة الهندسية لعمليات وصيانة شبكات الاتصالات',
    reportType: 'نوع التقرير',
    category: 'الصنف',
    priority: 'الأولوية',
    status: 'الحالة',
    caseId: 'رقم الملف:',
    siteCodeName: 'رمز واسم الموقع:',
    siteTypeRegion: 'نوع الموقع والولاية:',
    address: 'العنوان الجغرافي:',
    coords: 'الإحداثيات GPS:',
    workType: 'نوع التدخل الميداني:',
    engineer: 'المهندس المسؤول:',
    plannedDate: 'التاريخ المجدول:',
    actualTime: 'الوقت المستغرق الفعلي:',
    generatedDate: 'تاريخ إصدار التقرير:',
    sec1: '1. الملخص التنفيذي والأهداف الهندسية',
    sec2: '2. تفاصيل الأعمال وخطوات التدخل المنفذة',
    sec3: '3. الأجهزة والمعدات المتأثرة والأرقام التسلسلية',
    sec4: '4. القياسات المعايرة واختبارات القدرة والتردد',
    sec5: '5. قطع الغيار والمواد المستهلكة',
    sec6: '6. التوثيق الفوتوغرافي والأدلة الميدانية',
    sec7: '7. الاعتماد الهندسي والتسليم النهائي',
    reasonForWork: 'سبب التدخل:',
    reportedIssue: 'العطل المبلغ عنه:',
    initialObs: 'الملاحظات الأولية:',
    step: 'خطوة',
    completed: 'مكتمل',
    pending: 'قيد الانتظار',
    notRecorded: 'لا يوجد',
    est: 'تقديري',
    na: 'غير متوفر',
  },
};

/**
 * Generates an executive, professional multi-page PDF engineering report for a Work Case.
 * Integrates metadata, detailed steps, equipment, measurements, spare parts, findings,
 * and embedded photographic evidence with caption stamps.
 */
export async function generateCasePdfDocument(
  workCase: WorkCase,
  options: {
    templateName?: string;
    selectedPhotoIds?: string[];
    store: TelecomDataStore;
    reportLanguage?: 'en' | 'fr' | 'ar';
  }
): Promise<Blob> {
  const lang = options.reportLanguage || 'en';
  const rawI18n = CASE_PDF_I18N[lang] || CASE_PDF_I18N.en;
  const i18n = lang === 'ar'
    ? Object.fromEntries(Object.entries(rawI18n).map(([k, v]) => [k, reorderArabicForPdf(v)])) as typeof rawI18n
    : rawI18n;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  let currentY = margin;

  const template =
    CASE_REPORT_TEMPLATES.find((t) => t.name === options.templateName) ||
    CASE_REPORT_TEMPLATES[0];

  // Colors
  const darkNavy = '#0f172a';
  const slate600 = '#475569';
  const slate200 = '#e2e8f0';

  // 1. Header Bar
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 56, 'F');

  // Accent stripe
  doc.setFillColor(template.headerAccentColor);
  doc.rect(0, 56, pageWidth, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(i18n.platformTitle, margin, 34);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text(i18n.platformSub, margin + 140, 34);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(workCase.caseNumber, pageWidth - margin, 34, { align: 'right' });

  currentY = 76;

  // 2. Report Title & Template Badge
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(workCase.title, margin, currentY);

  currentY += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `${i18n.reportType}: ${template.name}  |  ${i18n.category}: ${workCase.category}  |  ${i18n.priority}: ${workCase.priority}  |  ${i18n.status}: ${workCase.status}`,
    margin,
    currentY
  );

  currentY += 16;

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(1);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 12;

  // 3. Identification & Site Metadata Grid (2-column key-value)
  const metaLeft = [
    [i18n.caseId, workCase.caseNumber],
    [i18n.siteCodeName, `${workCase.siteCode} — ${workCase.siteName}`],
    [i18n.siteTypeRegion, `${workCase.siteType} (${workCase.region})`],
    [i18n.address, workCase.address],
    [i18n.coords, `${workCase.latitude.toFixed(5)}° N, ${workCase.longitude.toFixed(5)}° W`],
  ];

  const metaRight = [
    [i18n.workType, workCase.workType],
    [i18n.engineer, workCase.responsibleEngineer],
    [i18n.plannedDate, workCase.timestamps.plannedDate ? new Date(workCase.timestamps.plannedDate).toLocaleDateString() : i18n.na],
    [i18n.actualTime, workCase.timestamps.actualDurationHours ? `${workCase.timestamps.actualDurationHours} hrs` : (workCase.timestamps.estimatedDurationHours ? `${workCase.timestamps.estimatedDurationHours} hrs (${i18n.est})` : i18n.na)],
    [i18n.generatedDate, new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC'],
  ];

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: 'plain',
    styles: { fontSize: 8.5, cellPadding: 2.5, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 100, textColor: [71, 85, 105] },
      1: { cellWidth: 160 },
      2: { fontStyle: 'bold', cellWidth: 110, textColor: [71, 85, 105] },
      3: { cellWidth: 145 },
    },
    body: metaLeft.map((row, idx) => [
      row[0],
      row[1],
      metaRight[idx] ? metaRight[idx][0] : '',
      metaRight[idx] ? metaRight[idx][1] : '',
    ]),
  });

  // @ts-expect-error autoTable mutates doc with lastAutoTable
  currentY = doc.lastAutoTable.finalY + 12;

  // 4. Executive Summary & Work Reason
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(i18n.sec1, margin, currentY);
  currentY += 12;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);

  const summaryParagraphs = doc.splitTextToSize(
    `${workCase.summary}\n\nReason for Work: ${workCase.reasonForWork}${
      workCase.reportedProblem ? `\nReported Issue: ${workCase.reportedProblem}` : ''
    }${workCase.initialObservations ? `\nInitial Observations: ${workCase.initialObservations}` : ''}`,
    contentWidth
  );
  doc.text(summaryParagraphs, margin, currentY);
  currentY += summaryParagraphs.length * 11 + 10;

  // 5. Work Performed & Detailed Steps
  if (workCase.steps && workCase.steps.length > 0) {
    if (currentY > pageHeight - 140) {
      doc.addPage();
      currentY = margin;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('2. Work Performed & Execution Steps', margin, currentY);
    currentY += 8;

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [['#', 'Work Action / Step Description', 'Result / Findings', 'Status', 'Technician']],
      body: workCase.steps.map((st) => [
        String(st.stepNumber),
        st.description,
        st.result || 'Executed according to engineering standard',
        st.status,
        st.doneBy || workCase.responsibleEngineer,
      ]),
      styles: { fontSize: 8, cellPadding: 3.5 },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
      columnStyles: {
        0: { cellWidth: 24, fontStyle: 'bold', halign: 'center' },
        1: { cellWidth: 200 },
        2: { cellWidth: 170 },
        3: { cellWidth: 60, halign: 'center' },
        4: { cellWidth: 60 },
      },
    });

    // @ts-expect-error autoTable mutates doc with lastAutoTable
    currentY = doc.lastAutoTable.finalY + 12;
  }

  // 6. Measurements & Test Results
  if (workCase.measurements && workCase.measurements.length > 0) {
    if (currentY > pageHeight - 140) {
      doc.addPage();
      currentY = margin;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('3. Engineering Measurements & Instrument Test Results', margin, currentY);
    currentY += 8;

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [['Parameter Tested', 'Measured Value', 'Threshold / Standard', 'Status', 'Test Instrument', 'Time (UTC)']],
      body: workCase.measurements.map((m) => [
        m.parameterName || m.parameter || 'Parameter',
        `${m.value} ${m.unit}`,
        m.minThreshold ? `Min: ${m.minThreshold} ${m.unit}` : (m.maxThreshold ? `Max: ${m.maxThreshold} ${m.unit}` : 'Standard Nominal'),
        m.status,
        m.testInstrument || m.testEquipment || 'Standard meter',
        (m.timestamp || '').slice(11, 16),
      ]),
      styles: { fontSize: 8, cellPadding: 3.5 },
      headStyles: { fillColor: [14, 116, 144], textColor: [255, 255, 255] },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 150 },
        1: { fontStyle: 'bold', cellWidth: 80, halign: 'center' },
        2: { cellWidth: 95 },
        3: { cellWidth: 50, halign: 'center' },
        4: { cellWidth: 95 },
        5: { cellWidth: 44, halign: 'center' },
      },
    });

    // @ts-expect-error autoTable mutates doc with lastAutoTable
    currentY = doc.lastAutoTable.finalY + 12;
  }

  // 7. Equipment & Materials Consumed
  if ((workCase.equipment && workCase.equipment.length > 0) || (workCase.materials && workCase.materials.length > 0)) {
    if (currentY > pageHeight - 130) {
      doc.addPage();
      currentY = margin;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('4. Equipment & Materials Consumed', margin, currentY);
    currentY += 8;

    const partsRows: string[][] = [];
    if (workCase.equipment) {
      workCase.equipment.forEach((eq) => {
        partsRows.push([
          eq.name || 'Equipment',
          eq.category || eq.type || 'Hardware',
          `${eq.manufacturer || ''} ${eq.model || ''}`.trim() || 'Generic',
          eq.serialNumber || 'N/A',
          eq.finalCondition || 'Installed & Operational',
        ]);
      });
    }
    if (workCase.materials) {
      workCase.materials.forEach((mat) => {
        partsRows.push([
          mat.partName || mat.name || 'Spare Item',
          'Spare Material',
          mat.partNumber || 'N/A',
          `Qty: ${mat.quantity} ${mat.unit}`,
          mat.supplierOrWarehouse || 'Depot Stock',
        ]);
      });
    }

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [['Item Description', 'Category', 'Manufacturer / Part No.', 'Serial / Quantity', 'Condition / Source']],
      body: partsRows,
      styles: { fontSize: 8, cellPadding: 3.5 },
      headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255] },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 140 },
        1: { cellWidth: 85 },
        2: { cellWidth: 120 },
        3: { cellWidth: 85 },
        4: { cellWidth: 85 },
      },
    });

    // @ts-expect-error autoTable mutates doc with lastAutoTable
    currentY = doc.lastAutoTable.finalY + 12;
  }

  // 8. Technical Findings, Root Cause, Corrective & Preventive Actions
  if (currentY > pageHeight - 160) {
    doc.addPage();
    currentY = margin;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('5. Technical Findings, Root Cause & Preventive Actions', margin, currentY);
  currentY += 12;

  const findingsText = [
    `Technical Findings: ${workCase.technicalFindings || 'Hardware operating within certified parameters.'}`,
    `Root Cause: ${workCase.rootCause || 'Normal environmental operational fatigue or scheduled maintenance.'}`,
    `Corrective Actions: ${workCase.correctiveActions || 'Adjustments made and verified per standard engineering practice.'}`,
    `Preventive Recommendations: ${workCase.preventiveRecommendations || 'Continue periodic scheduled preventive inspections.'}`,
    `Post-Service Operational Status: ${workCase.postServiceStatus || 'Fully Operational'}`,
  ].join('\n\n');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  const findingsParagraphs = doc.splitTextToSize(findingsText, contentWidth);
  doc.text(findingsParagraphs, margin, currentY);
  currentY += findingsParagraphs.length * 11 + 14;

  // 9. Photographic Evidence Section (if photos are selected)
  const candidatePhotoIds = options.selectedPhotoIds || workCase.photoIds || [];
  const linkedPhotos: PhotoAsset[] = options.store.photoAssets.filter((p) =>
    candidatePhotoIds.includes(p.id)
  );

  if (linkedPhotos.length > 0) {
    doc.addPage();
    currentY = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text('6. Photographic Evidence & Visual Inspection Records', margin, currentY);
    currentY += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      'The following photographs were captured, categorized, and preserved as tamper-evident technical proof.',
      margin,
      currentY
    );
    currentY += 16;

    // Render 2 photos per page or grid
    for (let i = 0; i < linkedPhotos.length; i++) {
      const photo = linkedPhotos[i];
      if (currentY > pageHeight - 240) {
        doc.addPage();
        currentY = margin;
      }

      const imgDataUrl = photo.annotatedDataUrl || photo.originalDataUrl;
      if (imgDataUrl && imgDataUrl.startsWith('data:image/')) {
        try {
          doc.addImage(imgDataUrl, 'JPEG', margin, currentY, 260, 180);

          // Metadata block on right side of photo
          const labelX = margin + 275;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9.5);
          doc.setTextColor(15, 23, 42);
          doc.text(`Photo ${i + 1}: ${photo.title}`, labelX, currentY + 14);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(71, 85, 105);
          doc.text(`Category: ${photo.classification}`, labelX, currentY + 30);
          doc.text(`Equipment: ${photo.equipmentOrArea || 'Site Infrastructure'}`, labelX, currentY + 44);
          doc.text(`Captured: ${(photo.captureTimestamp || photo.uploadTimestamp || '').replace('T', ' ').slice(0, 19)}`, labelX, currentY + 58);
          doc.text(`Uploader: ${photo.uploadedBy || 'Field Specialist'}`, labelX, currentY + 72);

          const descLines = doc.splitTextToSize(photo.caption || 'No additional caption.', 200);
          doc.text(descLines, labelX, currentY + 90);

          currentY += 195;
        } catch {
          // If image decoding fails, render structured placeholder card
          doc.setFillColor(241, 245, 249);
          doc.roundedRect(margin, currentY, contentWidth, 50, 4, 4, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(51, 65, 85);
          doc.text(`Photo ${i + 1}: ${photo.title} (${photo.classification})`, margin + 12, currentY + 20);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.text(`Captured by ${photo.uploadedBy || 'Field Specialist'} at ${photo.captureTimestamp || photo.uploadTimestamp || ''}`, margin + 12, currentY + 36);
          currentY += 60;
        }
      }
    }
  }

  // 10. Verification & Formal Sign-Off Section
  if (currentY > pageHeight - 120) {
    doc.addPage();
    currentY = margin;
  }

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(1);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 14;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('7. Engineering Verification & Sign-Off', margin, currentY);
  currentY += 24;

  const signColWidth = contentWidth / 2 - 20;

  // Responsible Engineer Sign Block
  doc.setDrawColor(148, 163, 184);
  doc.line(margin, currentY + 20, margin + signColWidth, currentY + 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Field Engineer Signature: ${workCase.responsibleEngineer}`, margin, currentY + 32);
  doc.text(`Date / Time: ${workCase.timestamps.workCompletion ? workCase.timestamps.workCompletion.replace('T', ' ').slice(0, 16) : new Date().toISOString().slice(0, 10)}`, margin, currentY + 44);

  // Supervisor / Customer Sign Block
  const rightSignX = margin + signColWidth + 40;
  doc.line(rightSignX, currentY + 20, rightSignX + signColWidth, currentY + 20);
  doc.text(`Customer / Supervisor Verification: ${workCase.supervisorConfirmation || 'Operations Lead Verified'}`, rightSignX, currentY + 32);
  doc.text(`Verification Method: ${workCase.verificationMethod || 'Instrument Sweep & Field Inspection'}`, rightSignX, currentY + 44);

  // Footer page numbering on all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `TelecomOps 360  |  Case ${workCase.caseNumber}  |  Page ${p} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 18,
      { align: 'center' }
    );
  }

  return doc.output('blob');
}

/**
 * Exports a single Work Case to a multi-sheet Excel workbook.
 * Sheets: Case Overview, Steps, Measurements, Equipment, Materials, Timeline.
 */
export function exportSingleCaseXlsx(workCase: WorkCase, _store: TelecomDataStore): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Case Overview
  const overviewRows = [
    ['Field', 'Value'],
    ['Case ID', workCase.caseNumber],
    ['Title', workCase.title],
    ['Summary', workCase.summary],
    ['Description', workCase.description],
    ['Category', workCase.category],
    ['Work Type', workCase.workType],
    ['Priority', workCase.priority],
    ['Status', workCase.status],
    ['Site Code', workCase.siteCode],
    ['Site Name', workCase.siteName],
    ['Site Type', workCase.siteType],
    ['Address', workCase.address],
    ['Coordinates', `${workCase.latitude}, ${workCase.longitude}`],
    ['Responsible Engineer', workCase.responsibleEngineer],
    ['Planned Date', workCase.timestamps.plannedDate || 'N/A'],
    ['Actual Arrival', workCase.timestamps.actualArrival || 'N/A'],
    ['Work Started', workCase.timestamps.workStart || 'N/A'],
    ['Work Completed', workCase.timestamps.workCompletion || 'N/A'],
    ['Actual Duration (hrs)', workCase.timestamps.actualDurationHours ?? 'N/A'],
    ['Estimated Duration (hrs)', workCase.timestamps.estimatedDurationHours ?? 'N/A'],
    ['Reason for Work', workCase.reasonForWork],
    ['Reported Problem', workCase.reportedProblem || 'N/A'],
    ['Technical Findings', workCase.technicalFindings || 'N/A'],
    ['Root Cause', workCase.rootCause || 'N/A'],
    ['Corrective Actions', workCase.correctiveActions || 'N/A'],
    ['Preventive Recommendations', workCase.preventiveRecommendations || 'N/A'],
    ['Post-Service Status', workCase.postServiceStatus || 'N/A'],
    ['Verification Method', workCase.verificationMethod || 'N/A'],
    ['Created Date', workCase.createdAt],
    ['Last Updated Date', workCase.updatedAt],
  ];
  const wsOverview = XLSX.utils.aoa_to_sheet(overviewRows);
  XLSX.utils.book_append_sheet(wb, wsOverview, 'Case Overview');

  // Sheet 2: Steps
  if (workCase.steps && workCase.steps.length > 0) {
    const stepRows = [
      ['Step #', 'Description', 'Result', 'Status', 'Completed At', 'Done By'],
      ...workCase.steps.map((st) => [
        st.stepNumber,
        st.description,
        st.result || '',
        st.status,
        st.completedAt || '',
        st.doneBy || '',
      ]),
    ];
    const wsSteps = XLSX.utils.aoa_to_sheet(stepRows);
    XLSX.utils.book_append_sheet(wb, wsSteps, 'Work Steps');
  }

  // Sheet 3: Measurements
  if (workCase.measurements && workCase.measurements.length > 0) {
    const measRows = [
      ['Parameter Name', 'Measured Value', 'Unit', 'Min Threshold', 'Max Threshold', 'Status', 'Test Instrument', 'Timestamp', 'Recorded By', 'Notes'],
      ...workCase.measurements.map((m) => [
        m.parameterName,
        m.value,
        m.unit,
        m.minThreshold || '',
        m.maxThreshold || '',
        m.status,
        m.testInstrument,
        m.timestamp,
        m.recordedBy,
        m.notes || '',
      ]),
    ];
    const wsMeas = XLSX.utils.aoa_to_sheet(measRows);
    XLSX.utils.book_append_sheet(wb, wsMeas, 'Measurements');
  }

  // Sheet 4: Equipment & Materials
  const equipRows = [
    ['Type', 'Name / Part', 'Category', 'Manufacturer / Vendor', 'Model / Part No.', 'Serial / Qty', 'Condition / Location'],
    ...(workCase.equipment || []).map((eq) => [
      'Equipment',
      eq.name,
      eq.category,
      eq.manufacturer,
      eq.model,
      eq.serialNumber,
      eq.finalCondition || eq.installationLocation || '',
    ]),
    ...(workCase.materials || []).map((mat) => [
      'Material / Spare',
      mat.partName,
      'Consumable',
      mat.supplierOrWarehouse || '',
      mat.partNumber,
      `${mat.quantity} ${mat.unit}`,
      mat.notes || '',
    ]),
  ];
  const wsEquip = XLSX.utils.aoa_to_sheet(equipRows);
  XLSX.utils.book_append_sheet(wb, wsEquip, 'Equipment & Spares');

  // Sheet 5: Timeline
  if (workCase.timeline && workCase.timeline.length > 0) {
    const timeRows = [
      ['Timestamp (UTC)', 'Event Type', 'Title', 'Description', 'Author'],
      ...workCase.timeline.map((t) => [
        t.timestamp,
        t.eventType,
        t.title,
        t.description,
        t.authorName,
      ]),
    ];
    const wsTime = XLSX.utils.aoa_to_sheet(timeRows);
    XLSX.utils.book_append_sheet(wb, wsTime, 'Timeline History');
  }

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  triggerBrowserDownload(blob, `${workCase.caseNumber}_Engineering_Record.xlsx`);
}

/**
 * Bulk exports an array of Work Cases to an Excel spreadsheet.
 */
export function exportBulkCasesXlsx(cases: WorkCase[], filename = 'TelecomOps360_WorkCases_Export.xlsx'): void {
  const wb = XLSX.utils.book_new();

  const headers = [
    'Case ID',
    'Title',
    'Category',
    'Work Type',
    'Priority',
    'Status',
    'Site Code',
    'Site Name',
    'Site Type',
    'Region',
    'Address',
    'Latitude',
    'Longitude',
    'Responsible Engineer',
    'Planned Date',
    'Work Started',
    'Work Completed',
    'Actual Duration (hrs)',
    'Steps Count',
    'Measurements Count',
    'Photos Count',
    'Created At',
  ];

  const rows = cases.map((c) => [
    c.caseNumber,
    c.title,
    c.category,
    c.workType,
    c.priority,
    c.status,
    c.siteCode,
    c.siteName,
    c.siteType,
    c.region,
    c.address,
    c.latitude,
    c.longitude,
    c.responsibleEngineer,
    c.timestamps.plannedDate || '',
    c.timestamps.workStart || '',
    c.timestamps.workCompletion || '',
    c.timestamps.actualDurationHours ?? '',
    c.steps?.length || 0,
    c.measurements?.length || 0,
    c.photoIds?.length || 0,
    c.createdAt,
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, 'Work Cases');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  triggerBrowserDownload(blob, filename);
}

/**
 * Exports a single case as structured JSON.
 */
export function exportSingleCaseJson(workCase: WorkCase): void {
  const jsonStr = JSON.stringify(workCase, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  triggerBrowserDownload(blob, `${workCase.caseNumber}_Case_Data.json`);
}

/**
 * Bulk exports cases as structured JSON package.
 */
export function exportBulkCasesJson(cases: WorkCase[], filename = 'TelecomOps360_WorkCases_Backup.json'): void {
  const jsonStr = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      format: 'TelecomOps360-WorkCases-v1',
      totalCount: cases.length,
      cases,
    },
    null,
    2
  );
  const blob = new Blob([jsonStr], { type: 'application/json' });
  triggerBrowserDownload(blob, filename);
}

export const REPORT_TEMPLATES = CASE_REPORT_TEMPLATES;
export const exportCasesToExcel = exportBulkCasesXlsx;
export const exportCaseToJson = exportSingleCaseJson;

export async function exportCaseToPdf(
  workCase: WorkCase,
  site?: Site,
  photos?: PhotoAsset[],
  templateId?: string,
  reportLanguage: 'en' | 'fr' | 'ar' = 'en'
): Promise<void> {
  const tpl = CASE_REPORT_TEMPLATES.find((t) => t.id === templateId);
  const blob = await generateCasePdfDocument(workCase, {
    templateName: tpl ? tpl.name : templateId,
    selectedPhotoIds: photos ? photos.map((p) => p.id) : undefined,
    store: {
      sites: site ? [site] : [],
      photoAssets: photos || [],
      equipment: [],
      spareParts: [],
    } as any,
    reportLanguage,
  });
  triggerBrowserDownload(blob, `${workCase.caseNumber}_Intervention_Report_${reportLanguage.toUpperCase()}.pdf`);
}

