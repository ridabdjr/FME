import Konva from 'konva';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Briefcase,
  Camera,
  CheckCircle2,
  Circle as CircleIcon,
  Columns,
  Download,
  Eye,
  FileImage,
  History,
  Layers,
  Minus,
  MousePointer,
  PenTool,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  Square,
  Stamp,
  Trash2,
  Type,
  Undo2,
  Upload,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  buildStampContextMetadata,
  renderAnnotatedAndStampedDataUrl,
  STAMP_FIELD_LABELS,
  triggerBrowserDownload,
  validateAndProcessUploadedImage,
} from '../../services/reportExportService';
import {
  PhotoAnnotationShape,
  PhotoAnnotationTool,
  PhotoClassification,
  PhotoStampConfig,
  StampFieldKey,
  StampFontSize,
  StampLayoutStyle,
  StampPosition,
} from '../../types/models';
import { formatUtcTimestamp } from '../common/StatusIndicators';

const COLORS = [
  { label: 'Critical Red', hex: '#ef4444' },
  { label: 'Safety Yellow', hex: '#facc15' },
  { label: 'Verified Green', hex: '#22c55e' },
  { label: 'Telecom Sky', hex: '#38bdf8' },
  { label: 'Warning Orange', hex: '#f97316' },
  { label: 'Pure White', hex: '#f8fafc' },
];

const STROKE_WIDTHS = [2, 3, 4, 6, 8];

const ALL_STAMP_FIELDS: StampFieldKey[] = [
  'organizationName',
  'reportReference',
  'caseId',
  'workType',
  'casePriority',
  'shortCaption',
  'incidentId',
  'workOrderId',
  'siteId',
  'siteCode',
  'siteName',
  'siteAddress',
  'region',
  'equipmentInfo',
  'photoTitle',
  'incidentDescription',
  'workPerformed',
  'priority',
  'visitDate',
  'captureTimestamp',
  'uploadTimestamp',
  'workStartTime',
  'completionTime',
  'closureTime',
  'engineerName',
  'coordinates',
  'classification',
  'customText1',
  'customText2',
];

export const PhotoAnnotationStudio: React.FC = () => {
  const {
    store,
    selectedPhotoId,
    setSelectedPhotoId,
    photoStudioPrefill,
    can,
    uploadPhotoAsset,
    savePhotoAnnotationsAndStamp,
    updatePhotoMetadata,
    openSiteById,
    openIncidentById,
    openWorkOrderById,
    openSiteVisitById,
    openReportById,
    openCaseById,
    linkPhotoToCase,
    showToast,
  } = useApp();

  const tz = store.userTimezone || 'UTC';
  const canViewContactDetails = can('user:view_contact_details');
  const canAnnotate = can('photo:annotate');
  const canUpload = can('photo:upload');

  const selectedPhoto = useMemo(
    () =>
      store.photoAssets.find((p) => p.id === selectedPhotoId) ||
      store.photoAssets[0] ||
      null,
    [store.photoAssets, selectedPhotoId]
  );

  // Active Tool & Canvas State
  const [activeTool, setActiveTool] = useState<PhotoAnnotationTool>('select');
  const [strokeColor, setStrokeColor] = useState<string>('#ef4444');
  const [strokeWidth, setStrokeWidth] = useState<number>(4);
  const [textDraftInput, setTextDraftInput] = useState<string>('Fault Observed Here');
  const [zoom, setZoom] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showOriginalOnly, setShowOriginalOnly] = useState<boolean>(false);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState<boolean>(false);
  const [comparePairsMode, setComparePairsMode] = useState<boolean>(false);
  const [filterClassification, setFilterClassification] = useState<string>('ALL');

  // Undo / Redo Stack for Annotations
  const [annotations, setAnnotations] = useState<PhotoAnnotationShape[]>([]);
  const [undoStack, setUndoStack] = useState<PhotoAnnotationShape[][]>([]);
  const [redoStack, setRedoStack] = useState<PhotoAnnotationShape[][]>([]);

  // Stamp Config State
  const [stampConfig, setStampConfig] = useState<PhotoStampConfig>(
    () =>
      selectedPhoto?.stampConfig || {
        enabled: true,
        position: 'bottom-bar',
        layoutStyle: 'two-column-grid',
        fontSize: 'medium',
        backgroundOpacity: 0.85,
        visibleFields: [
          'organizationName',
          'reportReference',
          'incidentId',
          'workOrderId',
          'siteCode',
          'siteName',
          'equipmentInfo',
          'classification',
          'captureTimestamp',
          'coordinates',
        ],
        organizationName: store.reportBranding.companyName,
        reportReference: 'TM-2026-000101',
        customText1: '',
        customText2: '',
      }
  );

  // Metadata Editor Sidebar Tab ('stamp' | 'metadata' | 'revisions' | 'upload')
  const [rightPanelTab, setRightPanelTab] = useState<
    'stamp' | 'metadata' | 'revisions' | 'upload'
  >('stamp');
  const [revisionNote, setRevisionNote] = useState<string>('');
  const [hasUnsavedEdits, setHasUnsavedEdits] = useState<boolean>(false);

  // Photo Metadata Form State
  const [metaTitle, setMetaTitle] = useState('');
  const [metaCaption, setMetaCaption] = useState('');
  const [metaFigure, setMetaFigure] = useState('');
  const [metaClassification, setMetaClassification] =
    useState<PhotoClassification>('Before');
  const [metaPairGroup, setMetaPairGroup] = useState('');
  const [metaEquipment, setMetaEquipment] = useState('');
  const [metaTags, setMetaTags] = useState('');
  const [metaSiteId, setMetaSiteId] = useState('');
  const [metaIncidentId, setMetaIncidentId] = useState('');
  const [metaWorkOrderId, setMetaWorkOrderId] = useState('');
  const [metaVisitId, setMetaVisitId] = useState('');
  const [metaReportId, setMetaReportId] = useState('');
  const [metaCaseId, setMetaCaseId] = useState('');

  // Upload New Photo Modal / Panel State
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploadClassification, setUploadClassification] =
    useState<PhotoClassification>('Before');
  const [uploadPairGroup, setUploadPairGroup] = useState('PAIR-FIELD-01');
  const [uploadEquipment, setUploadEquipment] = useState('');
  const [uploadTags, setUploadTags] = useState('Field Inspection, Evidence');
  const [uploadSiteId, setUploadSiteId] = useState(
    photoStudioPrefill?.siteId || store.sites[0]?.id || 'SITE-1001'
  );
  const [uploadIncidentId, setUploadIncidentId] = useState(
    photoStudioPrefill?.incidentId || ''
  );
  const [uploadWorkOrderId, setUploadWorkOrderId] = useState(
    photoStudioPrefill?.workOrderId || ''
  );
  const [uploadVisitId, setUploadVisitId] = useState(photoStudioPrefill?.visitId || '');
  const [uploadReportId, setUploadReportId] = useState(photoStudioPrefill?.reportId || '');
  const [uploadCaseId, setUploadCaseId] = useState(photoStudioPrefill?.caseId || '');
  const [uploadCaptureTime, setUploadCaptureTime] = useState('');
  const [uploadTimeSource, setUploadTimeSource] = useState<
    'Recorded (Device/EXIF)' | 'Manual Entry'
  >('Recorded (Device/EXIF)');
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Sync local editor state when selectedPhoto changes
  useEffect(() => {
    if (!selectedPhoto) return;
    setAnnotations(structuredClone(selectedPhoto.annotations || []));
    setUndoStack([]);
    setRedoStack([]);
    setStampConfig(structuredClone(selectedPhoto.stampConfig));
    setSelectedShapeId(null);
    setHasUnsavedEdits(false);
    setMetaTitle(selectedPhoto.title);
    setMetaCaption(selectedPhoto.caption);
    setMetaFigure(selectedPhoto.figureNumber || '');
    setMetaClassification(selectedPhoto.classification);
    setMetaPairGroup(selectedPhoto.pairGroupId || '');
    setMetaEquipment(selectedPhoto.equipmentOrArea);
    setMetaTags((selectedPhoto.tags || []).join(', '));
    setMetaSiteId(selectedPhoto.siteId);
    setMetaIncidentId(selectedPhoto.incidentId || '');
    setMetaWorkOrderId(selectedPhoto.workOrderId || '');
    setMetaVisitId(selectedPhoto.visitId || '');
    setMetaReportId(selectedPhoto.reportId || '');
    setMetaCaseId(selectedPhoto.caseId || '');
  }, [selectedPhoto?.id]);

  // Apply prefill links if opened from a specific Visit / Incident / WorkOrder / Case
  useEffect(() => {
    if (photoStudioPrefill) {
      if (photoStudioPrefill.siteId) setUploadSiteId(photoStudioPrefill.siteId);
      if (photoStudioPrefill.incidentId) setUploadIncidentId(photoStudioPrefill.incidentId);
      if (photoStudioPrefill.workOrderId) setUploadWorkOrderId(photoStudioPrefill.workOrderId);
      if (photoStudioPrefill.visitId) setUploadVisitId(photoStudioPrefill.visitId);
      if (photoStudioPrefill.reportId) setUploadReportId(photoStudioPrefill.reportId);
      if (photoStudioPrefill.caseId) setUploadCaseId(photoStudioPrefill.caseId);
    }
  }, [photoStudioPrefill]);

  // Konva Stage & Layer Refs
  const stageContainerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const imageLayerRef = useRef<Konva.Layer | null>(null);
  const drawingLayerRef = useRef<Konva.Layer | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const currentDrawingIdRef = useRef<string | null>(null);

  const pushAnnotationsWithUndo = (next: PhotoAnnotationShape[]) => {
    setUndoStack((prev) => [...prev, structuredClone(annotations)]);
    setRedoStack([]);
    setAnnotations(next);
    setHasUnsavedEdits(true);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack((prev) => [structuredClone(annotations), ...prev]);
    setUndoStack((prev) => prev.slice(0, -1));
    setAnnotations(previous);
    setSelectedShapeId(null);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    setUndoStack((prev) => [...prev, structuredClone(annotations)]);
    setRedoStack((prev) => prev.slice(1));
    setAnnotations(next);
    setSelectedShapeId(null);
  };

  // Initialize and synchronize Konva Stage with base image and vector annotations
  useEffect(() => {
    if (!stageContainerRef.current || !selectedPhoto) return;

    const canvasW = selectedPhoto.width || 960;
    const canvasH = selectedPhoto.height || 540;

    if (!stageRef.current) {
      const stage = new Konva.Stage({
        container: stageContainerRef.current,
        width: canvasW,
        height: canvasH,
      });
      const imgLayer = new Konva.Layer();
      const drawLayer = new Konva.Layer();
      stage.add(imgLayer);
      stage.add(drawLayer);
      stageRef.current = stage;
      imageLayerRef.current = imgLayer;
      drawingLayerRef.current = drawLayer;
    } else {
      stageRef.current.width(canvasW);
      stageRef.current.height(canvasH);
    }

    // Load and draw original unmodified image on imageLayer
    const imgObj = new Image();
    imgObj.crossOrigin = 'anonymous';
    imgObj.onload = () => {
      if (!imageLayerRef.current) return;
      imageLayerRef.current.destroyChildren();
      const kImg = new Konva.Image({
        x: 0,
        y: 0,
        image: imgObj,
        width: canvasW,
        height: canvasH,
        listening: false,
      });
      imageLayerRef.current.add(kImg);
      imageLayerRef.current.batchDraw();
    };
    imgObj.src = selectedPhoto.originalDataUrl;
  }, [selectedPhoto?.id, selectedPhoto?.originalDataUrl]);

  // Render vector shapes & interactive Konva Transformer onto drawingLayer
  useEffect(() => {
    const drawLayer = drawingLayerRef.current;
    const stage = stageRef.current;
    if (!drawLayer || !stage || !selectedPhoto) return;

    drawLayer.destroyChildren();

    if (!showOriginalOnly) {
      annotations.forEach((shape) => {
        let node: Konva.Shape | null = null;

        if (shape.tool === 'rect') {
          node = new Konva.Rect({
            id: shape.id,
            x: shape.x,
            y: shape.y,
            width: shape.width || 90,
            height: shape.height || 65,
            stroke: shape.color,
            strokeWidth: shape.strokeWidth,
            draggable: canAnnotate && activeTool === 'select',
          });
        } else if (shape.tool === 'circle') {
          node = new Konva.Circle({
            id: shape.id,
            x: shape.x,
            y: shape.y,
            radius: shape.radius || 45,
            stroke: shape.color,
            strokeWidth: shape.strokeWidth,
            draggable: canAnnotate && activeTool === 'select',
          });
        } else if (shape.tool === 'line') {
          node = new Konva.Line({
            id: shape.id,
            x: shape.x,
            y: shape.y,
            points: shape.points || [0, 0, 120, 0],
            stroke: shape.color,
            strokeWidth: shape.strokeWidth,
            lineCap: 'round',
            draggable: canAnnotate && activeTool === 'select',
          });
        } else if (shape.tool === 'arrow') {
          node = new Konva.Arrow({
            id: shape.id,
            x: shape.x,
            y: shape.y,
            points: shape.points || [0, 0, 120, 0],
            stroke: shape.color,
            fill: shape.color,
            strokeWidth: shape.strokeWidth,
            pointerLength: Math.max(12, shape.strokeWidth * 3),
            pointerWidth: Math.max(12, shape.strokeWidth * 3),
            draggable: canAnnotate && activeTool === 'select',
          });
        } else if (shape.tool === 'freehand') {
          node = new Konva.Line({
            id: shape.id,
            x: shape.x,
            y: shape.y,
            points: shape.points || [0, 0],
            stroke: shape.color,
            strokeWidth: shape.strokeWidth,
            lineCap: 'round',
            lineJoin: 'round',
            tension: 0.35,
            draggable: canAnnotate && activeTool === 'select',
          });
        } else if (shape.tool === 'text') {
          node = new Konva.Text({
            id: shape.id,
            x: shape.x,
            y: shape.y,
            text: shape.text || 'Label',
            fontSize: shape.fontSize || 18,
            fontFamily: 'monospace',
            fontStyle: 'bold',
            fill: shape.color,
            padding: 6,
            draggable: canAnnotate && activeTool === 'select',
          });
        }

        if (node) {
          node.on('click tap', (e) => {
            e.cancelBubble = true;
            setSelectedShapeId(shape.id);
          });

          node.on('dragend', (e) => {
            const target = e.target;
            const nx = Math.round(target.x());
            const ny = Math.round(target.y());
            pushAnnotationsWithUndo(
              annotations.map((a) => (a.id === shape.id ? { ...a, x: nx, y: ny } : a))
            );
          });

          node.on('transformend', (e) => {
            const target = e.target;
            const scaleX = target.scaleX();
            const scaleY = target.scaleY();
            target.scaleX(1);
            target.scaleY(1);

            pushAnnotationsWithUndo(
              annotations.map((a) => {
                if (a.id !== shape.id) return a;
                if (a.tool === 'rect') {
                  return {
                    ...a,
                    x: Math.round(target.x()),
                    y: Math.round(target.y()),
                    width: Math.max(15, Math.round((a.width || 90) * scaleX)),
                    height: Math.max(15, Math.round((a.height || 65) * scaleY)),
                  };
                }
                if (a.tool === 'circle') {
                  return {
                    ...a,
                    x: Math.round(target.x()),
                    y: Math.round(target.y()),
                    radius: Math.max(10, Math.round((a.radius || 45) * Math.max(scaleX, scaleY))),
                  };
                }
                if (a.tool === 'text') {
                  return {
                    ...a,
                    x: Math.round(target.x()),
                    y: Math.round(target.y()),
                    fontSize: Math.max(11, Math.round((a.fontSize || 18) * scaleY)),
                  };
                }
                return {
                  ...a,
                  x: Math.round(target.x()),
                  y: Math.round(target.y()),
                };
              })
            );
          });

          drawLayer.add(node);
        }
      });

      // Attach Konva Transformer to selected shape when in 'select' mode
      if (selectedShapeId && activeTool === 'select' && canAnnotate) {
        const selectedNode = drawLayer.findOne(`#${selectedShapeId}`);
        if (selectedNode) {
          const tr = new Konva.Transformer({
            nodes: [selectedNode],
            rotateEnabled: false,
            borderStroke: '#38bdf8',
            anchorFill: '#0284c7',
            anchorStroke: '#ffffff',
            anchorSize: 8,
          });
          drawLayer.add(tr);
        }
      }
    }

    drawLayer.batchDraw();

    // Pointer Events for Interactive Drawing on Stage
    stage.off('mousedown touchstart mousemove touchmove mouseup touchend');

    stage.on('mousedown touchstart', () => {
      const pos = stage.getPointerPosition();
      if (!pos) return;

      if (activeTool === 'select') {
        setSelectedShapeId(null);
        return;
      }

      if (!canAnnotate || showOriginalOnly) return;

      const newId = `ANN-${Date.now()}`;
      currentDrawingIdRef.current = newId;

      if (activeTool === 'text') {
        const newTextShape: PhotoAnnotationShape = {
          id: newId,
          tool: 'text',
          color: strokeColor,
          strokeWidth,
          x: Math.round(pos.x),
          y: Math.round(pos.y),
          text: textDraftInput.trim() || 'Engineer Note',
          fontSize: 18,
        };
        pushAnnotationsWithUndo([...annotations, newTextShape]);
        setSelectedShapeId(newId);
        setActiveTool('select');
        return;
      }

      isDrawingRef.current = true;
      let initialShape: PhotoAnnotationShape;

      if (activeTool === 'rect') {
        initialShape = {
          id: newId,
          tool: 'rect',
          color: strokeColor,
          strokeWidth,
          x: Math.round(pos.x),
          y: Math.round(pos.y),
          width: 8,
          height: 8,
        };
      } else if (activeTool === 'circle') {
        initialShape = {
          id: newId,
          tool: 'circle',
          color: strokeColor,
          strokeWidth,
          x: Math.round(pos.x),
          y: Math.round(pos.y),
          radius: 8,
        };
      } else if (activeTool === 'arrow' || activeTool === 'line') {
        initialShape = {
          id: newId,
          tool: activeTool,
          color: strokeColor,
          strokeWidth,
          x: 0,
          y: 0,
          points: [Math.round(pos.x), Math.round(pos.y), Math.round(pos.x) + 5, Math.round(pos.y) + 5],
        };
      } else {
        // freehand
        initialShape = {
          id: newId,
          tool: 'freehand',
          color: strokeColor,
          strokeWidth,
          x: 0,
          y: 0,
          points: [Math.round(pos.x), Math.round(pos.y)],
        };
      }

      setUndoStack((prev) => [...prev, structuredClone(annotations)]);
      setRedoStack([]);
      setAnnotations((prev) => [...prev, initialShape]);
      setHasUnsavedEdits(true);
    });

    stage.on('mousemove touchmove', () => {
      if (!isDrawingRef.current || !currentDrawingIdRef.current) return;
      const pos = stage.getPointerPosition();
      if (!pos) return;
      const targetId = currentDrawingIdRef.current;

      setAnnotations((prev) =>
        prev.map((shape) => {
          if (shape.id !== targetId) return shape;
          if (shape.tool === 'rect') {
            return {
              ...shape,
              width: Math.max(10, Math.round(pos.x - shape.x)),
              height: Math.max(10, Math.round(pos.y - shape.y)),
            };
          }
          if (shape.tool === 'circle') {
            const dx = pos.x - shape.x;
            const dy = pos.y - shape.y;
            return {
              ...shape,
              radius: Math.max(8, Math.round(Math.sqrt(dx * dx + dy * dy))),
            };
          }
          if (shape.tool === 'arrow' || shape.tool === 'line') {
            const pts = shape.points || [0, 0, 0, 0];
            return {
              ...shape,
              points: [pts[0], pts[1], Math.round(pos.x), Math.round(pos.y)],
            };
          }
          if (shape.tool === 'freehand') {
            return {
              ...shape,
              points: [...(shape.points || []), Math.round(pos.x), Math.round(pos.y)],
            };
          }
          return shape;
        })
      );
    });

    stage.on('mouseup touchend', () => {
      if (isDrawingRef.current) {
        isDrawingRef.current = false;
        setSelectedShapeId(currentDrawingIdRef.current);
        currentDrawingIdRef.current = null;
      }
    });
  }, [
    annotations,
    activeTool,
    strokeColor,
    strokeWidth,
    textDraftInput,
    selectedShapeId,
    showOriginalOnly,
    canAnnotate,
    selectedPhoto,
  ]);

  const selectedShape = useMemo(
    () => annotations.find((a) => a.id === selectedShapeId) || null,
    [annotations, selectedShapeId]
  );

  // Live Stamp Metadata Preview values
  const liveStampMetadata = useMemo(() => {
    if (!selectedPhoto) return null;
    return buildStampContextMetadata(
      { ...selectedPhoto, stampConfig },
      store,
      canViewContactDetails
    );
  }, [selectedPhoto, stampConfig, store, canViewContactDetails]);

  const handleDeleteSelectedShape = () => {
    if (!selectedShapeId) return;
    pushAnnotationsWithUndo(annotations.filter((a) => a.id !== selectedShapeId));
    setSelectedShapeId(null);
  };

  const handleConfirmResetAllAnnotations = () => {
    pushAnnotationsWithUndo([]);
    setSelectedShapeId(null);
    setConfirmResetOpen(false);
    showToast('Cleared all vector annotations from canvas. Original photograph preserved.', 'info');
  };

  const handleSaveAnnotatedAsset = async () => {
    if (!selectedPhoto) return;
    try {
      const renderedDataUrl = await renderAnnotatedAndStampedDataUrl(
        selectedPhoto,
        store,
        canViewContactDetails,
        annotations,
        stampConfig
      );
      const res = savePhotoAnnotationsAndStamp(
        selectedPhoto.id,
        annotations,
        stampConfig,
        renderedDataUrl,
        revisionNote
      );
      if (res.ok) {
        setRevisionNote('');
        setHasUnsavedEdits(false);
      }
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to render annotated photograph.',
        'error'
      );
    }
  };

  const handleExportRenderedImage = async () => {
    if (!selectedPhoto) return;
    try {
      const renderedDataUrl = await renderAnnotatedAndStampedDataUrl(
        selectedPhoto,
        store,
        canViewContactDetails,
        annotations,
        stampConfig
      );
      const safeName = `${selectedPhoto.id}_${selectedPhoto.siteCode}_${selectedPhoto.classification}_Stamped.png`;
      triggerBrowserDownload(renderedDataUrl, safeName);
      showToast(`Exported rendered annotated photograph "${safeName}".`, 'success');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to export rendered photograph.',
        'error'
      );
    }
  };

  const handleSavePhotoMetadataForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPhoto) return;
    updatePhotoMetadata(selectedPhoto.id, {
      title: metaTitle.trim() || selectedPhoto.title,
      caption: metaCaption.trim(),
      figureNumber: metaFigure.trim() || undefined,
      classification: metaClassification,
      pairGroupId: metaPairGroup.trim() || undefined,
      equipmentOrArea: metaEquipment.trim(),
      tags: metaTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      siteId: metaSiteId,
      incidentId: metaIncidentId || undefined,
      workOrderId: metaWorkOrderId || undefined,
      visitId: metaVisitId || undefined,
      reportId: metaReportId || undefined,
      caseId: metaCaseId || undefined,
    });
    if (metaCaseId) {
      linkPhotoToCase(metaCaseId, selectedPhoto.id);
    }
  };

  const handleFileUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);

    const validation = await validateAndProcessUploadedImage(file);
    if (!validation.ok || !validation.dataUrl) {
      setUploadError(validation.error || 'Invalid image file.');
      showToast(validation.error || 'Image upload validation failed.', 'error');
      return;
    }

    const res = uploadPhotoAsset({
      title: uploadTitle.trim() || file.name.replace(/\.[^.]+$/, ''),
      caption: uploadCaption.trim() || `Field photograph uploaded from ${file.name}`,
      classification: uploadClassification,
      pairGroupId: uploadPairGroup.trim() || undefined,
      equipmentOrArea: uploadEquipment.trim() || 'Field Equipment Inspection',
      tags: uploadTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      siteId: uploadSiteId,
      incidentId: uploadIncidentId || undefined,
      workOrderId: uploadWorkOrderId || undefined,
      visitId: uploadVisitId || undefined,
      reportId: uploadReportId || undefined,
      caseId: uploadCaseId || undefined,
      originalDataUrl: validation.dataUrl,
      mimeType: validation.mimeType || 'image/jpeg',
      width: validation.width || 960,
      height: validation.height || 540,
      fileSizeKb: validation.fileSizeKb || 120,
      captureTimestamp: uploadCaptureTime
        ? new Date(uploadCaptureTime).toISOString()
        : new Date().toISOString(),
      captureTimestampSource: uploadCaptureTime ? 'Manual Entry' : uploadTimeSource,
    });

    if (res.ok && res.photo) {
      if (uploadCaseId) {
        linkPhotoToCase(uploadCaseId, res.photo.id);
      }
      setUploadTitle('');
      setUploadCaption('');
      setRightPanelTab('stamp');
    } else if (res.error) {
      setUploadError(res.error);
    }
    e.target.value = '';
  };

  const toggleStampField = (field: StampFieldKey) => {
    setStampConfig((prev) => {
      const exists = prev.visibleFields.includes(field);
      const nextFields = exists
        ? prev.visibleFields.filter((f) => f !== field)
        : [...prev.visibleFields, field];
      return { ...prev, visibleFields: nextFields };
    });
    setHasUnsavedEdits(true);
  };

  // Filtered Photo Gallery & Before/After Pairs
  const filteredPhotos = useMemo(() => {
    return store.photoAssets.filter((p) => {
      if (filterClassification !== 'ALL' && p.classification !== filterClassification) {
        return false;
      }
      return true;
    });
  }, [store.photoAssets, filterClassification]);

  const beforeAfterPairs = useMemo(() => {
    const groups = new Map<string, { before?: typeof selectedPhoto; after?: typeof selectedPhoto }>();
    store.photoAssets.forEach((p) => {
      if (!p.pairGroupId) return;
      const existing = groups.get(p.pairGroupId) || {};
      if (p.classification === 'Before') existing.before = p;
      if (p.classification === 'After') existing.after = p;
      groups.set(p.pairGroupId, existing);
    });
    return Array.from(groups.entries());
  }, [store.photoAssets]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-sky-600 dark:text-sky-400">
            <Camera className="w-3.5 h-3.5" />
            <span>PHASE 4 INTERACTIVE KONVA CANVAS EDITOR &amp; METADATA STAMP STUDIO</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-0.5">
            Photo Annotation Studio ({store.photoAssets.length} Field Assets)
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Non-destructive vector annotation editor with configurable telecom metadata stamps,
            before/after pairing, and original asset preservation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setComparePairsMode(!comparePairsMode)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border cursor-pointer transition-colors ${
              comparePairsMode
                ? 'bg-sky-600 text-white border-sky-600'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>
              {comparePairsMode
                ? 'Return to Canvas Editor'
                : `Before / After Pairs (${beforeAfterPairs.length})`}
            </span>
          </button>

          {canUpload && (
            <button
              type="button"
              onClick={() => {
                setComparePairsMode(false);
                setRightPanelTab('upload');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-sky-500" />
              <span>Upload Field Photo</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportRenderedImage}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-500" />
            <span>Export Stamped PNG</span>
          </button>

          {canAnnotate && (
            <button
              type="button"
              onClick={handleSaveAnnotatedAsset}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Annotated Revision</span>
            </button>
          )}
        </div>
      </div>

      {/* Before / After Pair Comparison Mode */}
      {comparePairsMode ? (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
              Before &amp; After Photographic Evidence Pairs
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Side-by-side comparison of pre-maintenance fault conditions and post-repair
              verification photographs linked by Pair Group ID.
            </p>

            <div className="space-y-6">
              {beforeAfterPairs.map(([pairId, pair]) => (
                <div
                  key={pairId}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="font-bold text-sky-600 dark:text-sky-400">{pairId}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-700 dark:text-slate-300">
                        {pair.before?.siteCode || pair.after?.siteCode} —{' '}
                        {pair.before?.equipmentOrArea || pair.after?.equipmentOrArea}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[pair.before, pair.after].map((item, idx) =>
                      item ? (
                        <div
                          key={item.id}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                              {item.classification.toUpperCase()} — {item.id} ({item.figureNumber})
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPhotoId(item.id);
                                setComparePairsMode(false);
                              }}
                              className="text-sky-600 dark:text-sky-400 font-semibold hover:underline cursor-pointer"
                            >
                              Open in Studio →
                            </button>
                          </div>
                          <img
                            src={item.annotatedDataUrl || item.originalDataUrl}
                            alt={item.title}
                            className="w-full h-56 object-contain bg-slate-950 rounded border border-slate-800"
                          />
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-slate-500">{item.caption}</p>
                        </div>
                      ) : (
                        <div
                          key={idx}
                          className="flex items-center justify-center h-56 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-xs text-slate-400"
                        >
                          No {idx === 0 ? 'Before' : 'After'} photo linked to {pairId}
                        </div>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Main Studio Workspace */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Photo Asset Strip & Linked Context */}
          <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Field Photo Library ({filteredPhotos.length})
                </h2>
                <select
                  value={filterClassification}
                  onChange={(e) => setFilterClassification(e.target.value)}
                  className="text-[11px] px-2 py-1 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                >
                  <option value="ALL">All Categories</option>
                  <option value="Before">Before</option>
                  <option value="During">During</option>
                  <option value="After">After</option>
                  <option value="Inspection">Inspection</option>
                  <option value="Equipment">Equipment</option>
                  <option value="Damage">Damage</option>
                  <option value="Measurement">Measurement</option>
                  <option value="Test Result">Test Result</option>
                  <option value="Site Overview">Site Overview</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                {filteredPhotos.map((photo) => {
                  const isSelected = selectedPhoto?.id === photo.id;
                  return (
                    <div
                      key={photo.id}
                      onClick={() => {
                        if (hasUnsavedEdits && photo.id !== selectedPhoto?.id) {
                          // Safe recovery notice without silently discarding work
                          showToast(
                            'Switched photo asset. Remember to save annotations if you had pending edits.',
                            'info'
                          );
                        }
                        setSelectedPhotoId(photo.id);
                      }}
                      className={`p-2.5 rounded-lg border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-sky-50/80 dark:bg-sky-950/40 border-sky-500'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={photo.annotatedDataUrl || photo.originalDataUrl}
                          alt={photo.title}
                          className="w-16 h-12 object-cover rounded bg-slate-900 border border-slate-700 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="font-bold text-sky-600 dark:text-sky-400">
                              {photo.id}
                            </span>
                            <span className="text-slate-500">{photo.classification}</span>
                          </div>
                          <p className="text-xs font-semibold text-slate-900 dark:text-white truncate mt-0.5">
                            {photo.title}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500 mt-0.5">
                            <span>{photo.siteCode}</span>
                            <span>·</span>
                            <span>{photo.annotations.length} marks</span>
                            {photo.isAnnotated && (
                              <>
                                <span>·</span>
                                <span className="text-emerald-600 dark:text-emerald-400">
                                  Annotated
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Linked Source Record Shortcuts */}
            {selectedPhoto && (
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                <div className="text-[11px] font-mono uppercase text-slate-500">
                  Authoritative Record Links
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedPhoto.caseId && (
                    <button
                      type="button"
                      onClick={() => openCaseById(selectedPhoto.caseId!)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800 hover:bg-sky-100 dark:hover:bg-sky-900/60 font-mono text-[11px] font-semibold cursor-pointer"
                    >
                      <Briefcase className="w-3 h-3 text-sky-500" />
                      <span>{store.workCases?.find((c) => c.id === selectedPhoto.caseId)?.caseNumber || selectedPhoto.caseId}</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openSiteById(selectedPhoto.siteId)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-sky-500 font-mono text-[11px] cursor-pointer"
                  >
                    <span>Site: {selectedPhoto.siteCode}</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                  {selectedPhoto.incidentId && (
                    <button
                      type="button"
                      onClick={() => openIncidentById(selectedPhoto.incidentId!)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-sky-500 font-mono text-[11px] cursor-pointer"
                    >
                      <span>{selectedPhoto.incidentId}</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  )}
                  {selectedPhoto.workOrderId && (
                    <button
                      type="button"
                      onClick={() => openWorkOrderById(selectedPhoto.workOrderId!)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-sky-500 font-mono text-[11px] cursor-pointer"
                    >
                      <span>{selectedPhoto.workOrderId}</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  )}
                  {selectedPhoto.visitId && (
                    <button
                      type="button"
                      onClick={() => openSiteVisitById(selectedPhoto.visitId!)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-sky-500 font-mono text-[11px] cursor-pointer"
                    >
                      <span>Visit: {selectedPhoto.visitId}</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  )}
                  {selectedPhoto.reportId && (
                    <button
                      type="button"
                      onClick={() => openReportById(selectedPhoto.reportId!)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-sky-500 font-mono text-[11px] cursor-pointer"
                    >
                      <span>Report: {selectedPhoto.reportId}</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Center Column: Interactive Konva Canvas + Toolbar + Live Metadata Stamp Overlay */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col space-y-3">
            {/* Drawing Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-lg">
                {(
                  [
                    { id: 'select', label: 'Select/Move', icon: MousePointer },
                    { id: 'arrow', label: 'Arrow', icon: ArrowUpRight },
                    { id: 'line', label: 'Line', icon: Minus },
                    { id: 'rect', label: 'Rectangle', icon: Square },
                    { id: 'circle', label: 'Circle', icon: CircleIcon },
                    { id: 'freehand', label: 'Freehand', icon: PenTool },
                    { id: 'text', label: 'Text Label', icon: Type },
                  ] as const
                ).map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      disabled={!canAnnotate && t.id !== 'select'}
                      onClick={() => {
                        setShowOriginalOnly(false);
                        setActiveTool(t.id);
                      }}
                      title={t.label}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer disabled:opacity-40 ${
                        activeTool === t.id && !showOriginalOnly
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="hidden xl:inline">{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Undo / Redo / Delete / Original Preview Toggle */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={undoStack.length === 0 || !canAnnotate}
                  onClick={handleUndo}
                  title="Undo Annotation"
                  className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={redoStack.length === 0 || !canAnnotate}
                  onClick={handleRedo}
                  title="Redo Annotation"
                  className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Redo2 className="w-3.5 h-3.5" />
                </button>
                {selectedShapeId && canAnnotate && (
                  <button
                    type="button"
                    onClick={handleDeleteSelectedShape}
                    title="Delete Selected Shape"
                    className="p-1.5 rounded-lg border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                {canAnnotate && annotations.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setConfirmResetOpen(true)}
                    title="Reset All Annotations"
                    className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowOriginalOnly(!showOriginalOnly)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                    showOriginalOnly
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{showOriginalOnly ? 'Viewing Unmodified Original' : 'Preview Original'}</span>
                </button>
              </div>
            </div>

            {/* Secondary Style Bar: Colors, Line Width, Text Label Input & Zoom */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-mono text-[11px]">Color:</span>
                {COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => {
                      setStrokeColor(c.hex);
                      if (selectedShapeId) {
                        pushAnnotationsWithUndo(
                          annotations.map((a) =>
                            a.id === selectedShapeId ? { ...a, color: c.hex } : a
                          )
                        );
                      }
                    }}
                    title={c.label}
                    className={`w-5 h-5 rounded-full border-2 cursor-pointer transition-transform ${
                      strokeColor === c.hex ? 'scale-125 border-sky-400' : 'border-slate-600'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}

                <span className="text-slate-500 font-mono text-[11px] ml-2">Width:</span>
                <select
                  value={strokeWidth}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setStrokeWidth(val);
                    if (selectedShapeId) {
                      pushAnnotationsWithUndo(
                        annotations.map((a) =>
                          a.id === selectedShapeId ? { ...a, strokeWidth: val } : a
                        )
                      );
                    }
                  }}
                  className="px-2 py-1 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono text-xs"
                >
                  {STROKE_WIDTHS.map((w) => (
                    <option key={w} value={w}>
                      {w}px
                    </option>
                  ))}
                </select>
              </div>

              {/* Text Label Content Input */}
              {(activeTool === 'text' || selectedShape?.tool === 'text') && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-mono text-slate-500">Text:</span>
                  <input
                    type="text"
                    value={selectedShape?.tool === 'text' ? selectedShape.text || '' : textDraftInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTextDraftInput(val);
                      if (selectedShape?.tool === 'text') {
                        setAnnotations((prev) =>
                          prev.map((a) => (a.id === selectedShape.id ? { ...a, text: val } : a))
                        );
                        setHasUnsavedEdits(true);
                      }
                    }}
                    placeholder="Enter annotation text..."
                    className="px-2.5 py-1 text-xs rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 w-48"
                  />
                </div>
              )}

              {/* Zoom & Pan Controls */}
              <div className="flex items-center gap-1.5 font-mono">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.15).toFixed(2))))}
                  className="p-1 rounded border border-slate-300 dark:border-slate-700 cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] w-12 text-center">{Math.round(zoom * 100)}%</span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(2.2, Number((z + 0.15).toFixed(2))))}
                  className="p-1 rounded border border-slate-300 dark:border-slate-700 cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setZoom(1);
                    setPanOffset({ x: 0, y: 0 });
                  }}
                  className="px-2 py-0.5 text-[11px] rounded border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  100%
                </button>
              </div>
            </div>

            {/* Reset Confirmation Banner */}
            {confirmResetOpen && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-800 flex items-center justify-between text-xs">
                <span className="text-red-800 dark:text-red-200 font-medium">
                  Clear all {annotations.length} vector annotations from this canvas? (The original
                  photograph will remain untouched.)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmResetOpen(false)}
                    className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmResetAllAnnotations}
                    className="px-2.5 py-1 rounded bg-red-600 text-white font-semibold cursor-pointer"
                  >
                    Confirm Reset
                  </button>
                </div>
              </div>
            )}

            {/* Interactive Canvas Viewport with Live Metadata Stamp Overlay */}
            <div className="relative bg-slate-950 rounded-xl border border-slate-800 overflow-auto max-h-[540px] flex items-center justify-center p-3">
              <div
                className="relative origin-center transition-transform"
                style={{
                  transform: `scale(${zoom}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                }}
              >
                {/* Konva Stage Mount Point */}
                <div
                  ref={stageContainerRef}
                  className="rounded overflow-hidden shadow-lg border border-slate-700"
                />

                {/* Live Configurable Metadata Stamp Overlay Preview */}
                {!showOriginalOnly &&
                  stampConfig.enabled &&
                  liveStampMetadata &&
                  stampConfig.visibleFields.length > 0 && (
                    <div
                      className={`pointer-events-none absolute border border-sky-500/80 text-white font-mono px-3.5 py-2.5 ${
                        stampConfig.position === 'bottom-bar'
                          ? 'bottom-0 left-0 right-0'
                          : stampConfig.position === 'top-bar'
                          ? 'top-0 left-0 right-0'
                          : stampConfig.position === 'bottom-right'
                          ? 'bottom-3 right-3 max-w-md rounded'
                          : stampConfig.position === 'bottom-left'
                          ? 'bottom-3 left-3 max-w-md rounded'
                          : stampConfig.position === 'top-right'
                          ? 'top-3 right-3 max-w-md rounded'
                          : 'top-3 left-3 max-w-md rounded'
                      } ${
                        stampConfig.fontSize === 'small'
                          ? 'text-[10px]'
                          : stampConfig.fontSize === 'large'
                          ? 'text-xs'
                          : 'text-[11px]'
                      }`}
                      style={{
                        backgroundColor: `rgba(9, 13, 22, ${stampConfig.backgroundOpacity || 0.85})`,
                      }}
                    >
                      <div
                        className={`grid gap-x-4 gap-y-0.5 ${
                          stampConfig.layoutStyle === 'two-column-grid' &&
                          (stampConfig.position === 'bottom-bar' ||
                            stampConfig.position === 'top-bar')
                            ? 'grid-cols-2'
                            : stampConfig.layoutStyle === 'compact-strip' &&
                              (stampConfig.position === 'bottom-bar' ||
                                stampConfig.position === 'top-bar')
                            ? 'grid-cols-3'
                            : 'grid-cols-1'
                        }`}
                      >
                        {stampConfig.visibleFields.map((fieldKey) => {
                          const val = liveStampMetadata[fieldKey];
                          if (!val || val === 'N/A') return null;
                          return (
                            <div key={fieldKey} className="truncate">
                              <span className="text-sky-400 font-semibold">
                                {STAMP_FIELD_LABELS[fieldKey]}:
                              </span>{' '}
                              <span className="text-slate-100">{val}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
              </div>
            </div>

            {/* Bottom Asset Status Bar */}
            {selectedPhoto && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[11px] font-mono text-slate-500">
                <div>
                  Original Asset: <strong className="text-emerald-500">PRESERVED UNCHANGED</strong> (
                  {selectedPhoto.width}×{selectedPhoto.height}px · {selectedPhoto.fileSizeKb} KB)
                </div>
                <div>
                  Capture Time:{' '}
                  <strong className="text-slate-700 dark:text-slate-300">
                    {formatUtcTimestamp(selectedPhoto.captureTimestamp, tz)} [
                    {selectedPhoto.captureTimestampSource}]
                  </strong>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Stamp Configurator, Metadata Editor, Revision History & Upload */}
          <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col space-y-4">
            {/* Segmented Tab Bar */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg text-[11px] font-semibold">
              {(
                [
                  { id: 'stamp', label: 'Stamp', icon: Stamp },
                  { id: 'metadata', label: 'Details', icon: FileImage },
                  { id: 'revisions', label: 'History', icon: History },
                  { id: 'upload', label: 'Upload', icon: Upload },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setRightPanelTab(tab.id)}
                    className={`flex items-center justify-center gap-1 py-1.5 rounded-md cursor-pointer transition-colors ${
                      rightPanelTab === tab.id
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* TAB 1: METADATA STAMP CONFIGURATOR */}
            {rightPanelTab === 'stamp' && (
              <div className="space-y-3 text-xs overflow-y-auto max-h-[560px] pr-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">
                    Engineering Metadata Stamp
                  </span>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={stampConfig.enabled}
                      onChange={(e) => {
                        setStampConfig({ ...stampConfig, enabled: e.target.checked });
                        setHasUnsavedEdits(true);
                      }}
                      className="rounded border-slate-300"
                    />
                    <span className="font-semibold text-sky-600 dark:text-sky-400">Enabled</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Stamp Position</label>
                    <select
                      value={stampConfig.position}
                      onChange={(e) => {
                        setStampConfig({
                          ...stampConfig,
                          position: e.target.value as StampPosition,
                        });
                        setHasUnsavedEdits(true);
                      }}
                      className="w-full px-2 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs"
                    >
                      <option value="bottom-bar">Bottom Bar (Full)</option>
                      <option value="top-bar">Top Bar (Full)</option>
                      <option value="bottom-right">Bottom-Right Corner</option>
                      <option value="bottom-left">Bottom-Left Corner</option>
                      <option value="top-right">Top-Right Corner</option>
                      <option value="top-left">Top-Left Corner</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Layout &amp; Density</label>
                    <select
                      value={stampConfig.layoutStyle}
                      onChange={(e) => {
                        setStampConfig({
                          ...stampConfig,
                          layoutStyle: e.target.value as StampLayoutStyle,
                        });
                        setHasUnsavedEdits(true);
                      }}
                      className="w-full px-2 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs"
                    >
                      <option value="two-column-grid">Two-Column Block</option>
                      <option value="compact-strip">Compact 3-Col Strip</option>
                      <option value="corner-badge">Single-Col Stack</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Text Size</label>
                    <select
                      value={stampConfig.fontSize}
                      onChange={(e) => {
                        setStampConfig({
                          ...stampConfig,
                          fontSize: e.target.value as StampFontSize,
                        });
                        setHasUnsavedEdits(true);
                      }}
                      className="w-full px-2 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs"
                    >
                      <option value="small">Small (11px)</option>
                      <option value="medium">Medium (13px)</option>
                      <option value="large">Large (15px)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">
                      Contrast Opacity ({Math.round((stampConfig.backgroundOpacity || 0.85) * 100)}%)
                    </label>
                    <input
                      type="range"
                      min="0.6"
                      max="0.95"
                      step="0.05"
                      value={stampConfig.backgroundOpacity || 0.85}
                      onChange={(e) => {
                        setStampConfig({
                          ...stampConfig,
                          backgroundOpacity: Number(e.target.value),
                        });
                        setHasUnsavedEdits(true);
                      }}
                      className="w-full mt-1.5"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">
                      Report Ref / Custom Header
                    </label>
                    <input
                      type="text"
                      value={stampConfig.reportReference || ''}
                      onChange={(e) => {
                        setStampConfig({ ...stampConfig, reportReference: e.target.value });
                        setHasUnsavedEdits(true);
                      }}
                      placeholder="e.g., TM-2026-000101"
                      className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">
                      Custom Field Note 1
                    </label>
                    <input
                      type="text"
                      value={stampConfig.customText1 || ''}
                      onChange={(e) => {
                        setStampConfig({ ...stampConfig, customText1: e.target.value });
                        setHasUnsavedEdits(true);
                      }}
                      placeholder="e.g., Optical Rx: -5.4 dBm"
                      className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold uppercase text-slate-500">
                      Visible Stamp Fields ({stampConfig.visibleFields.length}/
                      {ALL_STAMP_FIELDS.length})
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-1 max-h-56 overflow-y-auto pr-1">
                    {ALL_STAMP_FIELDS.map((fieldKey) => {
                      const checked = stampConfig.visibleFields.includes(fieldKey);
                      return (
                        <label
                          key={fieldKey}
                          className="flex items-center justify-between px-2 py-1 rounded hover:bg-slate-50 dark:hover:bg-slate-950 cursor-pointer"
                        >
                          <span className="text-slate-700 dark:text-slate-300">
                            {STAMP_FIELD_LABELS[fieldKey]}
                          </span>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleStampField(fieldKey)}
                            className="rounded border-slate-300"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <input
                    type="text"
                    value={revisionNote}
                    onChange={(e) => setRevisionNote(e.target.value)}
                    placeholder="Revision note (e.g., Marked corroded SFP latch)..."
                    className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs"
                  />
                  <button
                    type="button"
                    disabled={!canAnnotate}
                    onClick={handleSaveAnnotatedAsset}
                    className="w-full py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-semibold cursor-pointer"
                  >
                    Save Annotated &amp; Stamped Asset
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: PHOTO METADATA & RECORD LINKING */}
            {rightPanelTab === 'metadata' && selectedPhoto && (
              <form
                onSubmit={handleSavePhotoMetadataForm}
                className="space-y-2.5 text-xs overflow-y-auto max-h-[560px] pr-1"
              >
                <div>
                  <label className="block text-[11px] text-slate-500 mb-0.5">Photo Title</label>
                  <input
                    type="text"
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">Stage / Class</label>
                    <select
                      value={metaClassification}
                      onChange={(e) =>
                        setMetaClassification(e.target.value as PhotoClassification)
                      }
                      className="w-full px-2 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                    >
                      <option value="Before">Before</option>
                      <option value="During">During</option>
                      <option value="After">After</option>
                      <option value="Inspection">Inspection</option>
                      <option value="Equipment">Equipment</option>
                      <option value="Damage">Damage</option>
                      <option value="Measurement">Measurement</option>
                      <option value="Test Result">Test Result</option>
                      <option value="Site Overview">Site Overview</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">Figure Number</label>
                    <input
                      type="text"
                      value={metaFigure}
                      onChange={(e) => setMetaFigure(e.target.value)}
                      placeholder="Figure 1.1"
                      className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500 mb-0.5">
                    Before/After Pair Group ID
                  </label>
                  <input
                    type="text"
                    value={metaPairGroup}
                    onChange={(e) => setMetaPairGroup(e.target.value)}
                    placeholder="e.g., PAIR-NTH-MTR-001-RRU"
                    className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500 mb-0.5">
                    Equipment / Sector / Area Shown
                  </label>
                  <input
                    type="text"
                    value={metaEquipment}
                    onChange={(e) => setMetaEquipment(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500 mb-0.5">
                    Engineering Caption
                  </label>
                  <textarea
                    rows={2}
                    value={metaCaption}
                    onChange={(e) => setMetaCaption(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">Linked Site</label>
                    <select
                      value={metaSiteId}
                      onChange={(e) => setMetaSiteId(e.target.value)}
                      className="w-full px-2 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                    >
                      {store.sites.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.siteCode}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">
                      Linked Incident
                    </label>
                    <select
                      value={metaIncidentId}
                      onChange={(e) => setMetaIncidentId(e.target.value)}
                      className="w-full px-2 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                    >
                      <option value="">None</option>
                      {store.incidents.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.id} ({i.siteCode})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">Work Order</label>
                    <select
                      value={metaWorkOrderId}
                      onChange={(e) => setMetaWorkOrderId(e.target.value)}
                      className="w-full px-2 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                    >
                      <option value="">None</option>
                      {store.workOrders.map((w) => (
                        <option key={w.id} value={w.workOrderNumber}>
                          {w.workOrderNumber}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">Site Visit</label>
                    <select
                      value={metaVisitId}
                      onChange={(e) => setMetaVisitId(e.target.value)}
                      className="w-full px-2 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                    >
                      <option value="">None</option>
                      {store.siteVisits.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.visitCode}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500 mb-0.5">Linked Work Case</label>
                  <select
                    value={metaCaseId}
                    onChange={(e) => setMetaCaseId(e.target.value)}
                    className="w-full px-2 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                  >
                    <option value="">None (Standalone)</option>
                    {(store.workCases || []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.caseNumber} — {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={!canAnnotate}
                  className="w-full py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-semibold cursor-pointer"
                >
                  Save Photo Metadata &amp; Links
                </button>
              </form>
            )}

            {/* TAB 3: PHOTO REVISION HISTORY */}
            {rightPanelTab === 'revisions' && selectedPhoto && (
              <div className="space-y-3 text-xs overflow-y-auto max-h-[560px]">
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-[11px]">
                  Original Asset Integrity: The uploaded source image is stored separately from
                  vector annotations and stamped renditions.
                </div>

                {(selectedPhoto.revisionHistory || []).length === 0 ? (
                  <p className="text-slate-500 py-6 text-center">
                    No annotation revisions saved yet for {selectedPhoto.id}.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedPhoto.revisionHistory.map((rev) => (
                      <div
                        key={rev.id}
                        className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1"
                      >
                        <div className="flex items-center justify-between font-mono text-[11px]">
                          <span className="font-bold text-sky-600 dark:text-sky-400">
                            Revision {rev.revisionNumber}
                          </span>
                          <span className="text-slate-500">
                            {formatUtcTimestamp(rev.timestamp, tz)}
                          </span>
                        </div>
                        <p className="text-slate-800 dark:text-slate-200">{rev.summary}</p>
                        <div className="text-[10px] font-mono text-slate-500">
                          By {rev.editorName} ({rev.editorRole}) · {rev.annotationCount} shapes
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: UPLOAD NEW FIELD PHOTOGRAPH */}
            {rightPanelTab === 'upload' && (
              <div className="space-y-3 text-xs overflow-y-auto max-h-[560px] pr-1">
                <div className="font-bold text-slate-900 dark:text-white">
                  Upload New Field Photograph
                </div>
                <p className="text-[11px] text-slate-500">
                  Accepts JPG, JPEG, PNG, WEBP, or SVG up to 10 MB. Automatically links to selected
                  Site, Incident, Work Order, and Field Visit.
                </p>

                {uploadError && (
                  <div className="p-2.5 rounded bg-red-50 dark:bg-red-950/60 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 text-[11px]">
                    {uploadError}
                  </div>
                )}

                <div>
                  <label className="block text-[11px] text-slate-500 mb-0.5">
                    Photo Title *
                  </label>
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="e.g., Sector-2 RRH Optical Port Before Cleaning"
                    className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">
                      Stage / Classification
                    </label>
                    <select
                      value={uploadClassification}
                      onChange={(e) =>
                        setUploadClassification(e.target.value as PhotoClassification)
                      }
                      className="w-full px-2 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                    >
                      <option value="Before">Before</option>
                      <option value="During">During</option>
                      <option value="After">After</option>
                      <option value="Inspection">Inspection</option>
                      <option value="Equipment">Equipment</option>
                      <option value="Damage">Damage</option>
                      <option value="Measurement">Measurement</option>
                      <option value="Test Result">Test Result</option>
                      <option value="Site Overview">Site Overview</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">Pair Group ID</label>
                    <input
                      type="text"
                      value={uploadPairGroup}
                      onChange={(e) => setUploadPairGroup(e.target.value)}
                      placeholder="PAIR-FIELD-01"
                      className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500 mb-0.5">
                    Equipment / Area Shown
                  </label>
                  <input
                    type="text"
                    value={uploadEquipment}
                    onChange={(e) => setUploadEquipment(e.target.value)}
                    placeholder="e.g., Nokia AirScale RRH OPT1"
                    className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500 mb-0.5">Caption / Notes</label>
                  <textarea
                    rows={2}
                    value={uploadCaption}
                    onChange={(e) => setUploadCaption(e.target.value)}
                    placeholder="Describe visible hardware condition..."
                    className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">Site *</label>
                    <select
                      value={uploadSiteId}
                      onChange={(e) => setUploadSiteId(e.target.value)}
                      className="w-full px-2 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                    >
                      {store.sites.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.siteCode}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">Field Visit</label>
                    <select
                      value={uploadVisitId}
                      onChange={(e) => setUploadVisitId(e.target.value)}
                      className="w-full px-2 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                    >
                      <option value="">None</option>
                      {store.siteVisits.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.visitCode} ({v.siteCode})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">Incident</label>
                    <select
                      value={uploadIncidentId}
                      onChange={(e) => setUploadIncidentId(e.target.value)}
                      className="w-full px-2 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                    >
                      <option value="">None</option>
                      {store.incidents.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.id}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">Work Order</label>
                    <select
                      value={uploadWorkOrderId}
                      onChange={(e) => setUploadWorkOrderId(e.target.value)}
                      className="w-full px-2 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                    >
                      <option value="">None</option>
                      {store.workOrders.map((w) => (
                        <option key={w.id} value={w.workOrderNumber}>
                          {w.workOrderNumber}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500 mb-0.5">Assign to Work Case</label>
                  <select
                    value={uploadCaseId}
                    onChange={(e) => setUploadCaseId(e.target.value)}
                    className="w-full px-2 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                  >
                    <option value="">None (Standalone)</option>
                    {(store.workCases || []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.caseNumber} — {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500 mb-0.5">
                    Manual Capture Time (Leave blank to use Device Timestamp)
                  </label>
                  <input
                    type="datetime-local"
                    value={uploadCaptureTime}
                    onChange={(e) => setUploadCaptureTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono"
                  />
                </div>

                <label className="mt-2 flex flex-col items-center justify-center p-4 border-2 border-dashed border-sky-500/60 rounded-xl bg-sky-50/40 dark:bg-sky-950/20 hover:bg-sky-50 dark:hover:bg-sky-950/40 cursor-pointer transition-colors">
                  <Upload className="w-5 h-5 text-sky-500 mb-1" />
                  <span className="font-semibold text-sky-700 dark:text-sky-300">
                    Choose Image or Camera Capture
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5">
                    JPG, JPEG, PNG, WEBP, SVG (Max 10 MB)
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml"
                    capture="environment"
                    onChange={handleFileUploadChange}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
