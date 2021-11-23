import { ensureNever } from '../../helpers/assertions';
import { isNumber } from '../../helpers/strict-type-checks';

import { AutoScaleMargins } from '../../model/autoscale-info-impl';
import { BarPrice, BarPrices } from '../../model/bar';
import { ChartModel } from '../../model/chart-model';
import { Coordinate } from '../../model/coordinate';
import { PriceScale } from '../../model/price-scale';
import { Series } from '../../model/series';
import { InternalSeriesTPOProfile, SeriesTPOProfile } from '../../model/series-tpos';
import { TimePointIndex, visibleTimedValues } from '../../model/time-data';
import { TimeScale } from '../../model/time-scale';
import { IPaneRenderer } from '../../renderers/ipane-renderer';
import {
	SeriesTPORendererData,
	SeriesTPORendererDataItem,
	SeriesTPOsRenderer,
} from '../../renderers/series-tpos-renderer';
import {
	calculateShapeHeight,
	shapeMargin as calculateShapeMargin,
} from '../../renderers/series-markers-utils';

import { IUpdatablePaneView, UpdateType } from './iupdatable-pane-view';

const enum Constants {
	TextMargin = 0.1,
}

interface Offsets {
	aboveBar: number;
	belowBar: number;
}

// eslint-disable-next-line max-params
function fillSizeAndY(
	rendererItem: SeriesTPORendererDataItem,
	tpo: SeriesTPOProfile<TimePointIndex>,
	seriesData: BarPrices | BarPrice,
	offsets: Offsets,
	textHeight: number,
	shapeMargin: number,
	priceScale: PriceScale,
	timeScale: TimeScale,
	firstValue: number
): void {
	const inBarPrice = isNumber(seriesData) ? seriesData : seriesData.close;
	const highPrice = isNumber(seriesData) ? seriesData : seriesData.high;
	const lowPrice = isNumber(seriesData) ? seriesData : seriesData.low;
	const sizeMultiplier = 1;
	const shapeSize = calculateShapeHeight(timeScale.barSpacing()) * sizeMultiplier;
	const halfSize = shapeSize / 2;

	switch (tpo.position) {
		case 'inBar': {
			rendererItem.y = priceScale.priceToCoordinate(inBarPrice, firstValue);
			if (rendererItem.text !== undefined) {
				rendererItem.text.y = rendererItem.y + halfSize + shapeMargin + textHeight * (0.5 + Constants.TextMargin) as Coordinate;
			}
			return;
		}
		case 'aboveBar': {
			rendererItem.y = (priceScale.priceToCoordinate(highPrice, firstValue) - halfSize - offsets.aboveBar) as Coordinate;
			if (rendererItem.text !== undefined) {
				rendererItem.text.y = rendererItem.y - halfSize - textHeight * (0.5 + Constants.TextMargin) as Coordinate;
				offsets.aboveBar += textHeight * (1 + 2 * Constants.TextMargin);
			}
			offsets.aboveBar += shapeSize + shapeMargin;
			return;
		}
		case 'belowBar': {
			rendererItem.y = (priceScale.priceToCoordinate(lowPrice, firstValue) + halfSize + offsets.belowBar) as Coordinate;
			if (rendererItem.text !== undefined) {
				rendererItem.text.y = rendererItem.y + halfSize + shapeMargin + textHeight * (0.5 + Constants.TextMargin) as Coordinate;
				offsets.belowBar += textHeight * (1 + 2 * Constants.TextMargin);
			}
			offsets.belowBar += shapeSize + shapeMargin;
			return;
		}
	}

	ensureNever(tpo.position);
}

export class SeriesTPOsPaneView implements IUpdatablePaneView {
	private readonly _series: Series;
	private readonly _model: ChartModel;
	private _data: SeriesTPORendererData;

	private _invalidated: boolean = true;
	private _dataInvalidated: boolean = true;
	private _autoScaleMarginsInvalidated: boolean = true;

	private _autoScaleMargins: AutoScaleMargins | null = null;

	private _renderer: SeriesTPOsRenderer = new SeriesTPOsRenderer();

	public constructor(series: Series, model: ChartModel) {
		this._series = series;
		this._model = model;
		this._data = {
			items: [],
			visibleRange: null,
		};
	}

	public update(updateType?: UpdateType): void {
		this._invalidated = true;
		this._autoScaleMarginsInvalidated = true;
		if (updateType === 'data') {
			this._dataInvalidated = true;
		}
	}

	public renderer(height: number, width: number, addAnchors?: boolean): IPaneRenderer | null {
		if (!this._series.visible()) {
			return null;
		}

		if (this._invalidated) {
			this._makeValid();
		}

		const layout = this._model.options().layout;
		this._renderer.setParams(layout.fontSize, layout.fontFamily);
		this._renderer.setData(this._data);

		return this._renderer;
	}

	public autoScaleMargins(): AutoScaleMargins | null {
		if (this._autoScaleMarginsInvalidated) {
			if (this._series.indexedTPOs().length > 0) {
				const barSpacing = this._model.timeScale().barSpacing();
				const shapeMargin = calculateShapeMargin(barSpacing);
				const marginsAboveAndBelow = calculateShapeHeight(barSpacing) * 1.5 + shapeMargin * 2;
				this._autoScaleMargins = {
					above: marginsAboveAndBelow as Coordinate,
					below: marginsAboveAndBelow as Coordinate,
				};
			} else {
				this._autoScaleMargins = null;
			}

			this._autoScaleMarginsInvalidated = false;
		}

		return this._autoScaleMargins;
	}

	protected _makeValid(): void {
		const priceScale = this._series.priceScale();
		const timeScale = this._model.timeScale();
		const seriesTPOs = this._series.indexedTPOs();
		if (this._dataInvalidated) {
			this._data.items = seriesTPOs.map<SeriesTPORendererDataItem>((tpo: InternalSeriesTPOProfile<TimePointIndex>) => ({
				time: tpo.time,
				x: 0 as Coordinate,
				y: 0 as Coordinate,
				internalId: tpo.internalId,
				externalId: tpo.id,
				text: undefined,
			}));
			this._dataInvalidated = false;
		}

		const layoutOptions = this._model.options().layout;

		this._data.visibleRange = null;
		const visibleBars = timeScale.visibleStrictRange();
		if (visibleBars === null) {
			return;
		}

		const firstValue = this._series.firstValue();
		if (firstValue === null) {
			return;
		}
		if (this._data.items.length === 0) {
			return;
		}
		let prevTimeIndex = NaN;
		const shapeMargin = calculateShapeMargin(timeScale.barSpacing());
		const offsets: Offsets = {
			aboveBar: shapeMargin,
			belowBar: shapeMargin,
		};
		this._data.visibleRange = visibleTimedValues(this._data.items, visibleBars, true);
		for (let index = this._data.visibleRange.from; index < this._data.visibleRange.to; index++) {
			const tpo = seriesTPOs[index];
			if (tpo.time !== prevTimeIndex) {
				// new bar, reset stack counter
				offsets.aboveBar = shapeMargin;
				offsets.belowBar = shapeMargin;
				prevTimeIndex = tpo.time;
			}

			const rendererItem = this._data.items[index];
			rendererItem.x = timeScale.indexToCoordinate(tpo.time);
			if (tpo.text !== undefined && tpo.text.length > 0) {
				rendererItem.text = {
					content: tpo.text,
					y: 0 as Coordinate,
					width: 0,
					height: 0,
				};
			}
			const dataAt = this._series.dataAt(tpo.time);
			if (dataAt === null) {
				continue;
			}
			fillSizeAndY(rendererItem, tpo, dataAt, offsets, layoutOptions.fontSize, shapeMargin, priceScale, timeScale, firstValue.value);
		}
		this._invalidated = false;
	}
}
