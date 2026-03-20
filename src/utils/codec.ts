export type DrawLocal = {
	x0: number;
	y0: number;
	x1: number;
	y1: number;
	color: string;
	size: number;
};

export type FillLocal = {
	x: number;
	y: number;
	color: string;
};

export type ColorLocal = {
	color: string;
};

export type DrawNet = { a: number; b: number; c: number; d: number; e: string; f: number };
export type FillNet  = { x: number; y: number; c: string };
export type ColorNet = { c: string };

export function encodeDraw(p: DrawLocal): DrawNet {
	return {
		a: +p.x0.toFixed(3),
		b: +p.y0.toFixed(3),
		c: +p.x1.toFixed(3),
		d: +p.y1.toFixed(3),
		e: p.color,
		f: p.size,
	};
}

export function encodeFill(p: FillLocal): FillNet {
	return { x: +p.x.toFixed(3), y: +p.y.toFixed(3), c: p.color };
}

export function encodeColor(p: ColorLocal): ColorNet {
	return { c: p.color };
}

export function decodeDraw(p: DrawNet): DrawLocal {
	return { x0: p.a, y0: p.b, x1: p.c, y1: p.d, color: p.e, size: p.f };
}

export function decodeFill(p: FillNet): FillLocal {
	return { x: p.x, y: p.y, color: p.c };
}

export function decodeColor(p: ColorNet): ColorLocal {
	return { color: p.c };
}