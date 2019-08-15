
export class EcgPainter {
    constructor(canvasId, ecgLoader, rowSize) {
        this.canvas = document.getElementById(canvasId);
        this.loader = ecgLoader;

        this.rowSize = rowSize;
        this.rows = 5;
        this.rowspace = 20;
        this.yscale = 100;
        this.ofs = 0;

        this.rowPos = 100;
        this.targetRowPos = this.rowPos;

        this.updating = false;
    }

    getRowSize() {
        return this.rowSize;
    }

    setRowSize(rowSize) {
        this.rowSize = rowSize;
    }

    getRowPos() {
        return this.targetRowPos;
    }

    setRowPos(rowPos) {
        this.targetRowPos = rowPos;
    }

    getYScale() {
        return this.yscale;
    }

    setYScale(yscale) {
        this.yscale = yscale;
    }

    getRowSpace() {
        return this.rowspace;
    }

    setRowSpace(rowspace) {
        this.rowspace = rowspace;
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

    draw2(data) {
        var canvas = this.canvas;
        var rowHeight = this.yscale + this.rowspace;
        var rowWidth = canvas.clientWidth;
        var w = new Array(rowWidth * (this.rows + 1));
        this.linearInterpolate(data, w);

        var ctx = canvas.getContext("2d");
        ctx.strokeStyle = 'blue';
        ctx.lineWidth = 1;
        ctx.fillStyle = '#eee';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        var y = this.ofs - rowHeight * (this.rowPos - Math.floor(this.rowPos + 0.00001));
        y = Math.round(y);

        for (let irow = 0; irow < this.rows + 1; irow++) {
            var rowStart = irow * rowWidth;
            ctx.beginPath();
            ctx.moveTo(0, y + this.yscale * w[rowStart]);
            for (let i = 1; i < rowWidth; i++) {
                ctx.lineTo(i, y + this.yscale * w[i + rowStart]);
            }
            ctx.stroke();

            y += rowHeight;
        }
    }

    update() {
        let that = this;
        let p0 = (Math.floor(this.rowPos + 0.00001) * this.rowSize);
        this.loader.getByPosition(p0, p0 + this.rowSize * (this.rows + 1), function (data) {
            that.draw2(data);
        });
    }

    scrollTo(target) {
        let maxRowsToScroll = this.rows;
        if(Math.abs(target - this.rowPos) > maxRowsToScroll) {
            this.rowPos = target - Math.sign(target - this.rowPos) * maxRowsToScroll;
        }

        this.targetRowPos = target;
        this.scrollUpdate();
    }

    scrollUpdate() {
        if (this.updating) {
            return;
        }
        else {
            this.updating = true;
        }

        let that = this;
        setTimeout(function () {
            that.updating = false;
            if (Math.abs(that.targetRowPos - that.rowPos) > 0.01) {
                that.rowPos += (that.targetRowPos - that.rowPos) * 0.05;
                that.update();
                that.scrollUpdate();
            }
            else {
                that.rowPos = that.targetRowPos;
                that.update();
            }
        });
    }

}