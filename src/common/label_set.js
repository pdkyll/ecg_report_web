class Label {
    constructor(type, p0, p1) {
        this.begin = p0;
        this.end = p1;
        this.type = type;
    }
}

class LabelSet {
    constructor() {
        this.labels = [];
        this.conflictState=false;
    }

    getLabels() {
        //对labels数组进行排序
        this.labels = this.labels.sort((a, b) => {
            return a.begin - b.begin
        });
        return this.labels;
    }

    overlaps(label) {
        var r = [];

        this.labels.forEach((elm, i) => {
            if (label.begin < elm.end && label.end > elm.begin) {
                r.push(elm);
            }
        });

        return r;
    }

    set(type, begin, end) {
        var label = new Label(type, begin, end);
        this.setLabel(label);
    }

    setLabels(labels) {
        for (var i = 0; i < labels.length; i++) {
            this.setLabel(labels[i]);
        }
    }

    setLabel(label) {
        var overlaps = this.overlaps(label);
        if (overlaps.length == 0) {
            this._addOne(label);
            return;
        }
        //注释不同类型的心律相交情况要报错的代码
        // for (let j = 0; j < overlaps.length; j++) {
        //     if (overlaps[j].type !== label.type) {
        //         this.conflictState=true;
        //         return;
        //     }
        // }
        this._removeMany(overlaps);
        var sameTypeLabels = overlaps.filter(a => a.type == label.type);
        label = this._union(sameTypeLabels, label);
        this._addOne(label);
        var diffTypeLabels = overlaps.filter(a => a.type != label.type);
        for (var i = 0; i < diffTypeLabels.length; i++) {
            var subs = this._subtract(diffTypeLabels[i], label);
            if (subs) {
                this._addMany(subs);
            }
        }
    }
    hasConflict(){
           return this.conflictState
    }
    erase(begin, end) {
        var label = new Label(null, begin, end);
        this.eraseLabel(label);
    }

    eraseLabel(label) {
        var overlaps = this.overlaps(label);
        if (overlaps.length == 0) {
            return;
        }
        this._removeMany(overlaps);
        for (var i = 0; i < overlaps.length; i++) {
            var subs = this._subtract(overlaps[i], label);
            if (subs) {
                this._addMany(subs);
            }
        }
    }

    eraseLabels(labels) {
        for (var i = 0; i < labels.length; i++) {
            this.erase(labels[i]);
        }
    }

    _addOne(label) {
        this.labels.push(label);
    }

    _addMany(labels) {
        for (var i = 0; i < labels.length; i++) {
            if (labels[i].begin >= labels[i].end) {
                continue;
            }
            this._addOne(labels[i]);
        }
    }

    _removeOne(label) {
        this.labels = this.labels.filter(a => a.begin != label.begin || a.end != label.end);
    }

    _removeMany(labels) {
        for (var i = 0; i < labels.length; i++) {
            this._removeOne(labels[i]);
        }
    }

    _union(a, b) {
        var min = b.begin;
        var max = b.end;

        for (var i = 0; i < a.length; i++) {
            min = Math.min(a[i].begin, min);
            max = Math.max(a[i].end, max);
        }

        return new Label(b.type, min, max);
    }

    _subtract(a, b) {
        // b与a左侧相交
        if (a.begin >= b.begin && a.begin < b.end) {
            return [new Label(a.type, b.end, a.end)];
        }

        // b与a右侧相交
        if (a.end >= b.begin && a.end < b.end) {
            return [new Label(a.type, a.begin, b.begin)];
        }

        // b在a内部
        if (a.begin < b.begin && a.end > b.end) {

            return [
                new Label(a.type, a.begin, b.begin),
                new Label(a.type, b.end, a.end)
            ];
        }

        // b在a外部
        if (a.begin >= b.begin && a.end <= b.end) {
            return [];
        }
        // 不相交
        return [a];
    }
}

export {LabelSet}
// var ls = new LabelSet();
// ls.set(1, 3, 5);
// ls.set(1, 7, 10);
// console.log(JSON.stringify(ls.getLabels()));
// ls.set(2, 3, 6);
// ls.set(1, 5, 7);
// ls.set(1, 4, 8);
// ls.set(1, 8, 9);
// ls.set(2, 4, 12);
// ls.set(2, 11, 12);
// ls.erase(3,5);
// ls.erase(3,4);
// ls.erase(4,9);
// ls.erase(4,12);
// ls.erase(1,12);
// console.log(ls.hasConflict());
// console.log(JSON.stringify(ls.getLabels()));

