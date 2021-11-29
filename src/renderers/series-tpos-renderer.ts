import { makeFont } from '../helpers/make-font';

import { HoveredObject } from '../model/chart-model';
import { Coordinate } from '../model/coordinate';
import { TextWidthCache } from '../model/text-width-cache';
import { SeriesItemsIndexesRange, TimedValue } from '../model/time-data';

import { ScaledRenderer } from './scaled-renderer';
import { drawText, hitTestText } from './series-tpos-text';

export interface SeriesTPOText {
	content: string;
	x: Coordinate;
	y: Coordinate;
	width: number;
	height: number;
}

export interface SeriesTPORendererDataItem extends TimedValue {
	y: Coordinate;
	internalId: number;
	externalId?: string;
	texts: SeriesTPOText[];
}

export interface SeriesTPORendererData {
	items: SeriesTPORendererDataItem[];
	visibleRange: SeriesItemsIndexesRange | null;
}

export class SeriesTPOsRenderer extends ScaledRenderer {
	private _data: SeriesTPORendererData | null = null;
	private _textWidthCache: TextWidthCache = new TextWidthCache();
	private _fontSize: number = -1;
	private _fontFamily: string = '';
	private _font: string = '';

	public setData(data: SeriesTPORendererData): void {
		this._data = data;
	}

	public setParams(fontSize: number, fontFamily: string): void {
		if (this._fontSize !== fontSize || this._fontFamily !== fontFamily) {
			this._fontSize = fontSize;
			this._fontFamily = fontFamily;
			this._font = makeFont(fontSize, fontFamily);
			this._textWidthCache.reset();
		}
	}

	public hitTest(x: Coordinate, y: Coordinate): HoveredObject | null {
		if (this._data === null || this._data.visibleRange === null) {
			return null;
		}

		for (let i = this._data.visibleRange.from; i < this._data.visibleRange.to; i++) {
			const item = this._data.items[i];
			if (hitTestItem(item, x, y)) {
				return {
					hitTestData: item.internalId,
					externalId: item.externalId,
				};
			}
		}

		return null;
	}

	protected _drawImpl(ctx: CanvasRenderingContext2D, isHovered: boolean, hitTestData?: unknown): void {
		if (this._data === null || this._data.visibleRange === null) {
			return;
		}

		ctx.textBaseline = 'middle';
		ctx.font = this._font;

		for (let i = this._data.visibleRange.from; i < this._data.visibleRange.to; i++) {
			const item = this._data.items[i];
			item.texts.forEach(text => {
				text.width = this._textWidthCache.measureText(ctx, text.content);
				text.height = this._fontSize;
			});
			drawItem(item, ctx);
		}
	}
}

function drawItem(item: SeriesTPORendererDataItem, ctx: CanvasRenderingContext2D): void {
	item.texts.forEach(text => {
		drawText(ctx, text.content, text.x - text.width / 2, text.y);
	});
}

function hitTestItem(item: SeriesTPORendererDataItem, x: Coordinate, y: Coordinate): boolean {
	return item.texts.some(text => {
		return hitTestText(text.x, text.y, text.width, text.height, x, y);
	});
}