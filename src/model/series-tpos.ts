/**
 * Represents the position of a series TPO relative to a bar.
 */
export type SeriesTPOPosition = 'aboveBar' | 'belowBar' | 'inBar';

/**
 * Represents a series TPO.
 */
export interface SeriesTPO<TimeType> {
	/**
	 * The time of the TPO.
	 */
	time: TimeType;
	/**
	 * The position of the TPO.
	 */
	position: SeriesTPOPosition;
	/**
	 * The ID of the TPO.
	 */
	id?: string;
	/**
	 * The optional text of the TPO.
	 */
	text?: string;
}

export interface InternalSeriesTPO<TimeType> extends SeriesTPO<TimeType> {
	internalId: number;
}
