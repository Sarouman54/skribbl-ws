import { socket } from '../utils/socket.ts';

type DrawPayload = {
	x0: number;
	y0: number;
	x1: number;
	y1: number;
	color: string;
	size: number;
};

type ColorPayload = {
	color: string;
};

type FillPayload = {
	x: number;
	y: number;
	color: string;
};

type Tool = 'brush' | 'fill' | 'eraser';

const DEFAULT_COLOR = '#000000';
const DEFAULT_SIZE = 6;
const ERASER_COLOR = '#ffffff';
const ERASER_SIZE = 18;

let initialized = false;

export function initCanvas() {
	if (initialized) return;
	initialized = true;

	const canvas = document.getElementById('drawCanvas') as HTMLCanvasElement | null;
	const canvasArea = document.getElementById('canvasArea') as HTMLDivElement | null;
	const cursor = document.getElementById('brushCursor') as HTMLDivElement | null;
	const clearBtn = document.getElementById('clearCanvasBtn') as HTMLButtonElement | null;
	const roleLabel = document.getElementById('canvasRole') as HTMLSpanElement | null;
	const palette = document.getElementById('colorPalette') as HTMLDivElement | null;
	const tools = document.getElementById('canvasTools') as HTMLDivElement | null;

	if (!canvas || !canvasArea || !cursor || !clearBtn || !roleLabel || !palette || !tools) return;

	const ctx = canvas.getContext('2d');
	if (!ctx) return;

	const canvasEl = canvas;
	const canvasAreaEl = canvasArea;
	const cursorEl = cursor;
	const clearBtnEl = clearBtn;
	const roleLabelEl = roleLabel;
	const paletteEl = palette;
	const toolsEl = tools;
	const ctx2d = ctx;

	let canDraw = true;
	let isDrawing = false;
	let selectedTool: Tool = 'brush';
	let last = { x: 0, y: 0 };

	const brush = {
		color: DEFAULT_COLOR,
		size: DEFAULT_SIZE,
	};

	const swatches = Array.from(paletteEl.querySelectorAll<HTMLButtonElement>('.color-swatch'));
	const toolButtons = Array.from(toolsEl.querySelectorAll<HTMLButtonElement>('.tool-btn'));

	function colorToRGBA(color: string): [number, number, number, number] {
		const hex = color.replace('#', '');
		if (hex.length !== 6) return [0, 0, 0, 255];
		const r = Number.parseInt(hex.slice(0, 2), 16);
		const g = Number.parseInt(hex.slice(2, 4), 16);
		const b = Number.parseInt(hex.slice(4, 6), 16);
		return [r, g, b, 255];
	}

	function setCursorColor(color: string) {
		cursorEl.style.background = color;
		cursorEl.style.borderColor = color.toLowerCase() === '#ffffff' ? '#222222' : color;
	}

	function setActiveSwatch(color: string) {
		swatches.forEach((btn) => {
			const isActive = btn.dataset.color === color;
			btn.classList.toggle('is-active', isActive);
		});
	}

	function setBrushColor(color: string, shouldBroadcast: boolean) {
		brush.color = color;
		setActiveSwatch(color);
		if (selectedTool !== 'eraser') {
			setCursorColor(color);
		}
		if (shouldBroadcast) {
			socket.emit('canvas_color', { color });
		}
	}

	function setActiveTool(tool: Tool) {
		selectedTool = tool;
		toolButtons.forEach((btn) => {
			const isActive = btn.dataset.tool === tool;
			btn.classList.toggle('is-active', isActive);
		});

		if (tool === 'eraser') {
			setCursorColor(ERASER_COLOR);
		} else {
			setCursorColor(brush.color);
		}
	}

	function currentStrokeStyle() {
		if (selectedTool === 'eraser') {
			return { color: ERASER_COLOR, size: ERASER_SIZE };
		}

		return { color: brush.color, size: brush.size };
	}

	function setRoleUI() {
		roleLabelEl.textContent = canDraw ? 'Tu dessines' : 'Tu devines';
		clearBtnEl.classList.toggle('hidden', !canDraw);
		paletteEl.classList.toggle('hidden', !canDraw);
		toolsEl.classList.toggle('hidden', !canDraw);
	}

	function resizeCanvas() {
		const rect = canvasAreaEl.getBoundingClientRect();
		const ratio = window.devicePixelRatio || 1;

		const prev = document.createElement('canvas');
		prev.width = canvasEl.width;
		prev.height = canvasEl.height;
		const prevCtx = prev.getContext('2d');
		if (prevCtx) {
			prevCtx.drawImage(canvasEl, 0, 0);
		}

		canvasEl.width = Math.floor(rect.width * ratio);
		canvasEl.height = Math.floor(rect.height * ratio);

		ctx2d.setTransform(ratio, 0, 0, ratio, 0, 0);
		ctx2d.lineCap = 'round';
		ctx2d.lineJoin = 'round';

		if (prev.width > 0 && prev.height > 0) {
			ctx2d.drawImage(prev, 0, 0, prev.width, prev.height, 0, 0, rect.width, rect.height);
		}
	}

	function pointerPos(evt: PointerEvent) {
		const rect = canvasEl.getBoundingClientRect();
		return {
			x: evt.clientX - rect.left,
			y: evt.clientY - rect.top,
			w: rect.width,
			h: rect.height,
		};
	}

	function drawLine(x0: number, y0: number, x1: number, y1: number, color: string, size: number) {
		ctx2d.strokeStyle = color;
		ctx2d.lineWidth = size;
		ctx2d.beginPath();
		ctx2d.moveTo(x0, y0);
		ctx2d.lineTo(x1, y1);
		ctx2d.stroke();
	}

	function floodFill(x: number, y: number, fillColor: string) {
		const rect = canvasEl.getBoundingClientRect();
		if (rect.width <= 0 || rect.height <= 0) return;

		const width = canvasEl.width;
		const height = canvasEl.height;
		const dprX = width / rect.width;
		const dprY = height / rect.height;

		const startX = Math.floor(x * dprX);
		const startY = Math.floor(y * dprY);

		if (startX < 0 || startY < 0 || startX >= width || startY >= height) return;

		const image = ctx2d.getImageData(0, 0, width, height);
		const data = image.data;
		const targetIndex = (startY * width + startX) * 4;
		const target: [number, number, number, number] = [
			data[targetIndex],
			data[targetIndex + 1],
			data[targetIndex + 2],
			data[targetIndex + 3],
		];
		const replacement = colorToRGBA(fillColor);

		if (
			target[0] === replacement[0] &&
			target[1] === replacement[1] &&
			target[2] === replacement[2] &&
			target[3] === replacement[3]
		) {
			return;
		}

		const stack: Array<[number, number]> = [[startX, startY]];

		while (stack.length > 0) {
			const point = stack.pop();
			if (!point) continue;

			const [px, py] = point;
			if (px < 0 || py < 0 || px >= width || py >= height) continue;

			const idx = (py * width + px) * 4;
			if (
				data[idx] !== target[0] ||
				data[idx + 1] !== target[1] ||
				data[idx + 2] !== target[2] ||
				data[idx + 3] !== target[3]
			) {
				continue;
			}

			data[idx] = replacement[0];
			data[idx + 1] = replacement[1];
			data[idx + 2] = replacement[2];
			data[idx + 3] = replacement[3];

			stack.push([px + 1, py]);
			stack.push([px - 1, py]);
			stack.push([px, py + 1]);
			stack.push([px, py - 1]);
		}

		ctx2d.putImageData(image, 0, 0);
	}

	function emitLine(x0: number, y0: number, x1: number, y1: number, w: number, h: number) {
		const style = currentStrokeStyle();
		const payload: DrawPayload = {
			x0: x0 / w,
			y0: y0 / h,
			x1: x1 / w,
			y1: y1 / h,
			color: style.color,
			size: style.size,
		};
		socket.emit('canvas_draw', payload);
	}

	function emitFill(x: number, y: number, w: number, h: number, color: string) {
		const payload: FillPayload = {
			x: x / w,
			y: y / h,
			color,
		};
		socket.emit('canvas_fill', payload);
	}

	function clearCanvas(localOnly = false) {
		ctx2d.clearRect(0, 0, canvasEl.width, canvasEl.height);
		if (!localOnly) {
			socket.emit('canvas_clear');
		}
	}

	canvasEl.addEventListener('pointerenter', () => {
		cursorEl.style.opacity = '1';
	});

	canvasEl.addEventListener('pointerleave', () => {
		cursorEl.style.opacity = '0';
		isDrawing = false;
	});

	canvasEl.addEventListener('pointermove', (evt) => {
		const pos = pointerPos(evt);
		cursorEl.style.left = `${pos.x}px`;
		cursorEl.style.top = `${pos.y}px`;

		if (!isDrawing || !canDraw) return;
		if (selectedTool === 'fill') return;

		const style = currentStrokeStyle();
		drawLine(last.x, last.y, pos.x, pos.y, style.color, style.size);
		emitLine(last.x, last.y, pos.x, pos.y, pos.w, pos.h);
		last = { x: pos.x, y: pos.y };
	});

	canvasEl.addEventListener('pointerdown', (evt) => {
		if (!canDraw) return;
		const pos = pointerPos(evt);

		if (selectedTool === 'fill') {
			floodFill(pos.x, pos.y, brush.color);
			emitFill(pos.x, pos.y, pos.w, pos.h, brush.color);
			return;
		}

		isDrawing = true;
		last = { x: pos.x, y: pos.y };

		const style = currentStrokeStyle();
		drawLine(pos.x, pos.y, pos.x + 0.01, pos.y + 0.01, style.color, style.size);
		emitLine(pos.x, pos.y, pos.x + 0.01, pos.y + 0.01, pos.w, pos.h);
	});

	window.addEventListener('pointerup', () => {
		isDrawing = false;
	});

	clearBtnEl.addEventListener('click', () => {
		if (!canDraw) return;
		clearCanvas(false);
	});

	swatches.forEach((btn) => {
		btn.addEventListener('click', () => {
			if (!canDraw) return;
			const color = btn.dataset.color;
			if (!color) return;
			setBrushColor(color, true);
		});
	});

	toolButtons.forEach((btn) => {
		btn.addEventListener('click', () => {
			if (!canDraw) return;
			const tool = btn.dataset.tool as Tool | undefined;
			if (!tool) return;
			setActiveTool(tool);
		});
	});

	socket.on('canvas_draw', (payload: DrawPayload) => {
		const rect = canvasEl.getBoundingClientRect();
		drawLine(
			payload.x0 * rect.width,
			payload.y0 * rect.height,
			payload.x1 * rect.width,
			payload.y1 * rect.height,
			payload.color,
			payload.size
		);
	});

	socket.on('canvas_fill', (payload: FillPayload) => {
		const rect = canvasEl.getBoundingClientRect();
		floodFill(payload.x * rect.width, payload.y * rect.height, payload.color);
	});

	socket.on('canvas_clear', () => {
		clearCanvas(true);
	});

	socket.on('canvas_color', (payload: ColorPayload) => {
		if (selectedTool !== 'eraser') {
			setCursorColor(payload.color);
		}

		if (canDraw) {
			setActiveSwatch(payload.color);
		}
	});

	socket.on('drawing_started', (data: { drawerId: string }) => {
		canDraw = data.drawerId === socket.id;
		setRoleUI();
		setActiveTool('brush');
		setBrushColor(DEFAULT_COLOR, canDraw);
		clearCanvas(true);
	});

	socket.on('game_started', () => {
		canDraw = false;
		setRoleUI();
		setActiveTool('brush');
		setBrushColor(DEFAULT_COLOR, false);
		clearCanvas(true);
	});

	socket.on('new_turn', () => {
		canDraw = false;
		setRoleUI();
		setActiveTool('brush');
		setBrushColor(DEFAULT_COLOR, false);
		clearCanvas(true);
	});

	resizeCanvas();
	setActiveTool('brush');
	setBrushColor(DEFAULT_COLOR, false);
	setRoleUI();
	window.addEventListener('resize', resizeCanvas);
}
