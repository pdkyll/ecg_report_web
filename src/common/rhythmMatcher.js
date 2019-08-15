class RhythmMatcher {

    constructor() {
        this.rhythms = [];
        this.fromTuples = [];
        this.toTuples = [];
    }

    setRhythms(rhythms) {
        this.rhythms = rhythms || [];
        this.fromTuples = this.rhythms
            .map(function(r, i) { return [r.begin, i]})
            .sort(function (tuple1, tuple2) { return tuple1[0] - tuple2[0]; });
        this.toTuples = this.rhythms
            .map(function(r, i) { return [r.end - 1, i]})
            .sort(function (tuple1, tuple2) { return tuple1[0] - tuple2[0]; });
    }

    find(position) {
        let fromTupleIndex = RhythmMatcher._binarySearch(this.fromTuples, position);
        if (fromTupleIndex < 0) {
            fromTupleIndex = -fromTupleIndex - 2;
            if (fromTupleIndex < 0) {
                return null;
            }
        }
        let toTupleIndex = RhythmMatcher._binarySearch(this.toTuples, position);
        if (toTupleIndex < 0) {
            toTupleIndex = -toTupleIndex - 1;
            if (toTupleIndex >= this.toTuples.length) {
                return null;
            }
        }

        let leftRhythm = this.rhythms[this.fromTuples[fromTupleIndex][1]];
        if (leftRhythm.end <= position) {
            leftRhythm = null;
        }
        let rightRhythm = this.rhythms[this.toTuples[toTupleIndex][1]];
        if (rightRhythm.begin > position) {
            rightRhythm = null;
        }

        if (leftRhythm && rightRhythm) {
            // console.log("Conflict between " + JSON.stringify(leftRhythm) + " and " + JSON.stringify(rightRhythm));
            return leftRhythm; //TODO: 谁更牛?
        }
        return leftRhythm ? leftRhythm : rightRhythm;
    }

    // Valid index of e, otherwise, return "-InsertionPoint - 1"
    static _binarySearch(tuples, position) {
        let low = 0;
        let high = tuples.length - 1;

        while (low <= high) {
            let mid = (low + high) >>> 1;
            let pos = tuples[mid][0];
            if (pos < position) {
                low = mid + 1;
            } else if (pos > position) {
                high = mid - 1;
            } else {
                return mid;
            }
        }
        return -(low + 1);
    }
}
export {RhythmMatcher}