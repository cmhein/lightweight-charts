/**
 * Represents the position of a series TPO relative to a bar.
 */
export type SeriesTPOPosition = 'aboveBar' | 'belowBar' | 'inBar';

/**
 * Represents a series TPO profile period.
 */
export interface SeriesTPOProfilePeriod {
	/**
	 * Price values of TPOs in the period.
	 */
	prices: Number[];
}

/**
 * Represents a series TPO profile.
 */
export interface SeriesTPOProfile<TimeType> {
	/**
	 * The time of the TPO profile.
	 */
	time: TimeType;
	/**
	 * The position of the TPO.
	 */
	position: SeriesTPOPosition;
	/**
	 * The periods of the TPO profile.
	 */
	periods: SeriesTPOProfilePeriod[];
	/**
	 * The text of the TPO.
	 */
	text: string;
	/**
	 * The ID of the TPO profile.
	 */
	id?: string;
}

export interface InternalSeriesTPOProfile<TimeType> extends SeriesTPOProfile<TimeType> {
	internalId: number;
}
