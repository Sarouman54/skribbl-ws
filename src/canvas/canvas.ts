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

const DEFAULT_COLOR = '#000000';
const DEFAULT_SIZE = 6;

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

	if (!canvas || !canvasArea || !cursor || !clearBtn || !roleLabel || !palette) return;

	const ctx = canvas.getContext('2d');
	if (!ctx) return;

	const canvasEl = canvas;
	const canvasAreaEl = canvasArea;
	const cursorEl = cursor;
	const clearBtnEl = clearBtn;
	const roleLabelEl = roleLabel;
	const paletteEl = palette;
	const ctx2d = ctx;

	let canDraw = true;
	let isDrawing = false;
	let last = { x: 0, y: 0 };

	const brush = {
		color: DEFAULT_COLOR,
		size: DEFAULT_SIZE,
	};
	const swatches = Array.from(paletteEl.querySelectorAll<HTMLButtonElement>('.color-swatch'));

	function setCursorColor(color: string) {
		cursorEl.style.background = color;
		cursorEl.style.borderColor = color;
	}

	function setActiveSwatch(color: string) {
		swatches.forEach((btn) => {
			const isActive = btn.dataset.color === color;
			btn.classList.toggle('is-active', isActive);
		});
	}

	function setBrushColor(color: string, shouldBroadcast: boolean) {
		brush.color = color;
		setCursorColor(color);
		setActiveSwatch(color);
		if (shouldBroadcast) {
			socket.emit('canvas_color', { color });
		}
	}

	function setRoleUI() {
		roleLabelEl.textContent = canDraw ? 'Tu dessines' : 'Tu devines';
		clearBtnEl.classList.toggle('hidden', !canDraw);
		paletteEl.classList.toggle('hidden', !canDraw);
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

	function emitLine(x0: number, y0: number, x1: number, y1: number, w: number, h: number) {
		const payload: DrawPayload = {
			x0: x0 / w,
			y0: y0 / h,
			x1: x1 / w,
			y1: y1 / h,
			color: brush.color,
			size: brush.size,
		};
		socket.emit('canvas_draw', payload);
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

		drawLine(last.x, last.y, pos.x, pos.y, brush.color, brush.size);
		emitLine(last.x, last.y, pos.x, pos.y, pos.w, pos.h);
		last = { x: pos.x, y: pos.y };
	});

	canvasEl.addEventListener('pointerdown', (evt) => {
		if (!canDraw) return;
		isDrawing = true;
		const pos = pointerPos(evt);
		last = { x: pos.x, y: pos.y };

		drawLine(pos.x, pos.y, pos.x + 0.01, pos.y + 0.01, brush.color, brush.size);
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

	socket.on('canvas_clear', () => {
		clearCanvas(true);
	});

	socket.on('canvas_color', (payload: ColorPayload) => {
		setCursorColor(payload.color);
		if (canDraw) {
			setActiveSwatch(payload.color);
		}
	});

	socket.on('drawing_started', (data: { drawerId: string }) => {
		canDraw = data.drawerId === socket.id;
		setRoleUI();
		setBrushColor(DEFAULT_COLOR, canDraw);
		clearCanvas(true);
	});

	socket.on('game_started', () => {
		canDraw = false;
		setRoleUI();
		setBrushColor(DEFAULT_COLOR, false);
		clearCanvas(true);
	});

	socket.on('new_turn', () => {
		canDraw = false;
		setRoleUI();
		setBrushColor(DEFAULT_COLOR, false);
		clearCanvas(true);
	});

	resizeCanvas();
	setBrushColor(DEFAULT_COLOR, false);
	setRoleUI();
	window.addEventListener('resize', resizeCanvas);
}
