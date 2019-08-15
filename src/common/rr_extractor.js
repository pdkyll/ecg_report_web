class Beat {
    constructor(pos, type) {
        this.p = pos;
        this.t = type;
    }
}

class Segment {
    constructor(p0, p1) {
        this.begin = p0;
        this.end = p1;
    }
}

/**
 * 计算平均值的窗口的二分之一大小
 * 实际窗口长度 = MeanHalfSize * 2 + 1
 */
const MeanHalfSize = 150;

/**
 * 差异度变换到相似度乘以的系数
 */
const SimCoeff = 7;

class RRExtractor {

    /**
     *
     * @param {number} frequency
     * @param {Beat[]} beats
     * @param {string} startTime
     * @param {number} maxColumnCount
     */
    constructor(frequency, beats, startTime, maxColumnCount) {
        this.freq = frequency;
        this.maxRRInterval = 30 * frequency;
        this.beats = beats;
        this.startTime = new Date(startTime);
        this.maxColumnCount = maxColumnCount;
        this.segments = [];
        this.sims = [];
        if (beats.length < MeanHalfSize * 2 + 1) {
            return;
        }

        this.split(beats);
    }

    /**
     * 计算相似度
     */
    calcSimilarities() {
        var drrs = [];
        var sims = [];

        for (var i = 0; i < this.segments.length; i++) {
            var begin = this.segments[i].begin;
            var end = this.segments[i].end;

            if (end - begin < MeanHalfSize * 2 + 1) {
                // todo:
                continue;
            }

            // 计算归一化的RR间期变化
            this.normalizedRRDifference(drrs, this.beats, begin, end);

            // 计算均值
            this.mean(sims, drrs, MeanHalfSize, begin, end);

            // 转换
            this.convert(sims, begin, end);
        }

        this.sims = sims;
    }

    /**
     * 获取相似度
     * 返回: 一维数组，元素是相似度数字，个数与节拍个数相等
     */
    getSimilarities() {
        return this.sims;
    }

    /**
     * 获取相似度
     * 返回: 二维数组，第二维是[时间对象，相似读数字]，个数与节拍个数相等
     */
    getSimilaritiesWithTime() {
        var r = Array(this.sims.length);

        for (var i = 0; i < this.sims.length; i++) {
            if (this.sims[i] == null) {
                r[i] = null;
                continue;
            }

            var d = new Date(this.startTime);
            d.setSeconds(d.getSeconds() + Math.floor(this.beats[i].p / this.freq));

            r[i] = [
                d.getTime(),
                this.sims[i]
            ];
        }

        return r;
    }

    getSimilaritiesNoNull() {
        return this.sims.filter(elm => elm);
    }

    getTimeSeriesNoNull() {
        var r = [];

        for (var i = 0; i < this.sims.length; i++) {
            if (!this.sims[i]) {
                continue;
            }

            var d = new Date(this.startTime);
            d.setSeconds(d.getSeconds() + Math.floor(this.beats[i].p / this.freq));

            r.push(d.getTime());
        }

        return r;
    }

    /**
     * 获取数据分段的各端点，元素是在beats数组中的索引
     * 返回：一维数组，元素为断点下一个节拍的索引
     */
    getEndpoints() {
        return this.segments;
    }

    /**
     * 计算相似度在输入以下的片段
     * threshold: 相识度阈值
     * 返回：一维数组，元素是Segment对象
     */
    below(threshold) {
        var r = [];

        if (this.segments.length == 0) {
            return [];
        }

        for (var i = 0; i < this.segments.length; i++) {
            var begin = this.segments[i].begin;
            var end = this.segments[i].end;

            var segmentBegin = null;

            for (var p = begin; p < end; p++) {
                var sim = this.sims[p];

                if (segmentBegin == null) {
                    if (sim <= threshold) {
                        segmentBegin = p;
                    }
                }
                else {
                    if (sim > threshold) {
                        r.push(new Segment(segmentBegin, p));
                        segmentBegin = null;
                    }
                }
            }

            if (segmentBegin != null) {
                r.push(new Segment(segmentBegin, end));
                segmentBegin = null;
            }
        }

        return r;
    }

    /**
     * 计算相似度在输入以下的片段
     * threshold: 相识度阈值
     * 返回：二维数组，第二维是[开始时间，结束时间]
     */
    belowWithTime(threshold) {
        var segments = this.below(threshold);
        var r = new Array(segments.length);
        for (var i = 0; i < segments.length; i++) {
            var beginPos = this.beats[segments[i].begin].p;
            var beginTime = new Date(this.startTime);
            beginTime.setSeconds(beginTime.getSeconds() + beginPos / this.freq);

            var endPos = this.beats[segments[i].end - 1].p;
            var endTime = new Date(this.startTime);
            endTime.setSeconds(endTime.getSeconds() + endPos / this.freq);

            r[i] = [
                beginTime,
                endTime
            ];
        }

        return r;
    }

    /**
     * 统计RR分布, 每一行是一个5分钟统计
     * xsec: X轴统计周期，秒，按5分钟统计就是 5 * 60
     * yms: Y轴统计区间，毫秒
     * ymin: 最小RR，小于该值的计数被累加到该行第一个元素
     * ymax: 最大RR，大于该值的计数被累加到该行最后一个元素
     * @return Array<Array<int>>
     */
    distributions(xsec, yms, ymin, ymax) {
        var rrs = [];
        var distr = [];

        for (var i = 0; i < this.segments.length; i++) {
            var begin = this.segments[i].begin;
            var end = this.segments[i].end;

            this.rrMS(rrs, this.beats, begin, end, ymin, ymax);
        }

        var xn = 0;
        for (var i = this.beats.length - 1; i >= 0; --i) {
            if (this.beats[i].p != -1) {
                xn = Math.min(this.maxColumnCount, Math.floor((this.beats[i].p + this.freq * xsec - 1) / this.freq / xsec));
                break;
            }
        }
        if (xn == 0) {
            return [];
        }
        var yn = Math.floor((ymax - ymin + yms - 1) / yms);

        for (var x = 0; x < xn; x++) {
            distr[x] = Array(yn).fill(0);
        }

        for (var i = 0; i < rrs.length; i++) {
            if (this.beats[i].p < 0) {
                continue;
            }

            var rr = rrs[i];

            if (rr < ymin) {
                rr = ymin;
            }

            if (rr > ymax) {
                rr = ymax;
            }

            var x = Math.floor(this.beats[i].p / this.freq / xsec);
            var y = Math.floor(rr / yms);

            if (x >= distr.length) {
                console.debug(x);
            }
            if (distr[x]) {
                distr[x][y]++;
            }
        }

        return distr;
    }

    /** 统计RR分布，按比例输出
     * 每一行是一个5分钟统计, 结果的每个cell是该cell的节拍个数／该行所有cell的节拍总数
     * xsec: X轴统计周期，秒，按5分钟统计就是 5 * 60
     * yms: Y轴统计区间，毫秒
     * ymin: 最小RR，小于该值的计数被累加到该行第一个元素
     * ymax: 最大RR，大于该值的计数被累加到该行最后一个元素
     */
    distributionsRatio(xsec, yms, ymin, ymax) {
        var distr = this.distributions(xsec, yms, ymin, ymax);

        for (var x = 0; x < distr.length; x++) {
            var sum = distr[x].reduce((sum, elm) => {
                return sum + elm;
            });

            distr[x] = distr[x].map(a => a / sum);
        }

        return distr;
    }

    /** 统计RR分布，按比例输出
     * 每一行是一个5分钟统计, 结果的每个cell是该cell的节拍个数／max(该行的各cell的节拍个数)
     * xsec: X轴统计周期，秒，按5分钟统计就是 5 * 60
     * yms: Y轴统计区间，毫秒
     * ymin: 最小RR，小于该值的计数被累加到该行第一个元素
     * ymax: 最大RR，大于该值的计数被累加到该行最后一个元素
     */
    distributionsRatioByMax(xsec, yms, ymin, ymax) {
        var distr = this.distributions(xsec, yms, ymin, ymax);

        for (var x = 0; x < distr.length; x++) {
            var max = distr[x].reduce((max, elm) => {
                return elm > max ? elm : max;
            });

            distr[x] = distr[x].map(a => a / max);
        }

        return distr;
    }

    split(beats) {
        var ss = [];
        var cur = null;

        for (var i = 0; i < beats.length; i++) {
            if (cur == null) {
                if (beats[i].p < 0) {
                    continue;
                }
                else {
                    cur = new Segment(i, i + 1);
                }
            }
            else {
                if (beats[i].p >= 0 && beats[i].p - beats[i - 1].p < this.maxRRInterval) {
                    continue;
                }

                if (i - cur.begin > 3) {
                    cur.end = i;
                    ss.push(cur);
                }

                cur = null;
            }
        }

        if (cur != null) {
            cur.end = beats.length;
            ss.push(cur);
            cur = null;
        }

        this.segments = ss;
    }

    normalizedRRDifference(drrs, beats, begin, end) {
        let minDrr = 0.03;
        let maxDrr = 0.3
        for (var p = begin + 1; p < end - 1; p++) {
            var rr1 = beats[p + 1].p - beats[p].p;
            var rr0 = beats[p].p - beats[p - 1].p;
            let tempDrr = Math.abs((rr1 - rr0) / (rr1 + rr0));
            drrs[p] = tempDrr - minDrr < 0 ? 0 : tempDrr;
            drrs[p] = tempDrr > maxDrr ? 0 : tempDrr;
        }

        drrs[begin] = drrs[begin + 1];
        drrs[end - 1] = drrs[end - 2];
        return drrs;
    }

    mean(mdrrs, drrs, hsize, begin, end) {
        var sum = 0;

        var size = hsize * 2 + 1;

        // 数据长度不够窗口大小时， 缩小窗口
        if (end - begin < size) {
            hsize = (end - begin - 1) / 2;
            size = hsize * 2 + 1;
        }

        // 初始和
        for (var i = begin; i < begin + size; i++) {
            sum += drrs[i];
        }

        // 中间段
        for (var i = begin; i < end - size + 1; i++) {
            mdrrs[i + hsize] = sum / size;

            sum -= drrs[i];
            sum += drrs[i + size];
        }

        // 计算两端
        for (var i = 0; i < hsize; i++) {
            mdrrs[begin + i] = mdrrs[begin + hsize];
            mdrrs[end - 1 - i] = mdrrs[end - 2 - hsize];
        }

        return mdrrs;
    }

    convert(sims, begin, end) {
        for (var i = begin; i < end; i++) {
            sims[i] = (1 - sims[i] * SimCoeff) * 100.0;
        }
    }

    rrMS(drrs, beats, begin, end) {
        if (beats.length < 2 || beats.length < end - begin) {
            return [];
        }

        for (var p = begin + 1; p < end; p++) {
            var rr = beats[p].p - beats[p - 1].p;

            drrs[p] = Math.abs(Math.floor(1000 * rr / this.freq));
        }

        drrs[begin] = drrs[begin + 1];
        return drrs;
    }

}

export {RRExtractor};

/*
var freq = 100;
var beats = [];
var i = 0;
var p = 0;

beats.push(new Beat(-1, 0));

for (i = 0; i < 50; i++) {
    p += Math.floor(Math.random() * 2 * freq);
    beats.push(new Beat(p, 0));
}

beats.push(new Beat(-1, 0));

for (i = 0; i < 50; i++) {
    p += Math.floor(Math.random() * 2 * freq);
    beats.push(new Beat(p, 0));
}

beats.push(new Beat(-1, 0));

for (i = 0; i < 100; i++) {
    p += Math.floor(Math.random() * 2 * freq);
    beats.push(new Beat(p, 0));
}

p += 60 * freq;

for (i = 0; i < 100; i++) {
    p += Math.floor(Math.random() * 2 * freq);
    beats.push(new Beat(p, 0));
}

p += 60 * freq;

for (i = 0; i < 100; i++) {
    p += Math.floor(Math.random() * 2 * freq);
    beats.push(new Beat(p, 0));
}

var r = new RRExtractor(freq, beats, new Date().toString());

// 计算相似度
r.calcSimilarities();

// 获取数据分段
console.log(JSON.stringify(r.getEndpoints()));

// 获取相似度，返回一维数组，元素是相似度数字
console.log(JSON.stringify(r.getSimilarities()));

// 获取相似度，返回二维数组，第二维是[时间对象，相似读数字]
console.log(JSON.stringify(r.getSimilaritiesWithTime()));
console.log(JSON.stringify(r.getTimeSeriesNoNull()));

// 计算相似度在输入以下的片段，返回一维数组，元素是Segment对象
console.log(JSON.stringify(r.below(55)));

// 计算相似度在输入以下的片段，返回二维数组，第二维是[开始时间，结束时间]
console.log(JSON.stringify(r.belowWithTime(55)));

// 统计RR分布，返回二维数组，每一行是一个RR分布
console.log(JSON.stringify(r.distributions(60, 200, 0, 2000)));

// 统计RR分布，结果是落在某个RR区间的节拍个数／该时间段的节拍总数
console.log(JSON.stringify(r.distributionsRatio(60, 200, 0, 2000)));

console.log(JSON.stringify(r.distributionsRatioByMax(60, 200, 0, 2000)));

console.log("done");
*/