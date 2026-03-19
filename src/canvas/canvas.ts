import { socket } from '../utils/socket.ts';

type DrawPayload = {
	x0: number;
	y0: number;
	x1: number;
	y1: number;
	color: string;
	size: number;
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

	if (!canvas || !canvasArea || !cursor || !clearBtn || !roleLabel) return;

	const ctx = canvas.getContext('2d');
	if (!ctx) return;

	let canDraw = true;
	let isDrawing = false;
	let last = { x: 0, y: 0 };

	const brush = {
		color: DEFAULT_COLOR,
		size: DEFAULT_SIZE,
	};

	function setRoleUI() {
		roleLabel.textContent = canDraw ? 'Tu dessines (crayon noir)' : 'Tu devines';
		clearBtn.disabled = !canDraw;
	}

	function resizeCanvas() {
		const rect = canvasArea.getBoundingClientRect();
		const ratio = window.devicePixelRatio || 1;

		const prev = document.createElement('canvas');
		prev.width = canvas.width;
		prev.height = canvas.height;
		const prevCtx = prev.getContext('2d');
		if (prevCtx) {
			prevCtx.drawImage(canvas, 0, 0);
		}

		canvas.width = Math.floor(rect.width * ratio);
		canvas.height = Math.floor(rect.height * ratio);

		ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';

		if (prev.width > 0 && prev.height > 0) {
			ctx.drawImage(prev, 0, 0, prev.width, prev.height, 0, 0, rect.width, rect.height);
		}
	}

	function pointerPos(evt: PointerEvent) {
		const rect = canvas.getBoundingClientRect();
		return {
			x: evt.clientX - rect.left,
			y: evt.clientY - rect.top,
			w: rect.width,
			h: rect.height,
		};
	}

	function drawLine(x0: number, y0: number, x1: number, y1: number, color: string, size: number) {
		ctx.strokeStyle = color;
		ctx.lineWidth = size;
		ctx.beginPath();
		ctx.moveTo(x0, y0);
		ctx.lineTo(x1, y1);
		ctx.stroke();
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
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		if (!localOnly) {
			socket.emit('canvas_clear');
		}
	}

	canvas.addEventListener('pointerenter', () => {
		cursor.style.opacity = '1';
	});

	canvas.addEventListener('pointerleave', () => {
		cursor.style.opacity = '0';
		isDrawing = false;
	});

	canvas.addEventListener('pointermove', (evt) => {
		const pos = pointerPos(evt);
		cursor.style.left = `${pos.x}px`;
		cursor.style.top = `${pos.y}px`;

		if (!isDrawing || !canDraw) return;

		drawLine(last.x, last.y, pos.x, pos.y, brush.color, brush.size);
		emitLine(last.x, last.y, pos.x, pos.y, pos.w, pos.h);
		last = { x: pos.x, y: pos.y };
	});

	canvas.addEventListener('pointerdown', (evt) => {
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

	clearBtn.addEventListener('click', () => {
		if (!canDraw) return;
		clearCanvas(false);
	});

	socket.on('canvas_draw', (payload: DrawPayload) => {
		const rect = canvas.getBoundingClientRect();
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

	socket.on('drawing_started', (data: { drawerId: string }) => {
		canDraw = data.drawerId === socket.id;
		setRoleUI();
		clearCanvas(true);
	});

	socket.on('game_started', () => {
		canDraw = false;
		setRoleUI();
		clearCanvas(true);
	});

	resizeCanvas();
	setRoleUI();
	window.addEventListener('resize', resizeCanvas);
}
