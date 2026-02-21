import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Stage, Layer, Rect, Line, Group, Text } from 'react-konva';
import { Candle, ViewTransform, Settings, SessionInfo, TrendLine, TextElement } from '../types';
import Konva from 'konva';

interface ChartBoardProps {
  candles: Candle[];
  setCandles: React.Dispatch<React.SetStateAction<Candle[]>>;
  trendLines: TrendLine[];
  setTrendLines: React.Dispatch<React.SetStateAction<TrendLine[]>>;
  texts: TextElement[];
  setTexts: React.Dispatch<React.SetStateAction<TextElement[]>>;
  viewTransform: ViewTransform;
  setViewTransform: React.Dispatch<React.SetStateAction<ViewTransform>>;
  settings: Settings;
  sessionInfo: SessionInfo;
  activeCandleIndex: number | null;
  setActiveCandleIndex: (index: number | null) => void;
}

export interface ChartBoardHandle {
  exportImage: () => string | undefined;
}

const ChartBoard = forwardRef<ChartBoardHandle, ChartBoardProps>(({
  candles,
  setCandles,
  trendLines,
  setTrendLines,
  texts,
  setTexts,
  viewTransform,
  setViewTransform,
  settings,
  sessionInfo,
  activeCandleIndex,
  setActiveCandleIndex,
}, ref) => {
  const stageRef = useRef<Konva.Stage>(null);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  useImperativeHandle(ref, () => ({
    exportImage: () => {
      return stageRef.current?.toDataURL();
    }
  }));

  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getChartCoords = (clientX: number, clientY: number) => {
    const chartX = (clientX - viewTransform.x) / viewTransform.scale;
    const chartY = (clientY - viewTransform.y) / viewTransform.scale;

    const candleIndex = Math.floor(chartX / settings.timeframe);
    let price = -chartY / settings.priceStep;

    if (settings.snapToGrid) {
      price = Math.round(price);
    }
    price = Math.max(0, price);

    return { candleIndex, price };
  };

  const [activeLineId, setActiveLineId] = useState<string | null>(null);
  const [activeTextId, setActiveTextId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<{ id: string, text: string, screenX: number, screenY: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPos, setLastPanPos] = useState<{ x: number, y: number } | null>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  // Focus the input when it opens
  useEffect(() => {
    if (editingText && textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [editingText]);

  const handlePointerDown = (e: any) => {
    if (settings.tool === 'hand' || settings.activeTimeframe > settings.baseTimeframe) {
      const stage = e.target.getStage();
      const pos = stage.getPointerPosition();
      if (pos) {
        setIsPanning(true);
        setLastPanPos(pos);
      }
      return;
    }

    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    if (!pos) return;

    const coords = getChartCoords(pos.x, pos.y);
    if (!coords) return;

    const { candleIndex, price } = coords;

    if (settings.tool === 'line') {
      const newLineId = `line-${Date.now()}`;
      setActiveLineId(newLineId);
      setTrendLines(prev => [...prev, {
        id: newLineId,
        startIndex: candleIndex,
        startPrice: price,
        endIndex: candleIndex,
        endPrice: price,
        color: settings.lineColor
      }]);
      return;
    }

    if (settings.tool === 'text') return;

    if (settings.preventPastDrawing) {
      const maxIndex = candles.reduce((max, c) => Math.max(max, c.index), -1);
      if (maxIndex !== -1 && candleIndex < maxIndex) return;
    }

    // Start drawing candle
    setActiveCandleIndex(candleIndex);

    setCandles(prev => {
      const existing = prev.find(c => c.index === candleIndex);
      if (existing) {
        return prev.map(c => c.index === candleIndex ? { ...c, close: price, high: Math.max(c.high, price), low: Math.min(c.low, price) } : c);
      } else {
        let open = price;
        if (settings.continuity && candleIndex > 0) {
          const prevCandle = prev.find(c => c.index === candleIndex - 1);
          if (prevCandle) open = prevCandle.close;
        }
        return [...prev, { index: candleIndex, open, high: price, low: price, close: price }];
      }
    });
  };

  const handlePointerMove = (e: any) => {
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    if (!pos) return;

    if (isPanning && lastPanPos) {
      const dx = pos.x - lastPanPos.x;
      const dy = pos.y - lastPanPos.y;
      setViewTransform(prev => {
        const nextY = prev.y + dy;
        // The 0 price line is at local y=0. The view transform y is the screen Y coordinate where the local y=0 is drawn.
        // We do not want local y=0 to be drawn lower than the screen bottom (dimensions.height - 30 for axis padding).
        // Therefore, we cap `y` at `dimensions.height - 30`.
        const maxAllowedY = dimensions.height - 30;
        return {
          ...prev,
          x: prev.x + dx,
          y: Math.min(nextY, maxAllowedY)
        };
      });
      setLastPanPos(pos);
      return;
    }

    if (settings.tool === 'text') return;

    if (activeCandleIndex === null && activeLineId === null) return;

    const coords = getChartCoords(pos.x, pos.y);
    if (!coords) return;

    const { candleIndex, price: rawPrice } = coords;

    if (activeLineId !== null) {
      setTrendLines(prev => prev.map(line =>
        line.id === activeLineId
          ? { ...line, endIndex: candleIndex, endPrice: rawPrice }
          : line
      ));
      return;
    }

    if (settings.preventPastDrawing && activeCandleIndex !== null) {
      const maxIndex = candles.reduce((max, c) => Math.max(max, c.index), -1);
      if (maxIndex !== -1 && candleIndex < maxIndex) return;
    }

    // Candle Volatility Assist
    const smoothing = 0.3;
    const lastCandle = candles.find(c => c.index === activeCandleIndex);
    const price = lastCandle ? lastCandle.close + (rawPrice - lastCandle.close) * smoothing : rawPrice;

    if (candleIndex !== activeCandleIndex && settings.continuousDraw) {
      setActiveCandleIndex(candleIndex);
      setCandles(prev => {
        const lastCandle = prev.find(c => c.index === activeCandleIndex);
        const existing = prev.find(c => c.index === candleIndex);

        if (existing) return prev;

        const open = lastCandle ? lastCandle.close : price;
        return [...prev, { index: candleIndex, open, high: Math.max(open, price), low: Math.min(open, price), close: price }];
      });
    } else if (candleIndex === activeCandleIndex) {
      setCandles(prev => prev.map(c => {
        if (c.index === candleIndex) {
          return {
            ...c,
            close: price,
            high: Math.max(c.high, price),
            low: Math.min(c.low, price)
          };
        }
        return c;
      }));
    }
  };

  const handlePointerUp = () => {
    setIsPanning(false);
    setLastPanPos(null);

    setActiveCandleIndex(null);
    if (activeLineId) {
      // Remove lines that are just dots (start == end)
      setTrendLines(prev => prev.filter(l => l.startIndex !== l.endIndex || l.startPrice !== l.endPrice));
      setActiveLineId(null);
    }
  };

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const scaleBy = 1.1;
    const oldScale = viewTransform.scale;
    const pointer = stage.getPointerPosition();

    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - viewTransform.x) / oldScale,
      y: (pointer.y - viewTransform.y) / oldScale,
    };

    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

    const newX = pointer.x - mousePointTo.x * newScale;
    const newY = pointer.y - mousePointTo.y * newScale;
    const maxAllowedY = dimensions.height - 30;

    setViewTransform({
      scale: newScale,
      x: newX,
      y: Math.min(newY, maxAllowedY),
    });
  };

  const renderGrid = () => {
    const lines = [];
    const xLabels = [];
    const yLabels = [];
    const { x, y, scale } = viewTransform;
    const isDark = settings.theme === 'dark';
    const gridColor = isDark ? '#1f2937' : '#e5e7eb'; // Slightly visible grid lines
    const labelXColor = isDark ? '#787b86' : '#6b7280';
    const labelYColor = isDark ? '#d1d4dc' : '#374151';

    // Dynamic scale for Time (X-axis)
    let timeStep = settings.timeframe;
    let labelStepMultiplier = 5;
    while (timeStep * scale * labelStepMultiplier < 60) {
      labelStepMultiplier *= 2;
    }

    const startX = Math.floor(-x / (timeStep * scale)) * timeStep;
    const endX = startX + dimensions.width / scale + timeStep * 2;

    for (let i = startX; i < endX; i += timeStep) {
      lines.push(
        <Line
          key={`v-${i}`}
          points={[i, -10000, i, 10000]}
          stroke={gridColor}
          strokeWidth={1 / scale}
        />
      );

      // Time labels at bottom
      const candleIndex = Math.round(i / settings.timeframe);
      if (candleIndex % labelStepMultiplier === 0) {
        const timeValue = sessionInfo.startTime + candleIndex * settings.activeTimeframe * 60000;
        const date = new Date(timeValue);
        const timeStr = settings.activeTimeframe >= 1440
          ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
          : date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

        const screenX = i * scale + x;
        xLabels.push(
          <Text
            key={`lbl-x-${i}`}
            x={screenX + 2}
            y={dimensions.height - 20}
            text={timeStr}
            fill={labelXColor}
            fontSize={11}
            fontFamily="monospace"
          />
        );
      }
    }

    // Dynamic scale for Price (Y-axis)
    let priceStep = settings.priceStep;
    while (priceStep * scale < 40) {
      priceStep *= 2;
    }

    const startY = Math.floor(-y / (priceStep * scale)) * priceStep;
    const endY = startY + dimensions.height / scale + priceStep * 2;

    for (let i = startY; i < endY; i += priceStep) {
      lines.push(
        <Line
          key={`h-${i}`}
          points={[-10000, i, 10000, i]}
          stroke={gridColor}
          strokeWidth={1 / scale}
        />
      );

      // Price labels on the right
      const priceValue = Math.max(0, -i / settings.priceStep);
      // Wait, if it iterates by `priceStep` (which is `settings.priceStep * multiplier`), then `priceValue` is correct!
      // But wait, the raw `price` property is based on the logic: `y = -price * settings.priceStep`
      // So `price = -y / settings.priceStep`

      const actualPriceValue = Math.max(0, -i / settings.priceStep);

      const screenY = i * scale + y;
      yLabels.push(
        <Text
          key={`lbl-y-${i}`}
          x={dimensions.width - 55}
          y={screenY - 6}
          text={actualPriceValue.toFixed(2)}
          fill={labelYColor}
          fontSize={11}
          fontFamily="monospace"
          fontStyle="bold"
        />
      );
    }

    return { lines, xLabels, yLabels, gridColor };
  };

  const handleStageClick = (e: any) => {
    if (settings.tool !== 'text') return;

    if (editingText) {
      // If we already had an open text, close it.
      // Wait for blur to handle it or handle it here
      setTexts(prev => prev.map(t => t.id === editingText.id ? { ...t, text: editingText.text } : t).filter(t => t.text.trim() !== ''));
      setEditingText(null);
      setActiveTextId(null);
      return;
    }

    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    if (!pos) return;

    const coords = getChartCoords(pos.x, pos.y);
    if (!coords) return;

    const newTextId = `text-${Date.now()}`;
    setActiveTextId(newTextId);
    setTexts(prev => [...prev, {
      id: newTextId,
      startIndex: coords.candleIndex,
      startPrice: coords.price,
      text: '',
      color: settings.lineColor
    }]);

    // Use a tiny timeout to ensure the DOM has completed the click event before focusing
    setTimeout(() => {
      setEditingText({ id: newTextId, text: '', screenX: pos.x, screenY: pos.y });
    }, 10);
  };

  const { lines, xLabels, yLabels, gridColor } = renderGrid();
  const isDark = settings.theme === 'dark';

  return (
    <div className={`w-full h-full overflow-hidden ${isDark ? 'bg-[#131722]' : 'bg-[#FFFFFF]'} ${settings.tool === 'text' ? 'cursor-text' : settings.tool !== 'hand' ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}>
      <Stage
        width={dimensions.width}
        height={dimensions.height}
        ref={stageRef}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
        onClick={handleStageClick}
        onTap={handleStageClick}
        onWheel={handleWheel}
      >
        {/* Zoomable Chart Content */}
        <Layer
          x={viewTransform.x}
          y={viewTransform.y}
          scaleX={viewTransform.scale}
          scaleY={viewTransform.scale}
        >
          {lines}
          {candles.map((candle) => {
            const isBullish = candle.close >= candle.open;
            const color = isBullish ? '#089981' : '#f23645';
            const x = candle.index * settings.timeframe;
            const bodyY = -Math.max(candle.open, candle.close) * settings.priceStep;
            const bodyHeight = Math.abs(candle.open - candle.close) * settings.priceStep;
            const wickTop = -candle.high * settings.priceStep;
            const wickBottom = -candle.low * settings.priceStep;
            const centerX = x + settings.timeframe / 2;

            return (
              <Group key={candle.index}>
                {/* Wick */}
                <Line
                  points={[centerX, wickTop, centerX, wickBottom]}
                  stroke={color}
                  strokeWidth={1}
                />
                {/* Body */}
                <Rect
                  x={x + Math.max(1, settings.timeframe * 0.1)}
                  y={bodyY}
                  width={Math.max(1, settings.timeframe * 0.8)}
                  height={Math.max(bodyHeight, 1)}
                  fill={color}
                  stroke={color}
                  strokeWidth={0}
                />
                {activeCandleIndex === candle.index && (
                  <Rect
                    x={x}
                    y={-10000}
                    width={settings.timeframe}
                    height={20000}
                    fill={isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)"}
                  />
                )}
              </Group>
            );
          })}

          {/* TrendLines */}
          {trendLines.map(line => {
            if (line.endIndex === null || line.endPrice === null) return null;

            const startX = line.startIndex * settings.timeframe + settings.timeframe / 2;
            const startY = -line.startPrice * settings.priceStep;

            const endX = line.endIndex * settings.timeframe + settings.timeframe / 2;
            const endY = -line.endPrice * settings.priceStep;

            return (
              <Line
                key={line.id}
                points={[startX, startY, endX, endY]}
                stroke={line.color || settings.lineColor || '#3bf6ff'}
                strokeWidth={2 / viewTransform.scale}
                hitStrokeWidth={10 / viewTransform.scale}
                tension={0}
                lineCap="round"
                lineJoin="round"
                shadowColor={line.color || settings.lineColor || '#3bf6ff'}
                shadowBlur={5 / viewTransform.scale}
                shadowOpacity={isDark ? 0.5 : 0.2}
              />
            );
          })}

          {/* Texts */}
          {texts.map(textElem => {
            // Hide the actual canvas text if it's currently being edited in HTML
            if (activeTextId === textElem.id) return null;

            const startX = textElem.startIndex * settings.timeframe + settings.timeframe / 2;
            const startY = -textElem.startPrice * settings.priceStep;

            return (
              <Text
                key={textElem.id}
                x={startX}
                y={startY}
                text={textElem.text}
                fill={textElem.color || settings.lineColor || '#3bf6ff'}
                fontSize={14 / viewTransform.scale}
                fontFamily="sans-serif"
                shadowColor={isDark ? 'black' : 'white'}
                shadowBlur={2 / viewTransform.scale}
                offsetX={0}
                offsetY={7 / viewTransform.scale}
              />
            );
          })}
        </Layer>

        {/* Fixed UI Layer for Axes */}
        <Layer>
          {/* X Axis background */}
          <Rect x={0} y={dimensions.height - 30} width={dimensions.width - 60} height={30} fill={isDark ? '#131722' : '#FFFFFF'} />
          <Line points={[0, dimensions.height - 30, dimensions.width - 60, dimensions.height - 30]} stroke={gridColor} strokeWidth={1} />
          {xLabels}

          {/* Y Axis background */}
          <Rect x={dimensions.width - 60} y={0} width={60} height={dimensions.height} fill={isDark ? '#131722' : '#FFFFFF'} />
          <Line points={[dimensions.width - 60, 0, dimensions.width - 60, dimensions.height]} stroke={gridColor} strokeWidth={1} />
          {yLabels}
        </Layer>
      </Stage>

      {/* HTML Input Overlay for Active Text */}
      {editingText && (
        <input
          ref={textInputRef}
          type="text"
          value={editingText.text}
          onChange={(e) => setEditingText({ ...editingText, text: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setTexts(prev => prev.map(t => t.id === editingText.id ? { ...t, text: editingText.text } : t).filter(t => t.text.trim() !== ''));
              setEditingText(null);
              setActiveTextId(null);
            }
            // Stop propagation to avoid accidentally triggering global shortcuts while typing
            e.stopPropagation();
          }}
          onBlur={() => {
            setTexts(prev => prev.map(t => t.id === editingText.id ? { ...t, text: editingText.text } : t).filter(t => t.text.trim() !== ''));
            setEditingText(null);
            setActiveTextId(null);
          }}
          className={`absolute z-10 bg-transparent border-none outline-none font-sans text-sm ${isDark ? 'text-white drop-shadow-[0_1px_1px_rgba(0,0,0,1)]' : 'text-black drop-shadow-[0_1px_1px_rgba(255,255,255,1)]'}`}
          style={{
            left: editingText.screenX,
            top: editingText.screenY - 10,
            color: texts.find(t => t.id === editingText.id)?.color || settings.lineColor || '#3bf6ff'
          }}
          placeholder="Type text..."
        />
      )}
    </div>
  );
});

export default ChartBoard;
