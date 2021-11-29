import { AutoScaleMargins } from '../../model/autoscale-info-impl';
import { ChartModel } from '../../model/chart-model';
import { Coordinate } from '../../model/coordinate';
import { Series } from '../../model/series';
import { InternalSeriesTPOProfile } from '../../model/series-tpos';
import { TimePointIndex, visibleTimedValues } from '../../model/time-data';
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

interface Offsets {
	aboveBar: number;
	belowBar: number;
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
				texts: []
			}));
			this._dataInvalidated = false;
		}

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
			const profile = seriesTPOs[index];
			if (profile.time !== prevTimeIndex) {
				// new bar, reset stack counter
				offsets.aboveBar = shapeMargin;
				offsets.belowBar = shapeMargin;
				prevTimeIndex = profile.time;
			}

			const rendererItem = this._data.items[index];
			rendererItem.texts = [];
			profile.periods.forEach(period => {
				period.tpos.forEach(tpo => {
					if (tpo.column !== undefined && period.letter !== undefined && period.letter.length > 0) {
						rendererItem.texts.push({
							content: period.letter as string,
							x: timeScale.indexToCoordinate(profile.time) + (tpo.column * 10) as Coordinate,
							y: priceScale.priceToCoordinate(tpo.price, firstValue.value) as Coordinate,
							width: 0,
							height: 0,
						});
					}
				});
			})
		}
		this._invalidated = false;
	}
}
