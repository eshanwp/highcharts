// ==ClosureCompiler==
// @compilation_level SIMPLE_OPTIMIZATIONS

/**
 * @license Highstock Extend for QuantDesk
 *
 * (c) 2014 Lucena Research
 *
 */

/*  
 * 
 *  in highstock.src.js file:
 *  in specificOptions = {...} insert:
    linewithcone: {
            approximation: 'conerange'
    }
 *  *********************************************************
 *  *********************************************************
 *  in approximations = {...} insert
    conerange: function(mid, low, high) {
            mid = approximations.open(mid);
            low = approximations.open(low);
            high = approximations.open(high);
            if (typeof mid === NUMBER || typeof high === NUMBER || typeof low === NUMBER) {
                return [low, mid, high];
            }
    }
*/



(function (Highcharts, UNDEFINED) {
var arrayMin = Highcharts.arrayMin,
	arrayMax = Highcharts.arrayMax,
	each = Highcharts.each,
	extend = Highcharts.extend,
	merge = Highcharts.merge,
	map = Highcharts.map,
	pick = Highcharts.pick,
	pInt = Highcharts.pInt,
	defaultPlotOptions = Highcharts.getOptions().plotOptions,
	seriesTypes = Highcharts.seriesTypes,
	extendClass = Highcharts.extendClass,
	splat = Highcharts.splat,
	wrap = Highcharts.wrap,
	Axis = Highcharts.Axis,
	Tick = Highcharts.Tick,
	Point = Highcharts.Point,
	Pointer = Highcharts.Pointer,
	CenteredSeriesMixin = Highcharts.CenteredSeriesMixin,
	TrackerMixin = Highcharts.TrackerMixin,
	Series = Highcharts.Series,
	math = Math,
	mathRound = math.round,
	mathFloor = math.floor,
	mathMax = math.max,
	Color = Highcharts.Color,
	noop = function () {};
        
        
        
/*
 * The LineWithCone
 *
 */
defaultPlotOptions.linewithcone = merge(defaultPlotOptions.area, {
    lineWidth: 1,
	marker: null,
	threshold: null,

	trackByArea: true,
	dataLabels: {
		verticalAlign: null,
		xLow: 0,
		xHigh: 0,
		yLow: 0,
		yHigh: 0
	},
	shadow: false
});

var ConePoint = Highcharts.extendClass(Highcharts.Point, {
    /**
	 * Apply the options containing the x and low/high data and possible some extra properties.
	 * This is called on point init or from point.update. Extends base Point by adding
	 * multiple y-like values.
	 *
	 * @param {Object} options
	 */
	applyOptions: function (options, x) {

		var point = this,
			series = point.series,
			pointArrayMap = series.pointArrayMap,
			i = 0,
			j = 0,
			valueCount = pointArrayMap.length;


		// object input
		if (typeof options === 'object' && typeof options.length !== 'number') {

			// copy options directly to point
			extend(point, options);

			point.options = options;

		} else if (options.length) { // array
			// with leading x value
			if (options.length > valueCount) {
				if (typeof options[0] === 'string') {
					point.name = options[0];
				} else if (typeof options[0] === 'number') {
					point.x = options[0];
				}
				i++;
			}
			while (j < valueCount) {
				point[pointArrayMap[j++]] = options[i++];
			}
		}

		// Handle null and make low alias y
		/*if (point.high === null) {
			point.low = null;
		}*/
		point.y = point[series.pointValKey];

		// If no x is set by now, get auto incremented value. All points must have an
		// x value, however the y value can be null to create a gap in the series
		if (point.x === UNDEFINED && series) {
			point.x = x === UNDEFINED ? series.autoIncrement() : x;
		}

		return point;
	},

	/**
	 * Return a plain array for speedy calculation
	 */
	toYData: function () {
		return [this.middle, this.lower, this.higher];
	}
});

seriesTypes.linewithcone = Highcharts.extendClass(seriesTypes.area, {
	type: 'linewithcone',
	pointArrayMap: ['middle', 'lower', 'higher'],
	pointClass: ConePoint,
	pointValKey: 'middle',

	/**
	 * Translate data points from raw values x and y to plotX and plotY
	 */
	translate: function () {
		var series = this,
			yAxis = series.yAxis;

		seriesTypes.area.prototype.translate.apply(series);

		// Set plotLow and plotHigh
		each(series.points, function (point) {
			if (point.y !== null) {
				point.plotLow = Math.round(yAxis.translate(point.lower, 0, 1, 0, 1) * 10) / 10;                
				point.plotMid = point.plotY;
				point.plotHigh = Math.round(yAxis.translate(point.higher, 0, 1, 0, 1) * 10) / 10;

			}
		});
	},

	/**
	 * Extend the line series' getSegmentPath method by applying the segment
	 * path to both lower and higher values of the range
	 */
	getSegmentPath: function (segment) {

		var highSegment = [],
            lowSegment = [],
			i = segment.length,
			baseGetSegmentPath = Series.prototype.getSegmentPath,
			point,
			linePath,
			lowerPath,
            midPath,
			higherPath;

		// Make a segment with plotX and plotY for the top values
		while (i--) {
			point = segment[i];			
            lowSegment.push({
                plotX: point.plotX,
                plotY: point.plotLow
            });
			highSegment.push({
				plotX: point.plotX,
				plotY: point.plotHigh
			});
		}

		// Get the paths		
		lowerPath = baseGetSegmentPath.call(this, lowSegment);
		midPath = baseGetSegmentPath.call(this, segment);
		higherPath = baseGetSegmentPath.call(this, highSegment);

		// Create a line on both top and bottom of the range
		linePath = [].concat(lowerPath, midPath, higherPath);
		// For the area path, we need to change the 'move' statement into 'lineTo' or 'curveTo'
        lowerPath[0] = 'L';
		higherPath[0] = 'L';
		this.areaPath = [].concat(midPath, lowerPath, midPath, higherPath);
		return linePath;
	},

	/**
	 * Extend the basic drawDataLabels method by running it for both lower and higher
	 * values.
	 */
	drawDataLabels: function () {

		var data = this.data,
			length = data.length,
			i,
			originalDataLabels = [],
			seriesProto = Series.prototype,
			dataLabelOptions = this.options.dataLabels,
			point,
			inverted = this.chart.inverted;

		if (dataLabelOptions.enabled || this._hasPointLabels) {

			// Step 1: set preliminary values for plotY and dataLabel and draw the upper labels
			i = length;
			while (i--) {
				point = data[i];

				// Set preliminary values
				point.y = point.high;
				point.plotY = point.plotHigh;

				// Store original data labels and set preliminary label objects to be picked up
				// in the uber method
				originalDataLabels[i] = point.dataLabel;
				point.dataLabel = point.dataLabelUpper;

				// Set the default offset
				point.below = false;
				if (inverted) {
					dataLabelOptions.align = 'left';
					dataLabelOptions.x = dataLabelOptions.xHigh;
				} else {
					dataLabelOptions.y = dataLabelOptions.yHigh;
				}
			}
			seriesProto.drawDataLabels.apply(this, arguments); // #1209

			// Step 2: reorganize and handle data labels for the lower values
			i = length;
			while (i--) {
				point = data[i];

				// Move the generated labels from step 1, and reassign the original data labels
				point.dataLabelUpper = point.dataLabel;
				point.dataLabel = originalDataLabels[i];

				// Reset values
				point.y = point.low;
				point.plotY = point.plotLow;

				// Set the default offset
				point.below = true;
				if (inverted) {
					dataLabelOptions.align = 'right';
					dataLabelOptions.x = dataLabelOptions.xLow;
				} else {
					dataLabelOptions.y = dataLabelOptions.yLow;
				}
			}
			seriesProto.drawDataLabels.apply(this, arguments);
		}

	},

	alignDataLabel: seriesTypes.column.prototype.alignDataLabel,

	getSymbol: seriesTypes.column.prototype.getSymbol,

	drawPoints: noop
});

}(Highcharts));

