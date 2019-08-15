
export class QrsRenderer {
    constructor(width, height) {
        this.nWidth = width;
        this.nHeight = height;
        this.canvas = document.createElement('canvas');
        this.canvas.width = width;
        this.canvas.height = height;
        this.ctx = this.canvas.getContext("2d");
    }

    signalRange(beats) {
        let min = 1000000; // Math.MAX_VALUE;
        let max = -1000000; // Math.MIN_VALUE;

        for (let i = 0; i < beats.length; i++) {
            let samples = beats[i].data;
            for (let j = 0; j < samples.length; j++) {
                let v = samples[j];

                if (v >= QrsRenderer.MIN_SIGNAL && v < min) {
                    min = v;
                }

                else if (v <= QrsRenderer.MAX_SIGNAL && v > max) {
                    max = v;
                }
            }
        }

        return {
            min: min,
            max: max
        };
    }

    countToColors(grids, buf) {
        for (let i = 0; i < grids.length; i++) {
            let count = grids[i];
            let ic = i * 4;
            let color = [];

            if (count == 0) {
                color = QrsRenderer.COLOR_BLACK;
            }
            else if (count < 10) {
                color = QrsRenderer.COLOR_LOW;
            }
            else if (count < 200) {
                color = QrsRenderer.COLOR_MID;
            }
            else {
                color = QrsRenderer.COLOR_HIGH;
            }

            buf[ic + 0] = color[0];
            buf[ic + 1] = color[1];
            buf[ic + 2] = color[2];
            buf[ic + 3] = color[3];
        }
    }

    linearInterpolate(src, dst) {
        let nSrc = src.length;
        let nDst = dst.length;
        let rate = (nSrc - 1) / nDst;

        for (let i = 0; i < dst.length; i++) {
            let fSrc = i * rate;
            let iSrc = Math.floor(fSrc);
            let r = fSrc - iSrc;

            dst[i] = src[iSrc] * (1 - r) + src[iSrc + 1] * r;
        }
    }

    render(beats) {
        // 获取Y轴取值范围，用于缩放Y轴比例
        let yrange = this.signalRange(beats);

        let ymin = yrange.min;
        let ymax = yrange.max;
        let epsilon = 0.00001;
        let ys = ymax - ymin + epsilon;

        let nBeats = beats.length;
        let nBeatSize = nBeats===0?0:beats[0].data.length;
        let nSamples = nBeats * nBeatSize;
        let floatSize = Float32Array.BYTES_PER_ELEMENT;
        let pBeats = Module._malloc(nSamples * floatSize);
        let beatsArr = Module.HEAPF32.subarray(pBeats / floatSize, pBeats / floatSize + nSamples);

        // 心博波形数据拷贝到连续的heap空间，c代码通过指针访问
        for (let i = 0; i < beats.length; i++) {
            let beat = beats[i].data;
            
            for (let j = 0; j < nBeatSize; j++) {
                let v = beat[j];
                beatsArr[i * nBeatSize + j] = v;
            }
        }

        let nGrids = this.nWidth * this.nHeight;
        let pGrids = Module._malloc(floatSize * nGrids);
        let gridsArr = Module.HEAP32.subarray(pGrids / floatSize, pGrids / floatSize + nGrids);
        // 清零
        gridsArr.fill(0);

        // let t0 = new Date().getTime();
        Module._accumulate(pBeats, pGrids, nBeats, nBeatSize, this.nWidth, this.nHeight, ymin, ymax);
        // let t1 = new Date().getTime();
        // console.log("_accumulate()耗时：" + (t1 - t0) + "ms");

        let imageData = this.ctx.createImageData(this.nWidth, this.nHeight);

        // 累加数量映射到位图颜色
        this.countToColors(gridsArr, imageData.data);

        Module._free(pGrids);
        Module._free(pBeats);
        
        this.ctx.putImageData(imageData, 0, 0);
        let url = this.canvas.toDataURL();

        return url;
    }

    _select(beats, p0, p1, v0, v1) {
        let r = [];

        // 遍历所有心拍
        for (let i = 0; i < beats.length; i++) {
            let samples = beats[i].data;

            for (let x = p0; x < p1; x++) {
                if (samples[x] >= v0 && samples[x] <= v1) {
                    r.push(beats[i].pos);
                    break;
                }
            }
        }

        return r;
    }

    select(beats, x0, x1, y0, y1) {
        if (beats.length == 0) {
            return [];
        }

        if (x0 > x1) {
            let t = x0;
            x0 = x1;
            x1 = t;
        }

        if (y0 > y1) {
            let t = y0;
            y0 = y1;
            y1 = t;
        }

        let width = beats[0].data.length;
        let p0 = Math.floor(width * x0);
        let p1 = Math.floor(width * x1);

        // 获取Y轴取值范围，用于缩放Y轴比例
        let yrange = this.signalRange(beats);
        let height = yrange.max - yrange.min;
        let v0 = yrange.min + height * (1 - y1);
        let v1 = yrange.min + height * (1 - y0);

        return this._select(beats, p0, p1, v0, v1);
    }
}

QrsRenderer.COLOR_BLACK = [0x00, 0x00, 0x00, 0xff];
QrsRenderer.COLOR_LOW = [0x00, 0xff, 0x00, 0xff];
QrsRenderer.COLOR_MID = [0xff, 0x77, 0x00, 0xff];
QrsRenderer.COLOR_HIGH = [0xff, 0x00, 0x00, 0xff];

QrsRenderer.MIN_SIGNAL = -0.2;
QrsRenderer.MAX_SIGNAL = 0.2;