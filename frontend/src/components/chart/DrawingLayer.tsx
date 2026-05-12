import React, { useRef, useEffect } from 'react';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';
import { DrawingType } from './drawing/types';
import type { DrawingObject, Point } from './drawing/types';

interface DrawingLayerProps {
    chart: IChartApi | null;
    series: ISeriesApi<any> | null;
    drawings: DrawingObject[];
    activeTool: string;
    isDrawing?: boolean;
    previewPoints?: Point[];
    selectedId?: string | null;
    width: number;
    height: number;
    onUpdatePoints?: (id: string, points: Point[], isDragging: boolean) => void;
    onSelect?: (id: string | null) => void;
}

interface InteractionState {
    type: 'idle' | 'dragging' | 'moving';
    drawingId: string | null;
    pointIndex: number | null;
    originalPoints: Point[];
    startPos: { x: number; y: number };
}

const DrawingLayer: React.FC<DrawingLayerProps> = ({
    chart,
    series,
    drawings,
    activeTool,
    isDrawing,
    previewPoints = [],
    selectedId,
    width,
    height,
    onUpdatePoints,
    onSelect,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const interactionRef = useRef<InteractionState>({
        type: 'idle',
        drawingId: null,
        pointIndex: null,
        originalPoints: [],
        startPos: { x: 0, y: 0 }
    });

    const drawRay = (ctx: CanvasRenderingContext2D, p1: { x: number; y: number }, p2: { x: number; y: number }, canvasWidth: number) => {
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        const dist = Math.sqrt(Math.pow(canvasWidth, 2) + Math.pow(height, 2));
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p1.x + Math.cos(angle) * dist, p1.y + Math.sin(angle) * dist);
        ctx.stroke();
    };

    const calculateMetrics = (p1: Point, p2: Point) => {
        const priceDiff = Math.abs(p2.price - p1.price);
        const pricePct = ((p2.price - p1.price) / p1.price) * 100;
        const timeDiff = Math.abs(p2.time - p1.time);

        const bars = Math.round(timeDiff / (60 * 5)); // 5m approximation
        const days = Math.floor(timeDiff / 86400);
        const hours = Math.floor((timeDiff % 86400) / 3600);

        return {
            points: priceDiff.toFixed(2),
            percent: pricePct.toFixed(2),
            bars: bars,
            duration: days > 0 ? `${days}d ${hours}h` : `${hours}h`
        };
    };

    const drawRangeMeasure = (ctx: CanvasRenderingContext2D, p1: { x: number; y: number; price: number; time: number }, p2: { x: number; y: number; price: number; time: number }) => {
        const metrics = calculateMetrics(p1, p2);
        const x = Math.min(p1.x, p2.x);
        const y = Math.min(p1.y, p2.y);
        const w = Math.abs(p2.x - p1.x);
        const h = Math.abs(p2.y - p1.y);

        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = '#2962FF';
        ctx.fillRect(x, y, w, h);

        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = '#2962FF';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(x, y, w, h);

        const midX = x + w / 2;
        const boxW = 130;
        const boxH = 50;
        const boxX = midX - boxW / 2;
        const boxY = y + h + 10 > height - boxH ? y - boxH - 10 : y + h + 10;

        ctx.globalAlpha = 0.95;
        ctx.fillStyle = '#14181F';
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, 6);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 11px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(`${metrics.points} pts (${metrics.percent}%)`, midX, boxY + 18);

        ctx.font = '10px Inter';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`${metrics.bars} bars | ${metrics.duration}`, midX, boxY + 35);

        ctx.beginPath();
        ctx.setLineDash([]);
        ctx.strokeStyle = '#2962FF';
        ctx.lineWidth = 1.5;
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        ctx.restore();
    };

    const drawRiskReward = (ctx: CanvasRenderingContext2D, entry: { x: number; y: number }, target: { x: number; y: number }) => {
        const diffY = entry.y - target.y;
        const isLong = diffY > 0;
        const boxWidth = 120;

        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = isLong ? '#10b981' : '#ef4444';
        ctx.fillRect(entry.x, target.y, boxWidth, Math.abs(diffY));

        ctx.fillStyle = isLong ? '#ef4444' : '#10b981';
        ctx.fillRect(entry.x, entry.y, boxWidth, Math.abs(diffY));

        ctx.globalAlpha = 0.8;
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.moveTo(entry.x, entry.y);
        ctx.lineTo(entry.x + boxWidth, entry.y);
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 10px Inter';
        ctx.fillText(isLong ? 'TARGET' : 'STOP', entry.x + 8, target.y + (isLong ? 15 : -5));
        ctx.fillText(isLong ? 'STOP' : 'TARGET', entry.x + 8, entry.y + (isLong ? 1 : -1) * Math.abs(diffY) + (isLong ? -5 : 15));
        ctx.restore();
    };

    const drawFibRetracement = (ctx: CanvasRenderingContext2D, p1: { x: number; y: number }, p2: { x: number; y: number }) => {
        const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0];
        const diff = p2.y - p1.y;

        levels.forEach(level => {
            const y = p1.y + diff * level;
            ctx.beginPath();
            ctx.moveTo(Math.min(p1.x, p2.x), y);
            ctx.lineTo(Math.max(p1.x, p2.x), y);
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.stroke();

            ctx.save();
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.font = '9px Inter';
            ctx.fillText(`${(level * 100).toFixed(1)}%`, Math.max(p1.x, p2.x) + 5, y + 3);
            ctx.restore();
        });
    };

    const drawFibExtension = (ctx: CanvasRenderingContext2D, p1: { x: number; y: number }, p2: { x: number; y: number }, p3: { x: number; y: number }) => {
        // Basic Fib extension: p1->p2 is base move, extensions projected from p3
        const levels = [0, 0.618, 1.0, 1.272, 1.618, 2.0, 2.618];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;

        levels.forEach(level => {
            const y = p3.y + dy * level;
            const xStart = Math.min(p1.x, p2.x, p3.x);
            const xEnd = Math.max(p1.x, p2.x, p3.x) + Math.abs(dx) * 1.2;
            ctx.beginPath();
            ctx.moveTo(xStart, y);
            ctx.lineTo(Math.min(xEnd, (window.innerWidth || xEnd)), y);
            ctx.strokeStyle = 'rgba(255,255,255,0.18)';
            ctx.stroke();

            ctx.save();
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.font = '9px Inter';
            ctx.fillText(`${level.toFixed(3)}x`, xStart + 4, y - 2);
            ctx.restore();
        });

        // Base lines
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.stroke();
        ctx.restore();
    };

    const drawCircleEllipse = (ctx: CanvasRenderingContext2D, p1: { x: number; y: number }, p2: { x: number; y: number }, isCircle: boolean, color: string) => {
        const cx = (p1.x + p2.x) / 2;
        const cy = (p1.y + p2.y) / 2;
        const rx = Math.abs(p2.x - p1.x) / 2;
        const ry = Math.abs(p2.y - p1.y) / 2;
        const r = isCircle ? Math.min(rx, ry) : null;
        ctx.save();
        ctx.beginPath();
        if (isCircle && r !== null) {
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
        } else {
            ctx.ellipse(cx, cy, Math.max(2, rx), Math.max(2, ry), 0, 0, Math.PI * 2);
        }
        ctx.stroke();
        ctx.globalAlpha *= 0.08;
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();
    };

    const drawPitchfork = (ctx: CanvasRenderingContext2D, a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }, canvasWidth: number, canvasHeight: number) => {
        // Andrews pitchfork (simplified):
        // median line from A to midpoint of B-C, with two parallel lines through B and C
        const mid = { x: (b.x + c.x) / 2, y: (b.y + c.y) / 2 };
        const dx = mid.x - a.x;
        const dy = mid.y - a.y;
        const dist = Math.sqrt(canvasWidth * canvasWidth + canvasHeight * canvasHeight);
        const norm = Math.sqrt(dx * dx + dy * dy) || 1;
        const ux = dx / norm;
        const uy = dy / norm;

        const lineEnd = { x: a.x + ux * dist, y: a.y + uy * dist };
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(lineEnd.x, lineEnd.y);
        ctx.stroke();

        // Parallel lines through B and C (same direction as median)
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x + ux * dist, b.y + uy * dist);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(c.x, c.y);
        ctx.lineTo(c.x + ux * dist, c.y + uy * dist);
        ctx.stroke();

        // Handle line between B and C for reference (dashed)
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.globalAlpha *= 0.5;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(c.x, c.y);
        ctx.stroke();
        ctx.restore();
    };

    const drawShape = (ctx: CanvasRenderingContext2D, coords: any[], type: string, canvasWidth: number, canvasHeight: number, color: string) => {
        const validCoords = coords.filter(c => c.x !== null && c.y !== null);
        if (validCoords.length === 0) return;

        ctx.beginPath();
        switch (type) {
            case DrawingType.TREND_LINE:
                if (validCoords.length >= 2) {
                    ctx.moveTo(validCoords[0].x, validCoords[0].y);
                    ctx.lineTo(validCoords[1].x, validCoords[1].y);
                    ctx.stroke();
                }
                break;
            case DrawingType.RAY:
                if (validCoords.length >= 2) drawRay(ctx, validCoords[0], validCoords[1], canvasWidth);
                break;
            case DrawingType.HORIZONTAL_LINE:
                if (validCoords.length >= 1) {
                    ctx.moveTo(0, validCoords[0].y);
                    ctx.lineTo(canvasWidth, validCoords[0].y);
                    ctx.stroke();
                }
                break;
            case DrawingType.VERTICAL_LINE:
                if (validCoords.length >= 1) {
                    ctx.moveTo(validCoords[0].x, 0);
                    ctx.lineTo(validCoords[0].x, canvasHeight);
                    ctx.stroke();
                }
                break;
            case DrawingType.RECTANGLE:
                if (validCoords.length >= 2) {
                    const x = Math.min(validCoords[0].x, validCoords[1].x);
                    const y = Math.min(validCoords[0].y, validCoords[1].y);
                    const w = Math.abs(validCoords[1].x - validCoords[0].x);
                    const h = Math.abs(validCoords[1].y - validCoords[0].y);
                    ctx.strokeRect(x, y, w, h);
                    ctx.save();
                    ctx.globalAlpha *= 0.1;
                    ctx.fillStyle = color;
                    ctx.fillRect(x, y, w, h);
                    ctx.restore();
                }
                break;
            case DrawingType.FIB_RETRACEMENT:
                if (validCoords.length >= 2) drawFibRetracement(ctx, validCoords[0], validCoords[1]);
                break;
            case DrawingType.FIB_EXTENSION:
                if (validCoords.length >= 3) drawFibExtension(ctx, validCoords[0], validCoords[1], validCoords[2]);
                break;
            case DrawingType.RISK_REWARD:
                if (validCoords.length >= 2) drawRiskReward(ctx, validCoords[0], validCoords[1]);
                break;
            case DrawingType.RANGE_MEASURE:
                if (validCoords.length >= 2) {
                    const p1 = coords[0].point;
                    const p2 = coords[1].point;
                    if (p1 && p2) drawRangeMeasure(ctx, { ...validCoords[0], ...p1 }, { ...validCoords[1], ...p2 });
                }
                break;
            case DrawingType.PARALLEL_CHANNEL:
                if (validCoords.length >= 3) {
                    const [p1, p2, p3] = validCoords;
                    // Base line
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();

                    // Offset line
                    const dx = p2.x - p1.x;
                    const dy = p2.y - p1.y;

                    // For simplicity, we assume p3 provides the offset point
                    // In a real channel, it's parallel. Let's just draw line from P3 parallel to P1-P2
                    const offsetLineX2 = p3.x + dx;
                    const offsetLineY2 = p3.y + dy;
                    ctx.moveTo(p3.x, p3.y);
                    ctx.lineTo(offsetLineX2, offsetLineY2);
                    ctx.stroke();

                    // Background fill
                    ctx.save();
                    ctx.globalAlpha *= 0.1;
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.lineTo(offsetLineX2, offsetLineY2);
                    ctx.lineTo(p3.x, p3.y);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                }
                break;
            case DrawingType.PITCHFORK:
                if (validCoords.length >= 3) {
                    drawPitchfork(ctx, validCoords[0], validCoords[1], validCoords[2], canvasWidth, canvasHeight);
                }
                break;
            case DrawingType.PATH:
                if (validCoords.length >= 2) {
                    ctx.moveTo(validCoords[0].x, validCoords[0].y);
                    for (let i = 1; i < validCoords.length; i++) {
                        ctx.lineTo(validCoords[i].x, validCoords[i].y);
                    }
                    ctx.stroke();
                }
                break;
            case DrawingType.CIRCLE:
                if (validCoords.length >= 2) drawCircleEllipse(ctx, validCoords[0], validCoords[1], true, color);
                break;
            case DrawingType.ELLIPSE:
                if (validCoords.length >= 2) drawCircleEllipse(ctx, validCoords[0], validCoords[1], false, color);
                break;
            case DrawingType.SMART_LABEL:
                if (validCoords.length >= 1) {
                    const p = validCoords[0];
                    const price = p.point?.price?.toFixed(2) || '0.00';
                    const text = `Price: ${price}`;
                    const padding = 6;
                    ctx.font = '10px Inter';
                    const textWidth = ctx.measureText(text).width;
                    const h = 20;
                    const boxX = p.x + 10;
                    const boxY = p.y - h / 2;

                    ctx.save();
                    ctx.fillStyle = '#1e293b';
                    ctx.globalAlpha = 0.9;
                    ctx.beginPath();
                    ctx.roundRect(boxX, boxY, textWidth + padding * 2, h, 4);
                    ctx.fill();
                    ctx.strokeStyle = color;
                    ctx.stroke();
                    ctx.fillStyle = '#ffffff';
                    ctx.fillText(text, boxX + padding, boxY + 13);
                    ctx.restore();
                }
                break;
            case DrawingType.TEXT:
                if (validCoords.length >= 1) {
                    const p = validCoords[0];
                    ctx.save();
                    ctx.font = '12px Inter';
                    ctx.fillStyle = color;
                    ctx.fillText('Analysis Note', p.x + 5, p.y - 5);
                    ctx.restore();
                }
                break;
            case DrawingType.ARROW_UP:
                if (validCoords.length >= 1) {
                    const p = validCoords[0];
                    ctx.save();
                    ctx.fillStyle = '#10b981';
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y - 5);
                    ctx.lineTo(p.x - 6, p.y + 10);
                    ctx.lineTo(p.x + 6, p.y + 10);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                }
                break;
            case DrawingType.ARROW_DOWN:
                if (validCoords.length >= 1) {
                    const p = validCoords[0];
                    ctx.save();
                    ctx.fillStyle = '#f43f5e';
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y + 5);
                    ctx.lineTo(p.x - 6, p.y - 10);
                    ctx.lineTo(p.x + 6, p.y - 10);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                }
                break;
            case DrawingType.EMOJI_MARKER:
                if (validCoords.length >= 1) {
                    const p = validCoords[0];
                    ctx.save();
                    ctx.font = '20px Arial';
                    ctx.fillText('🎯', p.x - 10, p.y + 8);
                    ctx.restore();
                }
                break;
        }
    };

    const render = () => {
        const canvas = canvasRef.current;
        if (!canvas || !chart || !series) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        try {
            // HiDPI fix: keep drawing coordinates aligned with chart pixels
            const dpr = window.devicePixelRatio || 1;
            if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
                canvas.width = Math.round(width * dpr);
                canvas.height = Math.round(height * dpr);
            }
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, width, height);
            const timeScale = chart.timeScale();

            const sorted = [...drawings].sort((a) => (a.layer === 'bg' ? -1 : 1));

            sorted.forEach(d => {
                if (!d.visible) return;
                const coords = d.points.map(p => ({
                    x: timeScale.timeToCoordinate(p.time as any),
                    y: series.priceToCoordinate(p.price),
                    point: p
                }));

                ctx.save();
                ctx.strokeStyle = d.style.color;
                ctx.lineWidth = d.style.width || 2;
                ctx.globalAlpha = d.style.opacity || 1;
                if (d.style.dashed) ctx.setLineDash([5, 5]);

                drawShape(ctx, coords, d.type, width, height, d.style.color);

                if (d.id === selectedId) {
                    ctx.setLineDash([]);
                    ctx.globalAlpha = 1;
                    ctx.fillStyle = '#FFFFFF';
                    ctx.strokeStyle = '#2962FF';
                    ctx.lineWidth = 1.5;
                    coords.forEach(c => {
                        if (c.x !== null && c.y !== null) {
                            ctx.beginPath();
                            ctx.arc(c.x, c.y, 4.5, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.stroke();
                        }
                    });
                }
                ctx.restore();
            });

            if (isDrawing && previewPoints.length > 0) {
                const previewCoords = previewPoints.map(p => ({
                    x: timeScale.timeToCoordinate(p.time as any),
                    y: series.priceToCoordinate(p.price),
                    point: p
                }));

                ctx.save();
                ctx.strokeStyle = '#2962FF';
                ctx.lineWidth = 1.5;
                ctx.globalAlpha = 0.5;
                ctx.setLineDash([4, 4]);

                if (previewCoords.length >= 2) {
                    drawShape(ctx, previewCoords, activeTool, width, height, '#2962FF');
                } else if (previewCoords.length === 1 && previewCoords[0].x !== null) {
                    ctx.beginPath();
                    ctx.arc(previewCoords[0].x, previewCoords[0].y!, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }
        } catch (_e) {
            // Silently swallow errors during chart transitions (disposed series, etc.)
        }
    };

    useEffect(() => {
        let active = true;
        const handleSync = () => {
            if (active) requestAnimationFrame(() => { if (active) render(); });
        };
        if (chart) {
            chart.timeScale().subscribeVisibleTimeRangeChange(handleSync);
        }
        render();
        return () => {
            active = false;
            if (chart) chart.timeScale().unsubscribeVisibleTimeRangeChange(handleSync);
        };
    }, [chart, series, drawings, width, height, isDrawing, previewPoints, selectedId, activeTool]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!canvasRef.current || !chart || !series) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const timeScale = chart.timeScale();

        // 1. Check for anchor points of selectedId first (priority)
        if (selectedId) {
            const d = drawings.find(d => d.id === selectedId);
            if (d && d.visible) {
                const coords = d.points.map(p => ({
                    x: timeScale.timeToCoordinate(p.time as any),
                    y: series.priceToCoordinate(p.price)
                }));

                for (let i = 0; i < coords.length; i++) {
                    const c = coords[i];
                    if (c.x !== null && c.y !== null) {
                        const dist = Math.sqrt(Math.pow(x - c.x, 2) + Math.pow(y - c.y, 2));
                        if (dist < 10) {
                            interactionRef.current = {
                                type: 'dragging',
                                drawingId: d.id,
                                pointIndex: i,
                                originalPoints: [...d.points],
                                startPos: { x, y }
                            };
                            return;
                        }
                    }
                }
            }
        }

        // 2. Check for object hit
        const tolerance = 10;
        for (const d of drawings) {
            if (!d.visible) continue;
            const coords = d.points.map(p => ({
                x: timeScale.timeToCoordinate(p.time as any),
                y: series.priceToCoordinate(p.price)
            }));

            let hit = false;
            if (d.type === DrawingType.TREND_LINE || d.type === DrawingType.RAY || d.type === DrawingType.RANGE_MEASURE || d.type === DrawingType.PATH) {
                if (coords.length >= 2) {
                    for (let i = 0; i < coords.length - 1; i++) {
                        const dist = getDistanceToSegment(x, y, coords[i].x!, coords[i].y!, coords[i + 1].x!, coords[i + 1].y!);
                        if (dist < tolerance) { hit = true; break; }
                    }
                }
            } else if (d.type === DrawingType.PARALLEL_CHANNEL && coords.length >= 3) {
                const [p1, p2, p3] = coords;
                const dist1 = getDistanceToSegment(x, y, p1.x!, p1.y!, p2.x!, p2.y!);
                const dx = p2.x! - p1.x!;
                const dy = p2.y! - p1.y!;
                const dist2 = getDistanceToSegment(x, y, p3.x!, p3.y!, p3.x! + dx, p3.y! + dy);
                if (dist1 < tolerance || dist2 < tolerance) hit = true;
            } else if (d.type === DrawingType.HORIZONTAL_LINE) {
                if (coords[0] && Math.abs(y - coords[0].y!) < tolerance) hit = true;
            } else if (d.type === DrawingType.VERTICAL_LINE) {
                if (coords[0] && Math.abs(x - coords[0].x!) < tolerance) hit = true;
            } else if (d.type === DrawingType.RECTANGLE || d.type === DrawingType.RISK_REWARD) {
                const xmin = Math.min(coords[0].x!, coords[1].x!);
                const xmax = Math.max(coords[0].x!, coords[1].x!);
                const ymin = Math.min(coords[0].y!, coords[1].y!);
                const ymax = Math.max(coords[0].y!, coords[1].y!);
                if (x >= xmin && x <= xmax && y >= ymin && y <= ymax) hit = true;
            } else if (([DrawingType.SMART_LABEL, DrawingType.ARROW_UP, DrawingType.ARROW_DOWN, DrawingType.TEXT, DrawingType.EMOJI_MARKER] as any[]).includes(d.type)) {
                if (coords[0] && Math.abs(x - coords[0].x!) < tolerance * 2 && Math.abs(y - coords[0].y!) < tolerance * 2) hit = true;
            }

            if (hit) {
                onSelect?.(d.id);
                interactionRef.current = {
                    type: 'moving',
                    drawingId: d.id,
                    pointIndex: null,
                    originalPoints: [...d.points],
                    startPos: { x, y }
                };
                return;
            }
        }

        onSelect?.(null);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const stage = interactionRef.current;
        if (stage.type === 'idle' || !stage.drawingId || !chart || !series) return;

        const rect = canvasRef.current!.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const timeScale = chart.timeScale();
        const newPoints = [...stage.originalPoints];

        if (stage.type === 'dragging' && stage.pointIndex !== null) {
            const price = series.coordinateToPrice(y) || 0;
            const time = timeScale.coordinateToTime(x) as number;
            if (time) {
                newPoints[stage.pointIndex] = { time, price };
                onUpdatePoints?.(stage.drawingId, newPoints, true);
            }
        } else if (stage.type === 'moving') {
            const dx = x - stage.startPos.x;
            const dy = y - stage.startPos.y;

            const updated = stage.originalPoints.map(p => {
                const cx = timeScale.timeToCoordinate(p.time as any)!;
                const cy = series.priceToCoordinate(p.price)!;
                return {
                    time: timeScale.coordinateToTime(cx + dx) as number,
                    price: series.coordinateToPrice(cy + dy) || 0
                };
            });

            if (updated.every(p => p.time)) {
                onUpdatePoints?.(stage.drawingId, updated as Point[], true);
            }
        }
    };

    const handleMouseUp = () => {
        const stage = interactionRef.current;
        if (stage.type !== 'idle' && stage.drawingId) {
            // Commit final state
            const d = drawings.find(item => item.id === stage.drawingId);
            if (d) onUpdatePoints?.(stage.drawingId, d.points, false);
        }
        interactionRef.current = { type: 'idle', drawingId: null, pointIndex: null, originalPoints: [], startPos: { x: 0, y: 0 } };
    };

    const getDistanceToSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
        const l2 = Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2);
        if (l2 === 0) return Math.sqrt(Math.pow(px - x1, 2) + Math.pow(py - y1, 2));
        let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
        t = Math.max(0, Math.min(1, t));
        return Math.sqrt(Math.pow(px - (x1 + t * (x2 - x1)), 2) + Math.pow(py - (y1 + t * (y2 - y1)), 2));
    };

    const [isHoveringObject, setIsHoveringObject] = React.useState(false);

    const handleGlobalMouseMove = (e: MouseEvent) => {
        if (!canvasRef.current || !chart || !series || interactionRef.current.type !== 'idle') return;

        // When a tool is active, the drawing layer is pointer-events none anyway 
        // to allow chart.subscribeClick to work first in ChartComponent.
        if (activeTool !== 'none') return;

        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const timeScale = chart.timeScale();
        const tolerance = 10;

        // Hit test for selective interaction
        let anyHit = false;

        // 1. Check handles of selected
        if (selectedId) {
            const d = drawings.find(item => item.id === selectedId);
            if (d && d.visible) {
                const coords = d.points.map(p => ({
                    x: timeScale.timeToCoordinate(p.time as any),
                    y: series.priceToCoordinate(p.price)
                }));
                if (coords.some(c => c.x !== null && c.y !== null && Math.sqrt(Math.pow(x - c.x, 2) + Math.pow(y - c.y, 2)) < tolerance)) {
                    anyHit = true;
                }
            }
        }

        // 2. Check object bodies
        if (!anyHit) {
            for (const d of drawings) {
                if (!d.visible) continue;
                const coords = d.points.map(p => ({
                    x: timeScale.timeToCoordinate(p.time as any),
                    y: series.priceToCoordinate(p.price)
                }));

                if (d.type === DrawingType.TREND_LINE || d.type === DrawingType.RAY || d.type === DrawingType.RANGE_MEASURE || d.type === DrawingType.PATH) {
                    if (coords.length >= 2) {
                        for (let i = 0; i < coords.length - 1; i++) {
                            if (getDistanceToSegment(x, y, coords[i].x!, coords[i].y!, coords[i + 1].x!, coords[i + 1].y!) < tolerance) anyHit = true;
                            if (anyHit) break;
                        }
                    }
                } else if (d.type === DrawingType.PARALLEL_CHANNEL && coords.length >= 3) {
                    const [p1, p2, p3] = coords;
                    const dx = p2.x! - p1.x!;
                    const dy = p2.y! - p1.y!;
                    if (getDistanceToSegment(x, y, p1.x!, p1.y!, p2.x!, p2.y!) < tolerance) anyHit = true;
                    if (!anyHit && getDistanceToSegment(x, y, p3.x!, p3.y!, p3.x! + dx, p3.y! + dy) < tolerance) anyHit = true;
                } else if (d.type === DrawingType.HORIZONTAL_LINE) {
                    if (coords[0] && Math.abs(y - coords[0].y!) < tolerance) anyHit = true;
                } else if (d.type === DrawingType.VERTICAL_LINE) {
                    if (coords[0] && Math.abs(x - coords[0].x!) < tolerance) anyHit = true;
                } else if (d.type === DrawingType.RECTANGLE || d.type === DrawingType.RISK_REWARD) {
                    const xmin = Math.min(coords[0].x!, coords[1].x!);
                    const xmax = Math.max(coords[0].x!, coords[1].x!);
                    const ymin = Math.min(coords[0].y!, coords[1].y!);
                    const ymax = Math.max(coords[0].y!, coords[1].y!);
                    if (x >= xmin && x <= xmax && y >= ymin && y <= ymax) anyHit = true;
                } else if (([DrawingType.SMART_LABEL, DrawingType.ARROW_UP, DrawingType.ARROW_DOWN, DrawingType.TEXT, DrawingType.EMOJI_MARKER] as any[]).includes(d.type)) {
                    if (coords[0] && Math.abs(x - coords[0].x!) < tolerance * 2 && Math.abs(y - coords[0].y!) < tolerance * 2) anyHit = true;
                }
                if (anyHit) break;
            }
        }

        if (anyHit !== isHoveringObject) {
            setIsHoveringObject(anyHit);
        }
    };

    useEffect(() => {
        window.addEventListener('mousemove', handleGlobalMouseMove);
        return () => window.removeEventListener('mousemove', handleGlobalMouseMove);
    }, [drawings, selectedId, chart, series, activeTool, isHoveringObject]);

    return (
        <canvas
            ref={canvasRef}
            // width/height are controlled in render() for HiDPI correctness
            width={Math.max(1, Math.round(width))}
            height={Math.max(1, Math.round(height))}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className={`absolute inset-0 z-[100] ${interactionRef.current.type !== 'idle' ? 'cursor-grabbing' : isHoveringObject ? 'cursor-pointer' : activeTool !== 'none' ? 'cursor-crosshair' : 'cursor-default'}`}
            style={{
                width: '100%',
                height: '100%',
                pointerEvents: activeTool !== 'none' ? 'none' : (isHoveringObject || interactionRef.current.type !== 'idle' ? 'auto' : 'none')
            }}
        />
    );
};

export default DrawingLayer;
