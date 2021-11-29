import { BarPrice } from './bar';

export interface SeriesTPO {
	/**
	 * Price.
	 */
	price: BarPrice;
	/**
	 * Profile column index (zero-based).
	 */
	column?: number;
}

export interface SeriesTPOPeriod {
	/**
	 * TPOs in this period.
	 */
	tpos: SeriesTPO[];
	/**
	 * Letter to display.
	 */
	letter?: string;
}

 export interface SeriesTPOProfile<TimeType> {
	/**
	 * Time of the TPO profile.
	 */
	time: TimeType;
	/**
	 * Periods in the TPO profile.
	 */
	periods: SeriesTPOPeriod[];
	/**
	 * ID of the TPO profile.
	 */
	id?: string;
}

export interface InternalSeriesTPOProfile<TimeType> extends SeriesTPOProfile<TimeType> {
	/**
	 * Internal id.
	 */
	internalId: number;
}
