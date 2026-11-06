import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { reorderArabicForPdf } from './arabicPdfHelper';
import {
  Incident,
  MaintenanceReport,
  PdfVariantMode,
  PhotoAsset,
  PhotoStampConfig,
  Site,
  SiteVisit,
  StampFieldKey,
  WorkOrder,
} from '../types/models';
import { TelecomDataStore } from './telecomRepository';

export interface StampContextMetadata {
  organizationName: string;
  reportReference: string;
  caseId: string;
  workType: string;
  casePriority: string;
  shortCaption: string;
  incidentId: string;
  workOrderId: string;
  siteId: string;
  siteCode: string;
  siteName: string;
  siteAddress: string;
  region: string;
  equipmentInfo: string;
  photoTitle: string;
  incidentDescription: string;
  workPerformed: string;
  priority: string;
  visitDate: string;
  captureTimestamp: string;
  uploadTimestamp: string;
  workStartTime: string;
  completionTime: string;
  closureTime: string;
  engineerName: string;
  coordinates: string;
  classification: string;
  customText1: string;
  customText2: string;
}

export const STAMP_FIELD_LABELS_BY_LANG: Record<'en' | 'fr' | 'ar', Record<StampFieldKey, string>> = {
  en: {
    organizationName: 'Organization',
    reportReference: 'Report Ref',
    caseId: 'Case ID',
    workType: 'Work Type',
    casePriority: 'Case Priority',
    shortCaption: 'Caption',
    incidentId: 'Incident ID',
    workOrderId: 'Work Order',
    siteId: 'Site ID',
    siteCode: 'Site Code',
    siteName: 'Site Name',
    siteAddress: 'Address',
    region: 'Region',
    equipmentInfo: 'Equipment',
    photoTitle: 'Photo Title',
    incidentDescription: 'Incident Desc',
    workPerformed: 'Work Performed',
    priority: 'Priority',
    visitDate: 'Visit Date',
    captureTimestamp: 'Captured At',
    uploadTimestamp: 'Uploaded At',
    workStartTime: 'Work Start',
    completionTime: 'Completed At',
    closureTime: 'Closed At',
    engineerName: 'Engineer',
    coordinates: 'GPS Coords',
    classification: 'Stage / Class',
    customText1: 'Note 1',
    customText2: 'Note 2',
  },
  fr: {
    organizationName: 'Organisation',
    reportReference: 'Réf. Rapport',
    caseId: 'N° Dossier',
    workType: 'Type travaux',
    casePriority: 'Priorité',
    shortCaption: 'Légende',
    incidentId: 'N° Incident',
    workOrderId: 'Ordre de travail',
    siteId: 'Identifiant site',
    siteCode: 'Code site',
    siteName: 'Nom du site',
    siteAddress: 'Adresse',
    region: 'Région',
    equipmentInfo: 'Équipement',
    photoTitle: 'Titre photo',
    incidentDescription: 'Desc. incident',
    workPerformed: 'Travaux effectués',
    priority: 'Priorité',
    visitDate: 'Date visite',
    captureTimestamp: 'Capturé le',
    uploadTimestamp: 'Téléversé le',
    workStartTime: 'Début travaux',
    completionTime: 'Fin travaux',
    closureTime: 'Clôturé le',
    engineerName: 'Ingénieur',
    coordinates: 'Coordonnées GPS',
    classification: 'Étape / Classe',
    customText1: 'Note 1',
    customText2: 'Note 2',
  },
  ar: {
    organizationName: 'المؤسسة',
    reportReference: 'مرجع التقرير',
    caseId: 'رقم الملف',
    workType: 'نوع التدخل',
    casePriority: 'الأولوية',
    shortCaption: 'الوصف',
    incidentId: 'رقم الحادث',
    workOrderId: 'أمر العمل',
    siteId: 'معرف الموقع',
    siteCode: 'رمز الموقع',
    siteName: 'اسم الموقع',
    siteAddress: 'العنوان',
    region: 'المنطقة',
    equipmentInfo: 'الجهاز',
    photoTitle: 'عنوان الصورة',
    incidentDescription: 'وصف العطل',
    workPerformed: 'العمل المنجز',
    priority: 'الأولوية',
    visitDate: 'تاريخ الزيارة',
    captureTimestamp: 'تاريخ الالتقاط',
    uploadTimestamp: 'تاريخ الرفع',
    workStartTime: 'بدء التدخل',
    completionTime: 'اكتمال العمل',
    closureTime: 'تاريخ الإغلاق',
    engineerName: 'المهندس',
    coordinates: 'الإحداثيات',
    classification: 'المرحلة / الصنف',
    customText1: 'ملاحظة 1',
    customText2: 'ملاحظة 2',
  },
};

export const STAMP_FIELD_LABELS: Record<StampFieldKey, string> = STAMP_FIELD_LABELS_BY_LANG.en;

export const PDF_I18N = {
  en: {
    batchTitle: 'BATCH ENGINEERING REPORT PACKAGE',
    batchIndex: 'Batch Index',
    reportNum: 'Report Number',
    rev: 'Rev',
    type: 'Type',
    siteCode: 'Site Code',
    status: 'Status',
    preparedBy: 'Prepared By',
    submitted: 'Submitted',
    docControl: '1. Document Control & References',
    execSummary: '2. Executive Summary',
    siteInfo: '3. Authoritative Site & Incident Information',
    workSteps: '4. Executed Work Steps & Interventions',
    measurements: '5. Calibrated Measurements & RF/Power Tests',
    equipment: '6. Installed / Serviced Equipment & Serial Numbers',
    materials: '7. Materials & Consumables Ledger',
    photos: '8. Photographic Evidence & Visual Forensics',
    signoff: '9. Post-Repair Verification & Engineering Sign-Off',
    approvedBy: 'Approved By',
    supervisorApproval: 'Supervisor Engineering Sign-Off',
    notRecorded: 'Not recorded',
    notLinked: 'Not linked',
    field: 'Field',
    value: 'Recorded Value',
    reportNo: 'Report No',
    generated: 'Generated',
  },
  fr: {
    batchTitle: "PACKAGE DE RAPPORTS D'INGÉNIERIE",
    batchIndex: 'Index du lot',
    reportNum: 'Numéro de rapport',
    rev: 'Rév',
    type: 'Type',
    siteCode: 'Code site',
    status: 'Statut',
    preparedBy: 'Rédigé par',
    submitted: 'Soumis le',
    docControl: '1. Contrôle du document & Références',
    execSummary: '2. Résumé exécutif & Objectif',
    siteInfo: '3. Informations officielles du site & Incident',
    workSteps: '4. Étapes des travaux & Interventions exécutées',
    measurements: '5. Mesures étalonnées & Tests RF/Énergie',
    equipment: '6. Équipements installés / Remplacés & N° de série',
    materials: '7. Matériaux & Pièces de rechange consommés',
    photos: '8. Preuves photographiques & Analyse visuelle',
    signoff: "9. Vérification post-intervention & Clôture d'ingénierie",
    approvedBy: 'Approuvé par',
    supervisorApproval: 'Validation et signature du superviseur',
    notRecorded: 'Non enregistré',
    notLinked: 'Non lié',
    field: 'Champ',
    value: 'Valeur enregistrée',
    reportNo: 'Rapport N°',
    generated: 'Généré le',
  },
  ar: {
    batchTitle: 'حزمة التقارير الهندسية الميدانية المعتمدة',
    batchIndex: 'فهرس حزمة التقارير',
    reportNum: 'رقم التقرير',
    rev: 'المراجعة',
    type: 'النوع',
    siteCode: 'رمز الموقع',
    status: 'الحالة',
    preparedBy: 'إعداد المهندس',
    submitted: 'تاريخ التقديم',
    docControl: '1. بيانات ضبط الوثيقة والمراجع الرسمية',
    execSummary: '2. الملخص التنفيذي والأهداف',
    siteInfo: '3. البيانات المعتمدة للموقع والتنبيه',
    workSteps: '4. خطوات العمل المنفذة والتدخل الميداني',
    measurements: '5. القياسات المعايرة واختبارات القدرة والتردد',
    equipment: '6. الأجهزة والمعدات المستبدلة والأرقام التسلسلية',
    materials: '7. المواد وقطع الغيار المستهلكة',
    photos: '8. التوثيق الفوتوغرافي والأدلة الميدانية',
    signoff: '9. التحقق الهندسي النهائي والاعتماد الرسمي',
    approvedBy: 'معتمد من قبل',
    supervisorApproval: 'توقيع واعتماد المشرف الهندسي',
    notRecorded: 'غير مسجل',
    notLinked: 'غير مرتبط',
    field: 'الحقل',
    value: 'القيمة المسجلة',
    reportNo: 'رقم التقرير',
    generated: 'تاريخ التوليد',
  },
};

/**
 * Resolves metadata stamp values from linked Site, Incident, WorkOrder, and SiteVisit records,
 * clearly distinguishing recorded timestamps/coordinates from manual or unrecorded entries.
 */
export function buildStampContextMetadata(
  photo: PhotoAsset,
  store: TelecomDataStore,
  canViewContactDetails: boolean
): StampContextMetadata {
  const site: Site | undefined = store.sites.find((s) => s.id === photo.siteId);
  const incident: Incident | undefined = store.incidents.find((i) => i.id === photo.incidentId);
  const workOrder: WorkOrder | undefined = store.workOrders.find(
    (w) => w.id === photo.workOrderId || w.workOrderNumber === photo.workOrderId
  );
  const visit: SiteVisit | undefined = store.siteVisits.find((v) => v.id === photo.visitId);
  const report: MaintenanceReport | undefined = store.maintenanceReports.find(
    (r) => r.id === photo.reportId || r.reportNumber === photo.stampConfig.reportReference
  );
  const workCase = (store.workCases || []).find(
    (c) => c.id === photo.caseId || c.caseNumber === photo.caseId
  );

  const coordsText = photo.gpsCoordinates
    ? `${photo.gpsCoordinates.latitude.toFixed(5)}, ${photo.gpsCoordinates.longitude.toFixed(5)} (${photo.gpsCoordinates.source})`
    : site
    ? `${site.latitude.toFixed(5)}, ${site.longitude.toFixed(5)} (Site Registry)`
    : 'Not recorded';

  const captureText = photo.captureTimestamp
    ? `${photo.captureTimestamp.replace('T', ' ').slice(0, 19)} UTC [${photo.captureTimestampSource}]`
    : 'Not recorded';

  const engineerRaw = visit?.engineerName || workCase?.responsibleEngineer || photo.uploadedBy || 'Not recorded';
  const engineerDisplay = canViewContactDetails
    ? engineerRaw
    : `${engineerRaw.split(' ')[0]} [ID Masked for Role]`;

  return {
    organizationName:
      photo.stampConfig.organizationName ||
      store.reportBranding?.companyName ||
      'ApexTel Carrier Group',
    reportReference:
      photo.stampConfig.reportReference || report?.reportNumber || 'Not linked to report',
    caseId: workCase?.caseNumber || photo.caseId || 'N/A',
    workType: workCase?.workType || 'Field Operations',
    casePriority: workCase?.priority || incident?.priority || 'Normal',
    shortCaption: photo.caption || photo.title || '',
    incidentId: incident?.id || photo.incidentId || 'N/A',
    workOrderId: workOrder?.workOrderNumber || photo.workOrderId || 'N/A',
    siteId: site?.id || photo.siteId || 'Not recorded',
    siteCode: site?.siteCode || photo.siteCode || 'Not recorded',
    siteName: site?.siteName || photo.siteName || 'Not recorded',
    siteAddress: site?.address || photo.siteAddress || 'Not recorded',
    region: site?.region || photo.region || 'Not recorded',
    equipmentInfo: photo.equipmentOrArea || visit?.equipmentName || 'Not recorded',
    photoTitle: photo.title || 'Untitled Field Photograph',
    incidentDescription: incident?.description
      ? incident.description.slice(0, 68)
      : 'Not linked to incident',
    workPerformed:
      workCase?.finalResult?.slice(0, 68) ||
      visit?.workPerformed?.slice(0, 68) ||
      workOrder?.workPerformed?.slice(0, 68) ||
      'Not recorded',
    priority: workCase?.priority || incident?.priority || workOrder?.priority || incident?.severity || 'Standard',
    visitDate: visit?.scheduledDate ? visit.scheduledDate.slice(0, 10) : 'Not recorded',
    captureTimestamp: captureText,
    uploadTimestamp: photo.uploadTimestamp
      ? `${photo.uploadTimestamp.replace('T', ' ').slice(0, 19)} UTC`
      : 'Not recorded',
    workStartTime: visit?.workStartTime
      ? `${visit.workStartTime.replace('T', ' ').slice(0, 16)} UTC (${visit.workStartSource || 'Recorded'})`
      : incident?.workStartedAt
      ? `${incident.workStartedAt.replace('T', ' ').slice(0, 16)} UTC`
      : 'Not recorded',
    completionTime: visit?.workCompletionTime
      ? `${visit.workCompletionTime.replace('T', ' ').slice(0, 16)} UTC`
      : workOrder?.completedAt
      ? `${workOrder.completedAt.replace('T', ' ').slice(0, 16)} UTC`
      : 'Not recorded',
    closureTime: incident?.closedAt
      ? `${incident.closedAt.replace('T', ' ').slice(0, 16)} UTC`
      : 'Open / Not Closed',
    engineerName: engineerDisplay,
    coordinates: coordsText,
    classification: `${photo.classification.toUpperCase()} PHOTOGRAPH`,
    customText1: photo.stampConfig.customText1 || '',
    customText2: photo.stampConfig.customText2 || '',
  };
}

/**
 * Validates an uploaded image file by MIME type and file size (max 10 MB),
 * loads its natural dimensions, and downscales overly huge camera bitmaps (>1400px)
 * while strictly preserving aspect ratio so localStorage / canvas exports remain fast and reliable.
 */
export async function validateAndProcessUploadedImage(file: File): Promise<{
  ok: boolean;
  error?: string;
  dataUrl?: string;
  mimeType?: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/svg+xml';
  width?: number;
  height?: number;
  fileSizeKb?: number;
}> {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
  const normalizedType = file.type === 'image/jpg' ? 'image/jpeg' : file.type;

  if (!allowedTypes.includes(file.type)) {
    return {
      ok: false,
      error: `Unsupported image format "${file.type || 'unknown'}". Please upload a JPG, JPEG, PNG, WEBP, or SVG file.`,
    };
  }

  const maxBytes = 10 * 1024 * 1024; // 10 MB limit
  if (file.size > maxBytes) {
    return {
      ok: false,
      error: `File "${file.name}" (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the 10 MB maximum upload size limit.`,
    };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => {
      resolve({ ok: false, error: `Failed to read image file "${file.name}".` });
    };
    reader.onload = () => {
      const rawDataUrl = reader.result as string;
      const img = new Image();
      img.onerror = () => {
        resolve({
          ok: false,
          error: `File "${file.name}" could not be decoded as a valid image.`,
        });
      };
      img.onload = () => {
        const naturalW = img.naturalWidth || 960;
        const naturalH = img.naturalHeight || 540;
        const maxDim = 1280;

        if (naturalW <= maxDim && naturalH <= maxDim && file.size < 650 * 1024) {
          resolve({
            ok: true,
            dataUrl: rawDataUrl,
            mimeType: normalizedType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/svg+xml',
            width: naturalW,
            height: naturalH,
            fileSizeKb: Math.max(1, Math.round(file.size / 1024)),
          });
          return;
        }

        // Preserve exact aspect ratio while bounding resolution for reliable browser storage
        const scale = Math.min(maxDim / naturalW, maxDim / naturalH, 1);
        const targetW = Math.round(naturalW * scale);
        const targetH = Math.round(naturalH * scale);

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({
            ok: true,
            dataUrl: rawDataUrl,
            mimeType: normalizedType as 'image/jpeg' | 'image/png',
            width: naturalW,
            height: naturalH,
            fileSizeKb: Math.max(1, Math.round(file.size / 1024)),
          });
          return;
        }
        ctx.drawImage(img, 0, 0, targetW, targetH);
        const outType = normalizedType === 'image/png' ? 'image/png' : 'image/jpeg';
        const compressedUrl = canvas.toDataURL(outType, 0.86);
        const approxKb = Math.max(1, Math.round((compressedUrl.length * 0.75) / 1024));
        resolve({
          ok: true,
          dataUrl: compressedUrl,
          mimeType: outType,
          width: targetW,
          height: targetH,
          fileSizeKb: approxKb,
        });
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Renders the unmodified original photograph + vector annotations + configurable metadata stamp
 * onto an offscreen canvas and returns a PNG/JPEG data URL suitable for download or PDF embedding.
 */
export async function renderAnnotatedAndStampedDataUrl(
  photo: PhotoAsset,
  store: TelecomDataStore,
  canViewContactDetails: boolean,
  overrideAnnotations = photo.annotations,
  overrideStamp: PhotoStampConfig = photo.stampConfig
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onerror = () => reject(new Error('Failed to load base photograph for rendering.'));
    img.onload = () => {
      const w = photo.width || img.naturalWidth || 960;
      const h = photo.height || img.naturalHeight || 540;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(photo.originalDataUrl);
        return;
      }

      // 1. Draw unchanged original photograph preserving 100% aspect ratio
      ctx.drawImage(img, 0, 0, w, h);

      // 2. Draw vector annotations
      for (const shape of overrideAnnotations) {
        ctx.save();
        ctx.strokeStyle = shape.color || '#ef4444';
        ctx.fillStyle = shape.color || '#ef4444';
        ctx.lineWidth = shape.strokeWidth || 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (shape.tool === 'rect') {
          ctx.strokeRect(shape.x, shape.y, shape.width || 80, shape.height || 60);
        } else if (shape.tool === 'circle') {
          ctx.beginPath();
          ctx.arc(shape.x, shape.y, shape.radius || 40, 0, Math.PI * 2);
          ctx.stroke();
        } else if (shape.tool === 'line' && shape.points && shape.points.length >= 4) {
          ctx.beginPath();
          ctx.moveTo(shape.x + shape.points[0], shape.y + shape.points[1]);
          ctx.lineTo(shape.x + shape.points[2], shape.y + shape.points[3]);
          ctx.stroke();
        } else if (shape.tool === 'arrow' && shape.points && shape.points.length >= 4) {
          const x1 = shape.x + shape.points[0];
          const y1 = shape.y + shape.points[1];
          const x2 = shape.x + shape.points[2];
          const y2 = shape.y + shape.points[3];
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();

          // Arrowhead
          const angle = Math.atan2(y2 - y1, x2 - x1);
          const headLen = Math.max(12, shape.strokeWidth * 3.5);
          ctx.beginPath();
          ctx.moveTo(x2, y2);
          ctx.lineTo(
            x2 - headLen * Math.cos(angle - Math.PI / 6),
            y2 - headLen * Math.sin(angle - Math.PI / 6)
          );
          ctx.lineTo(
            x2 - headLen * Math.cos(angle + Math.PI / 6),
            y2 - headLen * Math.sin(angle + Math.PI / 6)
          );
          ctx.closePath();
          ctx.fill();
        } else if (shape.tool === 'freehand' && shape.points && shape.points.length >= 4) {
          ctx.beginPath();
          ctx.moveTo(shape.x + shape.points[0], shape.y + shape.points[1]);
          for (let i = 2; i < shape.points.length; i += 2) {
            ctx.lineTo(shape.x + shape.points[i], shape.y + shape.points[i + 1]);
          }
          ctx.stroke();
        } else if (shape.tool === 'text' && shape.text) {
          const fSize = shape.fontSize || 18;
          ctx.font = `bold ${fSize}px monospace`;
          const metrics = ctx.measureText(shape.text);
          const pad = 6;
          ctx.fillStyle = 'rgba(9, 13, 22, 0.82)';
          ctx.fillRect(
            shape.x - pad,
            shape.y - fSize - pad + 4,
            metrics.width + pad * 2,
            fSize + pad * 2
          );
          ctx.fillStyle = shape.color || '#facc15';
          ctx.fillText(shape.text, shape.x, shape.y);
        }
        ctx.restore();
      }

      // 3. Draw Configurable Image Metadata Stamp Overlay if enabled
      if (overrideStamp.enabled && overrideStamp.visibleFields.length > 0) {
        const meta = buildStampContextMetadata(
          { ...photo, stampConfig: overrideStamp },
          store,
          canViewContactDetails
        );
        const lines: string[] = [];
        for (const key of overrideStamp.visibleFields) {
          const val = meta[key];
          if (val && val !== 'N/A' && val !== '') {
            lines.push(`${STAMP_FIELD_LABELS[key]}: ${val}`);
          }
        }

        if (lines.length > 0) {
          ctx.save();
          const fontPx =
            overrideStamp.fontSize === 'small' ? 11 : overrideStamp.fontSize === 'large' ? 15 : 13;
          const lineHeight = fontPx + 5;
          ctx.font = `600 ${fontPx}px monospace`;

          const isFullWidthBar =
            overrideStamp.position === 'bottom-bar' || overrideStamp.position === 'top-bar';
          const cols =
            overrideStamp.layoutStyle === 'two-column-grid' && isFullWidthBar
              ? 2
              : overrideStamp.layoutStyle === 'compact-strip' && isFullWidthBar
              ? 3
              : 1;
          const rows = Math.ceil(lines.length / cols);
          const padX = 14;
          const padY = 10;
          const boxH = rows * lineHeight + padY * 2 + 6;
          const boxW = isFullWidthBar ? w : Math.min(w * 0.56, 480);

          let boxX = 0;
          let boxY = h - boxH;
          if (overrideStamp.position === 'top-bar') {
            boxX = 0;
            boxY = 0;
          } else if (overrideStamp.position === 'bottom-bar') {
            boxX = 0;
            boxY = h - boxH;
          } else if (overrideStamp.position === 'top-left') {
            boxX = 14;
            boxY = 14;
          } else if (overrideStamp.position === 'top-right') {
            boxX = w - boxW - 14;
            boxY = 14;
          } else if (overrideStamp.position === 'bottom-left') {
            boxX = 14;
            boxY = h - boxH - 14;
          } else if (overrideStamp.position === 'bottom-right') {
            boxX = w - boxW - 14;
            boxY = h - boxH - 14;
          }

          ctx.fillStyle = `rgba(9, 13, 22, ${overrideStamp.backgroundOpacity || 0.85})`;
          ctx.fillRect(boxX, boxY, boxW, boxH);
          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 2;
          ctx.strokeRect(boxX, boxY, boxW, boxH);

          const colWidth = (boxW - padX * 2) / cols;
          ctx.fillStyle = '#f8fafc';
          lines.forEach((lineText, idx) => {
            const r = Math.floor(idx / cols);
            const c = idx % cols;
            const tx = boxX + padX + c * colWidth;
            const ty = boxY + padY + (r + 1) * lineHeight - 2;
            const maxChars = Math.floor(colWidth / (fontPx * 0.62));
            const clipped =
              lineText.length > maxChars ? `${lineText.slice(0, maxChars - 1)}…` : lineText;
            ctx.fillText(clipped, tx, ty);
          });
          ctx.restore();
        }
      }

      resolve(canvas.toDataURL('image/png'));
    };
    img.src = photo.originalDataUrl;
  });
}

/**
 * Helper to trigger browser file download from Blob or Data URL.
 */
export function triggerBrowserDownload(blobOrUrl: Blob | string, filename: string): void {
  const url = typeof blobOrUrl === 'string' ? blobOrUrl : URL.createObjectURL(blobOrUrl);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  if (typeof blobOrUrl !== 'string') {
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}

/**
 * Generates an actual multi-page downloadable Engineering PDF Report using jsPDF + jspdf-autotable.
 * Supports Compact / Full Engineering layouts and With / Without Photographs.
 * Never fabricates missing measurements, checklists, or signatures.
 */
export async function generateEngineeringPdfDocument(
  reports: MaintenanceReport[],
  store: TelecomDataStore,
  variant: PdfVariantMode,
  canViewContactDetails: boolean,
  customFilename?: string,
  reportLanguage: 'en' | 'fr' | 'ar' = 'en'
): Promise<{ ok: boolean; filename: string; pageCount: number; error?: string }> {
  try {
    if (reports.length === 0) {
      return { ok: false, filename: '', pageCount: 0, error: 'No reports selected for PDF export.' };
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const branding = store.reportBranding;
    const isCompact = variant.startsWith('compact');
    const includePhotos = variant.endsWith('with-photos');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const rawI18n = PDF_I18N[reportLanguage] || PDF_I18N.en;
    const i18n = reportLanguage === 'ar'
      ? Object.fromEntries(Object.entries(rawI18n).map(([k, v]) => [k, reorderArabicForPdf(v)])) as typeof rawI18n
      : rawI18n;

    // If batch of multiple reports, add a Batch Cover Index first
    if (reports.length > 1) {
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 42, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(`${branding.logoText} — ${i18n.batchTitle}`, 14, 18);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`${branding.companyName} | ${branding.departmentName}`, 14, 26);
      doc.text(
        `Generated: ${new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC | Classification: ${branding.confidentialityLabel}`,
        14,
        34
      );

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`${i18n.batchIndex} (${reports.length})`, 14, 54);

      autoTable(doc, {
        startY: 59,
        head: [[i18n.reportNum, i18n.rev, i18n.type, i18n.siteCode, i18n.status, i18n.preparedBy, i18n.submitted]],
        body: reports.map((r) => [
          r.reportNumber,
          r.revisionCode || 'Rev 1.0',
          r.reportType || 'Maintenance Report',
          r.siteCode,
          r.approvalStatus,
          r.authorName || i18n.notRecorded,
          (r.submittedAt || '').slice(0, 16).replace('T', ' '),
        ]),
        styles: { fontSize: 8.5, cellPadding: 2.5 },
        headStyles: { fillColor: [2, 132, 199], textColor: 255 },
      });

      doc.addPage();
    }

    for (let rIdx = 0; rIdx < reports.length; rIdx++) {
      const report = reports[rIdx];
      if (rIdx > 0) {
        doc.addPage();
      }

      const site = store.sites.find((s) => s.id === report.siteId || s.siteCode === report.siteCode);
      const incident = store.incidents.find((i) => i.id === report.linkedIncidentId);
      const workOrder = store.workOrders.find(
        (w) =>
          w.id === report.linkedWorkOrderId || w.workOrderNumber === report.workOrderNumber
      );
      const visits = store.siteVisits.filter(
        (v) =>
          (report.linkedVisitIds && report.linkedVisitIds.includes(v.id)) ||
          (workOrder && v.workOrderId === workOrder.id) ||
          (incident && v.linkedIncidentId === incident.id)
      );
      const photos = store.photoAssets.filter(
        (p) =>
          (report.photoAssetIds && report.photoAssetIds.includes(p.id)) ||
          p.reportId === report.id ||
          (incident && p.incidentId === incident.id)
      );

      // 1. HEADER BANNER
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 38, 'F');
      doc.setTextColor(56, 189, 248);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(
        `${branding.logoText}  |  ${report.confidentialityLabel || branding.confidentialityLabel}`,
        14,
        10
      );

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.text(report.reportType || 'Engineering Maintenance Report', 14, 19);

      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`${branding.companyName} — ${branding.departmentName}`, 14, 26);
      doc.text(
        `Report No: ${report.reportNumber} (${report.revisionCode || 'Rev 1.0'})   |   Status: ${report.approvalStatus.toUpperCase()}   |   Generated: ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`,
        14,
        33
      );

      let cursorY = 45;

      // 2. DOCUMENT CONTROL TABLE
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(10.5);
      doc.setFont('helvetica', 'bold');
      doc.text(i18n.docControl, 14, cursorY);

      autoTable(doc, {
        startY: cursorY + 3,
        theme: 'grid',
        styles: { fontSize: 8.5, cellPadding: 2.2 },
        headStyles: { fillColor: [30, 41, 59], textColor: 255 },
        head: [[i18n.field, i18n.value, i18n.field, i18n.value]],
        body: [
          [
            i18n.reportNum,
            report.reportNumber,
            i18n.rev,
            `${report.revisionCode || 'Rev 1.0'} (${i18n.status}: ${report.approvalStatus})`,
          ],
          [
            i18n.preparedBy,
            report.authorName || i18n.notRecorded,
            i18n.submitted,
            report.submittedAt ? report.submittedAt.replace('T', ' ').slice(0, 19) + ' UTC' : i18n.notRecorded,
          ],
          [
            'Reviewed By',
            report.reviewedBy || 'Pending review',
            i18n.approvedBy,
            report.approvedBy || 'Pending approval (Not signed off)',
          ],
          [
            'Linked Incident ID',
            report.linkedIncidentId || incident?.id || i18n.notLinked,
            'Linked Work Order',
            report.workOrderNumber || workOrder?.workOrderNumber || i18n.notLinked,
          ],
        ],
      });

      cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;

      // 3. EXECUTIVE SUMMARY
      doc.setFontSize(10.5);
      doc.setFont('helvetica', 'bold');
      doc.text(i18n.execSummary, 14, cursorY);

      autoTable(doc, {
        startY: cursorY + 3,
        theme: 'grid',
        styles: { fontSize: 8.5, cellPadding: 2.5 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 44 } },
        body: [
          ['Document Title', report.title || i18n.notRecorded],
          ['Purpose of Visit', report.purposeOfVisit || visits[0]?.purpose || i18n.notRecorded],
          ['Executive Summary', report.summary || i18n.notRecorded],
          ['Service Impact', report.serviceImpactSummary || incident?.impact || i18n.notRecorded],
          ['Main Findings', report.mainFindings || visits[0]?.observations || i18n.notRecorded],
          ['Final Outcome', report.finalOutcome || visits[0]?.finalVisitOutcome || 'Pending verification'],
        ],
      });

      cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;

      // 4. SITE & INCIDENT INFORMATION
      doc.setFontSize(10.5);
      doc.setFont('helvetica', 'bold');
      doc.text('3. Authoritative Site & Incident Information', 14, cursorY);

      autoTable(doc, {
        startY: cursorY + 3,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [2, 132, 199], textColor: 255 },
        head: [['Site Parameter', 'Recorded Value', 'Incident Milestone / Field', 'Recorded Value']],
        body: [
          [
            'Site ID / Code',
            `${site?.id || report.siteId} / ${site?.siteCode || report.siteCode}`,
            'Incident ID & Severity',
            incident ? `${incident.id} (${incident.severity} / ${incident.priority || 'P1'})` : 'Not linked',
          ],
          [
            'Site Name',
            site?.siteName || report.siteName || 'Not recorded',
            'Alarm Reference(s)',
            incident ? [incident.alarmId, ...(incident.relatedAlarmIds || [])].join(', ') : 'Not recorded',
          ],
          [
            'Operator & Region',
            `${site?.operator || report.operator || 'Not recorded'} — ${site?.region || report.region || 'Not recorded'}`,
            'First Occurrence',
            incident?.firstOccurrence ? incident.firstOccurrence.replace('T', ' ').slice(0, 19) + ' UTC' : 'Not recorded',
          ],
          [
            'Address',
            site?.address || 'Not recorded',
            'Acknowledged At',
            incident?.acknowledgedAt ? `${incident.acknowledgedAt.replace('T', ' ').slice(0, 19)} UTC` : 'Not recorded',
          ],
          [
            'GPS Coordinates',
            site ? `${site.latitude.toFixed(5)}, ${site.longitude.toFixed(5)}` : 'Not recorded',
            'Service Restored At',
            incident?.serviceRestoredAt ? `${incident.serviceRestoredAt.replace('T', ' ').slice(0, 19)} UTC` : 'Pending restoration',
          ],
          [
            'Site Type & Tech',
            site ? `${site.siteType} (${site.technologies.join(', ')})` : 'Not recorded',
            'Alarm Cleared / Closed',
            incident
              ? `Cleared: ${incident.alarmClearedAt ? incident.alarmClearedAt.slice(0, 16).replace('T', ' ') : 'No'} | Closed: ${incident.closedAt ? incident.closedAt.slice(0, 16).replace('T', ' ') : 'Open'}`
              : 'Not recorded',
          ],
          [
            'Power Configuration',
            site?.powerConfiguration || 'Not recorded',
            'Confirmed Root Cause',
            incident?.confirmedRootCause || visits[0]?.confirmedRootCause || 'Not yet determined',
          ],
        ],
      });

      cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;

      // Full Engineering Report Sections (Timeline, Checklists, Measurements, Equipment Replacements)
      if (!isCompact) {
        // Incident Timeline
        if (incident?.timeline && incident.timeline.length > 0) {
          if (cursorY > pageHeight - 50) {
            doc.addPage();
            cursorY = 20;
          }
          doc.setFontSize(10.5);
          doc.setFont('helvetica', 'bold');
          doc.text('4. Incident Investigation & Operational Timeline', 14, cursorY);

          autoTable(doc, {
            startY: cursorY + 3,
            theme: 'striped',
            styles: { fontSize: 7.8, cellPadding: 2 },
            headStyles: { fillColor: [30, 41, 59], textColor: 255 },
            head: [['UTC Timestamp', 'Event Type', 'Actor', 'Operational Details']],
            body: incident.timeline.map((ev) => [
              ev.timestamp.replace('T', ' ').slice(0, 19),
              ev.eventType,
              canViewContactDetails ? `${ev.actorName} (${ev.actorRole})` : ev.actorRole,
              `${ev.title} — ${ev.details}`,
            ]),
          });
          cursorY =
            (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;
        }

        // Field Visits, Checklists & Measurements
        const allMeasurements = visits.flatMap((v) => v.measurementRecords || []);
        const allReplacements = visits.flatMap((v) => v.equipmentReplacements || []);
        const allChecklists = visits.flatMap((v) =>
          (v.checklistItems || []).map((ci) => ({ visitCode: v.visitCode, ...ci }))
        );

        if (cursorY > pageHeight - 50) {
          doc.addPage();
          cursorY = 20;
        }
        doc.setFontSize(10.5);
        doc.setFont('helvetica', 'bold');
        doc.text('5. Field Maintenance Execution, Measurements & Checklists', 14, cursorY);

        autoTable(doc, {
          startY: cursorY + 3,
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [2, 132, 199], textColor: 255 },
          head: [
            [
              'Visit Code',
              'Engineer / Squad',
              'Arrival (Actual)',
              'Work Start / End',
              'Departure',
              'Work Performed & Findings',
            ],
          ],
          body:
            visits.length > 0
              ? visits.map((v) => [
                  v.visitCode,
                  `${canViewContactDetails ? v.engineerName : 'Field Engineer'} (${v.teamName})`,
                  v.checkInTime
                    ? `${v.checkInTime.replace('T', ' ').slice(0, 16)} (${v.checkInSource || 'Recorded'})`
                    : 'Not recorded',
                  `${v.workStartTime ? v.workStartTime.slice(11, 16) : 'N/A'} - ${
                    v.workCompletionTime ? v.workCompletionTime.slice(11, 16) : 'N/A'
                  }`,
                  v.checkOutTime ? v.checkOutTime.replace('T', ' ').slice(0, 16) : 'Not recorded',
                  v.workPerformed || v.observations || 'Not recorded',
                ])
              : [['None linked', 'Not recorded', 'Not recorded', 'Not recorded', 'Not recorded', 'No field visit records linked']],
        });

        cursorY =
          (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

        // Measurements Table
        autoTable(doc, {
          startY: cursorY,
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [30, 41, 59], textColor: 255 },
          head: [
            [
              'Parameter Measured',
              'Equipment / Sector',
              'Value & Unit',
              'Reference Standard',
              'Status',
              'Test Instrument',
            ],
          ],
          body:
            allMeasurements.length > 0
              ? allMeasurements.map((m) => [
                  m.parameterName,
                  m.equipmentOrSector,
                  `${m.measuredValue} ${m.unit}`,
                  m.referenceRange,
                  m.status,
                  m.testInstrument || 'Not recorded',
                ])
              : [
                  [
                    'No structured measurements recorded',
                    '—',
                    'Not tested',
                    '—',
                    'Not tested',
                    'Not recorded',
                  ],
                ],
        });

        cursorY =
          (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

        // Checklist Results Table
        if (allChecklists.length > 0) {
          autoTable(doc, {
            startY: cursorY,
            theme: 'striped',
            styles: { fontSize: 7.8, cellPadding: 2 },
            headStyles: { fillColor: [2, 132, 199], textColor: 255 },
            head: [['Visit', 'Checklist Item', 'Result', 'Measurement', 'Engineer Notes']],
            body: allChecklists.map((c) => [
              c.visitCode,
              c.label,
              c.result === 'Pending' ? 'Not Tested' : c.result,
              c.measuredValue ? `${c.measuredValue} ${c.unit || ''}`.trim() : 'Not applicable',
              c.remarks || '—',
            ]),
          });
          cursorY =
            (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
        }

        // Equipment Replacements Table
        autoTable(doc, {
          startY: cursorY,
          theme: 'grid',
          styles: { fontSize: 7.8, cellPadding: 2 },
          headStyles: { fillColor: [30, 41, 59], textColor: 255 },
          head: [
            [
              'Category & Slot',
              'Removed Model / SN',
              'Installed Model / SN',
              'Firmware',
              'Fault Reason',
              'Verified',
            ],
          ],
          body:
            allReplacements.length > 0
              ? allReplacements.map((eq) => [
                  `${eq.equipmentCategory} (${eq.sectorOrSlot})`,
                  `${eq.removedManufacturerModel} | SN: ${eq.removedSerialNumber}`,
                  `${eq.installedManufacturerModel} | SN: ${eq.installedSerialNumber}`,
                  eq.firmwareVersion || 'Not recorded',
                  eq.faultReason,
                  eq.verifiedOperational ? 'Verified Pass' : 'Pending verification',
                ])
              : [['None', 'No equipment replaced during visit', '—', '—', '—', 'N/A']],
        });

        cursorY =
          (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;
      }

      // 6. PHOTOGRAPHIC EVIDENCE SECTION (If variant includes photos)
      if (includePhotos && photos.length > 0) {
        doc.addPage();
        cursorY = 20;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(
          `6. Photographic Evidence & Stamped Field Documentation (${photos.length} Assets)`,
          14,
          cursorY
        );
        cursorY += 6;

        for (let pIdx = 0; pIdx < photos.length; pIdx++) {
          const photo = photos[pIdx];
          if (cursorY > pageHeight - 95) {
            doc.addPage();
            cursorY = 20;
          }

          try {
            const renderedPng =
              photo.annotatedDataUrl ||
              (await renderAnnotatedAndStampedDataUrl(photo, store, canViewContactDetails));

            const maxImgW = 175;
            const maxImgH = 72;
            const ratio = (photo.width || 960) / (photo.height || 540);
            let drawW = maxImgW;
            let drawH = drawW / ratio;
            if (drawH > maxImgH) {
              drawH = maxImgH;
              drawW = drawH * ratio;
            }

            doc.addImage(renderedPng, 'PNG', 14, cursorY, drawW, drawH);
            cursorY += drawH + 4;

            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text(
              `${photo.figureNumber || `Figure ${pIdx + 1}`} [${photo.classification.toUpperCase()}] — ${photo.title} (${photo.id})`,
              14,
              cursorY
            );
            cursorY += 4;

            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(71, 85, 105);
            const captionLines = doc.splitTextToSize(
              `Caption: ${photo.caption || 'Not recorded'} | Equipment: ${photo.equipmentOrArea || 'Not recorded'} | Captured: ${photo.captureTimestamp || 'Not recorded'} (${photo.captureTimestampSource}) | Annotations: ${photo.annotations.length}`,
              180
            );
            doc.text(captionLines, 14, cursorY);
            cursorY += captionLines.length * 4 + 6;
          } catch {
            doc.setFontSize(8.5);
            doc.text(
              `[Photo Asset ${photo.id}: ${photo.title} — Image rendering skipped]`,
              14,
              cursorY
            );
            cursorY += 8;
          }
        }
      }

      // 7. VERIFICATION & SIGN-OFF SECTION
      if (cursorY > pageHeight - 65) {
        doc.addPage();
        cursorY = 20;
      }
      doc.setFontSize(10.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('7. Post-Repair Verification & Formal Engineering Sign-Off', 14, cursorY);

      autoTable(doc, {
        startY: cursorY + 3,
        theme: 'grid',
        styles: { fontSize: 8.2, cellPadding: 2.3 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 48 } },
        body: [
          [
            'Diagnostic Procedures',
            report.diagnosticProcedures || 'Not recorded',
          ],
          [
            'Post-Repair Checks',
            report.postRepairVerificationChecks || 'Pending verification',
          ],
          [
            'Alarm & Connectivity Status',
            report.connectivityAndAlarmStatus || 'Pending verification',
          ],
          [
            'Outstanding Faults',
            report.outstandingFaults || 'None recorded',
          ],
          [
            'Preventive Recommendations',
            report.recommendations || visits[0]?.preventiveRecommendations || 'Not recorded',
          ],
          [
            'Approval & Sign-Off Notice',
            report.approvalStatus === 'Approved'
              ? `APPROVED IN-APP by ${report.approvedBy} at ${report.approvedAt}. (Note: In-app role sign-off recorded; external PKI cryptographic signature not applied.)`
              : `CURRENT STATUS: ${report.approvalStatus.toUpperCase()}. A generated PDF does not constitute an approved engineering report until formally approved by an authorized reviewer.`,
          ],
        ],
      });
    }

    // Add consistent header/footer and page numbers across all pages
    const totalPages = doc.getNumberOfPages();
    const footerReportRef =
      reports.length === 1 ? reports[0].reportNumber : `BATCH (${reports.length} REPORTS)`;

    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setDrawColor(203, 213, 225);
      doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(
        `${branding.companyName} | Ref: ${footerReportRef} | ${branding.confidentialityLabel}`,
        14,
        pageHeight - 7.5
      );
      doc.text(`Page ${p} of ${totalPages}`, pageWidth - 32, pageHeight - 7.5);
    }

    const safeName =
      customFilename ||
      (reports.length === 1
        ? `${reports[0].reportNumber}_${reports[0].siteCode}_${variant}.pdf`
        : `TelecomOps360_Batch_Reports_${reports.length}_${new Date().toISOString().slice(0, 10)}.pdf`);

    doc.save(safeName);
    return { ok: true, filename: safeName, pageCount: totalPages };
  } catch (err) {
    return {
      ok: false,
      filename: '',
      pageCount: 0,
      error: err instanceof Error ? err.message : 'PDF generation failed.',
    };
  }
}

/**
 * Generates and downloads a genuine multi-sheet XLSX workbook using SheetJS (xlsx)
 * with 11 structured sheets, column widths, auto-filters, and relational IDs.
 */
export function exportEngineeringWorkbookXlsx(
  options: {
    reports?: MaintenanceReport[];
    incidents?: Incident[];
    workOrders?: WorkOrder[];
    siteVisits?: SiteVisit[];
    filenamePrefix?: string;
  },
  store: TelecomDataStore,
  canViewContactDetails: boolean
): { ok: boolean; filename: string; sheetCount: number; error?: string } {
  try {
    const wb = XLSX.utils.book_new();

    const targetReports = options.reports || store.maintenanceReports;
    const targetIncidents = options.incidents || store.incidents;
    const targetWorkOrders = options.workOrders || store.workOrders;
    const targetVisits = options.siteVisits || store.siteVisits;

    const addFormattedSheet = (sheetName: string, rows: Record<string, unknown>[]) => {
      const safeRows =
        rows.length > 0 ? rows : [{ Notice: `No records in selection for ${sheetName}` }];
      const ws = XLSX.utils.json_to_sheet(safeRows);
      const keys = Object.keys(safeRows[0] || {});
      ws['!cols'] = keys.map((k) => ({
        wch: Math.min(44, Math.max(k.length + 4, 16)),
      }));
      if (keys.length > 0 && safeRows.length > 0) {
        const endCol = XLSX.utils.encode_col(keys.length - 1);
        ws['!autofilter'] = { ref: `A1:${endCol}${safeRows.length + 1}` };
      }
      XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
    };

    // 1. Report Summary
    addFormattedSheet(
      'Report Summary',
      targetReports.map((r) => ({
        ReportID: r.id,
        ReportNumber: r.reportNumber,
        Revision: r.revisionCode || 'Rev 1.0',
        ReportType: r.reportType || 'Maintenance Report',
        Status: r.approvalStatus,
        SiteID: r.siteId,
        SiteCode: r.siteCode,
        Region: r.region || 'Not recorded',
        Operator: r.operator || 'ApexTel',
        LinkedIncidentID: r.linkedIncidentId || 'Not linked',
        WorkOrderNumber: r.workOrderNumber || 'Not linked',
        PreparedBy: canViewContactDetails ? r.authorName : 'Redacted for Role',
        ReviewedBy: r.reviewedBy || 'Pending review',
        ApprovedBy: r.approvedBy || 'Pending approval',
        SubmittedAtUTC: r.submittedAt,
        ExecutiveSummary: r.summary,
        FinalOutcome: r.finalOutcome || 'Not recorded',
      }))
    );

    // 2. Incidents
    addFormattedSheet(
      'Incidents',
      targetIncidents.map((inc) => ({
        IncidentID: inc.id,
        PrimaryAlarmID: inc.alarmId,
        SiteID: inc.siteId,
        SiteCode: inc.siteCode,
        SiteName: inc.siteName,
        Region: inc.region,
        Domain: inc.domain,
        Technology: inc.technology,
        Severity: inc.severity,
        Priority: inc.priority || 'Standard',
        Status: inc.status,
        FirstOccurrenceUTC: inc.firstOccurrence,
        AcknowledgedAtUTC: inc.acknowledgedAt || 'Not acknowledged',
        WorkStartedAtUTC: inc.workStartedAt || 'Not started',
        ServiceRestoredAtUTC: inc.serviceRestoredAt || 'Not restored',
        AlarmClearedAtUTC: inc.alarmClearedAt || 'Active',
        ClosedAtUTC: inc.closedAt || 'Open',
        SuspectedRootCause: inc.suspectedRootCause || 'Not recorded',
        ConfirmedRootCause: inc.confirmedRootCause || 'Not yet determined',
      }))
    );

    // 3. Alarm History
    addFormattedSheet(
      'Alarm History',
      store.alarms.map((a) => ({
        AlarmID: a.id,
        VendorCode: a.vendorCode,
        AlarmName: a.alarmName,
        Severity: a.severity,
        Classification: a.classification,
        Domain: a.domain,
        Technology: a.technology,
        SiteID: a.siteId,
        SiteCode: a.siteCode,
        EquipmentID: a.equipmentId,
        ManagedObject: a.managedObject || 'N/A',
        OccurrenceCount: a.occurrenceCount,
        FirstOccurrenceUTC: a.firstOccurrence,
        LastOccurrenceUTC: a.lastOccurrence,
        ActiveOnNetwork: a.isSimulatedActive ? 'ACTIVE' : 'CLEARED',
        LinkedIncidentID: a.linkedIncidentId || 'Unlinked',
      }))
    );

    // 4. Site Visits
    addFormattedSheet(
      'Site Visits',
      targetVisits.map((sv) => ({
        VisitID: sv.id,
        VisitCode: sv.visitCode,
        Status: sv.status,
        SubmissionState: sv.submissionState || 'Draft',
        SiteID: sv.siteId,
        SiteCode: sv.siteCode,
        SiteName: sv.siteName,
        LinkedWorkOrderID: sv.workOrderId || 'Standalone',
        LinkedIncidentID: sv.linkedIncidentId || 'None',
        TeamName: sv.teamName,
        Engineer: canViewContactDetails ? sv.engineerName : 'Masked for Role',
        ScheduledUTC: sv.scheduledDate,
        ActualArrivalUTC: sv.checkInTime || 'Not recorded',
        WorkStartUTC: sv.workStartTime || 'Not recorded',
        WorkCompletionUTC: sv.workCompletionTime || 'Not recorded',
        ActualDepartureUTC: sv.checkOutTime || 'Not recorded',
        Purpose: sv.purpose,
        Findings: sv.observations || 'Not recorded',
        WorkPerformed: sv.workPerformed || 'Not recorded',
        FinalOutcome: sv.finalVisitOutcome || 'Not recorded',
        ChecklistCompletionPct: sv.checklistCompletedPercent,
      }))
    );

    // 5. Work Orders
    addFormattedSheet(
      'Work Orders',
      targetWorkOrders.map((wo) => ({
        WorkOrderID: wo.id,
        WorkOrderNumber: wo.workOrderNumber,
        JobType: wo.jobType,
        Priority: wo.priority,
        Status: wo.status,
        VerificationStatus: wo.verificationStatus || 'Not Requested',
        SiteID: wo.siteId,
        SiteCode: wo.siteCode,
        LinkedIncidentID: wo.linkedIncidentId || 'None',
        AssignedTeamID: wo.assignedTeamId,
        Assignee: canViewContactDetails ? wo.assignedAssigneeName : 'Masked for Role',
        ScheduledDateUTC: wo.scheduledVisitDate,
        WorkStartedAtUTC: wo.workStartedAt || 'Not started',
        CompletedAtUTC: wo.completedAt || 'Not completed',
        VerifiedBy: wo.verifiedBy || 'Pending',
        WorkDescription: wo.workDescription,
      }))
    );

    // 6. Equipment Replacements
    const allReplacements = targetVisits.flatMap((v) => v.equipmentReplacements || []);
    addFormattedSheet(
      'Equipment Replacements',
      allReplacements.map((eq) => ({
        ReplacementID: eq.id,
        VisitID: eq.visitId,
        WorkOrderID: eq.workOrderId || 'N/A',
        IncidentID: eq.incidentId || 'N/A',
        SiteCode: eq.siteCode,
        EquipmentCategory: eq.equipmentCategory,
        SlotOrSector: eq.sectorOrSlot,
        RemovedModel: eq.removedManufacturerModel,
        RemovedPartNumber: eq.removedPartNumber,
        RemovedSerialNumber: eq.removedSerialNumber,
        InstalledModel: eq.installedManufacturerModel,
        InstalledPartNumber: eq.installedPartNumber,
        InstalledSerialNumber: eq.installedSerialNumber,
        FirmwareVersion: eq.firmwareVersion,
        FaultReason: eq.faultReason,
        VerifiedOperational: eq.verifiedOperational ? 'YES' : 'NO',
        ReplacedAtUTC: eq.replacedAt,
      }))
    );

    // 7. Measurements
    const allMeasurements = targetVisits.flatMap((v) => v.measurementRecords || []);
    addFormattedSheet(
      'Measurements',
      allMeasurements.map((m) => ({
        MeasurementID: m.id,
        VisitID: m.visitId,
        SiteCode: m.siteCode,
        IncidentID: m.incidentId || 'N/A',
        ParameterName: m.parameterName,
        EquipmentOrSector: m.equipmentOrSector,
        NumericOrRecordedValue: Number.isNaN(Number(m.measuredValue))
          ? m.measuredValue
          : Number(m.measuredValue),
        Unit: m.unit,
        ReferenceRange: m.referenceRange,
        Status: m.status,
        TestInstrument: m.testInstrument,
        RecordedAtUTC: m.recordedAt,
      }))
    );

    // 8. Inspection Checklists
    const allChecklists = targetVisits.flatMap((v) =>
      (v.checklistItems || []).map((c) => ({
        VisitID: v.id,
        VisitCode: v.visitCode,
        SiteCode: v.siteCode,
        TemplateID: v.checklistTemplateId || 'Standard',
        ChecklistItemID: c.itemId,
        CheckDescription: c.label,
        ResultStatus: c.result === 'Pending' ? 'Not Tested' : c.result,
        MeasuredValue: c.measuredValue || 'Not applicable',
        Unit: c.unit || '',
        Remarks: c.remarks || '',
      }))
    );
    addFormattedSheet('Inspection Checklists', allChecklists);

    // 9. Parts Used
    const allParts = targetVisits.flatMap((v) => v.sparePartUsages || []);
    addFormattedSheet(
      'Parts Used',
      allParts.map((sp) => ({
        UsageID: sp.id,
        VisitID: sp.visitId,
        WorkOrderID: sp.workOrderId || 'N/A',
        SiteCode: sp.siteCode,
        PartNumber: sp.partNumber,
        PartName: sp.partName,
        Category: sp.category,
        Quantity: sp.quantity,
        Unit: sp.unit,
        BatchOrSerial: sp.serialOrBatchNumber || 'N/A',
        WarehouseSource: sp.warehouseSource,
        RecordedAtUTC: sp.recordedAt,
      }))
    );

    // 10. Photo Index (References & Metadata without embedding raw binary blobs into cells)
    addFormattedSheet(
      'Photo Index',
      store.photoAssets.map((p) => ({
        PhotoAssetID: p.id,
        FigureNumber: p.figureNumber || 'Unnumbered',
        Classification: p.classification,
        PairGroupID: p.pairGroupId || 'Single',
        SiteID: p.siteId,
        SiteCode: p.siteCode,
        LinkedIncidentID: p.incidentId || 'N/A',
        LinkedWorkOrderID: p.workOrderId || 'N/A',
        LinkedVisitID: p.visitId || 'N/A',
        LinkedReportID: p.reportId || 'N/A',
        Title: p.title,
        Caption: p.caption,
        EquipmentOrArea: p.equipmentOrArea,
        AnnotatedOverlayApplied: p.isAnnotated ? 'YES (Separate Asset Preserved)' : 'NO (Original Only)',
        AnnotationShapesCount: p.annotations.length,
        Resolution: `${p.width}x${p.height}`,
        FileSizeKB: p.fileSizeKb,
        CaptureTimestamp: p.captureTimestamp || 'Not recorded',
        CaptureSource: p.captureTimestampSource,
        AssetReferenceURI: `telecomops360://photo-assets/${p.id}`,
      }))
    );

    // 11. Team Activity
    addFormattedSheet(
      'Team Activity',
      store.teams.map((t) => {
        const teamIncidents = store.incidents.filter((i) => i.assignedTeamId === t.id).length;
        const teamWos = store.workOrders.filter((w) => w.assignedTeamId === t.id).length;
        const teamVisits = store.siteVisits.filter((v) => v.teamName === t.name).length;
        return {
          TeamID: t.id,
          TeamCode: t.code,
          TeamName: t.name,
          Region: t.region,
          PrimarySpecialization: t.specialization,
          AvailabilityStatus: t.availabilityStatus || 'Available',
          AssignedIncidentsCount: teamIncidents,
          AssignedWorkOrdersCount: teamWos,
          FieldVisitsExecuted: teamVisits,
        };
      })
    );

    const filename = `${options.filenamePrefix || 'TelecomOps360_Engineering_Workbook'}_${new Date()
      .toISOString()
      .slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
    return { ok: true, filename, sheetCount: wb.SheetNames.length };
  } catch (err) {
    return {
      ok: false,
      filename: '',
      sheetCount: 0,
      error: err instanceof Error ? err.message : 'Excel XLSX export failed.',
    };
  }
}

/**
 * Exports a versioned, validated JSON document with explicit schema metadata,
 * relationship links, measurement units, and attachment metadata references
 * (without leaking passwords, tokens, or embedding bulky raw binary data URLs unless requested).
 */
export function exportValidatedJsonPackage(
  exportType:
    | 'single-incident'
    | 'single-visit'
    | 'single-workorder'
    | 'single-report'
    | 'selected-batch'
    | 'complete-permitted-batch',
  filtersUsed: Record<string, string>,
  records: {
    reports?: MaintenanceReport[];
    incidents?: Incident[];
    workOrders?: WorkOrder[];
    siteVisits?: SiteVisit[];
    sites?: Site[];
    photoAssets?: PhotoAsset[];
  },
  canViewContactDetails: boolean,
  customFilename?: string
): { ok: boolean; filename: string; byteSize: number; error?: string } {
  try {
    // Strip binary image data URLs from JSON export and provide explicit metadata references
    const sanitizedPhotos = (records.photoAssets || []).map((p) => ({
      id: p.id,
      title: p.title,
      caption: p.caption,
      figureNumber: p.figureNumber ?? null,
      classification: p.classification,
      pairGroupId: p.pairGroupId ?? null,
      equipmentOrArea: p.equipmentOrArea,
      tags: p.tags,
      relationships: {
        siteId: p.siteId,
        siteCode: p.siteCode,
        incidentId: p.incidentId ?? null,
        workOrderId: p.workOrderId ?? null,
        visitId: p.visitId ?? null,
        reportId: p.reportId ?? null,
      },
      dimensions: { widthPx: p.width, heightPx: p.height, fileSizeKb: p.fileSizeKb },
      timestamps: {
        captureTimestamp: p.captureTimestamp ?? null,
        captureTimestampSource: p.captureTimestampSource,
        uploadTimestamp: p.uploadTimestamp,
      },
      gpsCoordinates: p.gpsCoordinates ?? null,
      isAnnotated: p.isAnnotated,
      annotationsCount: p.annotations.length,
      annotations: p.annotations,
      stampConfig: p.stampConfig,
      revisionHistory: p.revisionHistory,
      binaryReferenceNotice:
        'Binary photograph contents are stored separately in the Photo Asset Repository (originalDataUrl & annotatedDataUrl). This JSON export contains structured metadata, vector annotations, and relational references.',
    }));

    const payload = {
      schemaVersion: 'telecomops360.phase4.export.v1.0',
      exportedAtUtc: new Date().toISOString(),
      exportScope: exportType,
      exportFilters: filtersUsed,
      securityAndPrivacyNotice:
        'Authentication tokens, credentials, and private keys are excluded. Contact fields respect the active user role permissions.',
      attachmentHandlingNotice:
        'Photograph assets are represented as structured metadata, vector annotation layers, and asset IDs rather than inline base64 binary blobs.',
      counts: {
        reports: records.reports?.length ?? 0,
        incidents: records.incidents?.length ?? 0,
        workOrders: records.workOrders?.length ?? 0,
        siteVisits: records.siteVisits?.length ?? 0,
        sites: records.sites?.length ?? 0,
        photoAssets: sanitizedPhotos.length,
      },
      data: {
        reports: (records.reports || []).map((r) => ({
          ...r,
          authorName: canViewContactDetails ? r.authorName : 'Redacted for Role',
        })),
        incidents: records.incidents || [],
        workOrders: records.workOrders || [],
        siteVisits: (records.siteVisits || []).map((sv) => ({
          ...sv,
          engineerName: canViewContactDetails ? sv.engineerName : 'Redacted for Role',
        })),
        sites: (records.sites || []).map((s) => ({
          ...s,
          accessInstructions: canViewContactDetails
            ? s.accessInstructions ?? null
            : 'Restricted Site Vault Access Code Masked',
        })),
        photoAssets: sanitizedPhotos,
      },
    };

    const jsonString = JSON.stringify(payload, null, 2);
    // Validate JSON round-trip and required schema header before triggering download
    const parsedCheck = JSON.parse(jsonString);
    if (!parsedCheck.schemaVersion || !parsedCheck.exportedAtUtc || !parsedCheck.data) {
      throw new Error('JSON schema validation failed prior to download.');
    }

    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const filename =
      customFilename ||
      `TelecomOps360_${exportType}_${new Date().toISOString().slice(0, 10)}.json`;
    triggerBrowserDownload(blob, filename);

    return { ok: true, filename, byteSize: blob.size };
  } catch (err) {
    return {
      ok: false,
      filename: '',
      byteSize: 0,
      error: err instanceof Error ? err.message : 'JSON export validation failed.',
    };
  }
}
