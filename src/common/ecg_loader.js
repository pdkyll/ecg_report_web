
class Range {
    constructor(p0, p1) {
        this.begin = p0;
        this.end = p1;
    }
}

const BlockState = {
    DOWNLOADING: 0,
    READY: 1,
    FAILED: 2,
};

class Block {
    constructor(data, state) {
        this.state = state;
        this.data = data;
        this.lastVisitTime = new Date().getTime();
    }
}
Block.BLOCK_SECONDS = 60;

class PendingTask {
    constructor(indexes, callback) {
        this.callback = callback;
        this.indexes = indexes;
        this.createTime = new Date().getTime();
    }

    isReady(blocks) {
        for(let i = 0; i < this.indexes.length; i ++) {
            let block = blocks[this.indexes[i]];
            if(typeof block === "undefined" || block.state !== BlockState.READY) {
                return false;
            }
        }

        return true;
    }

    fire(state) {
        if (this.callback) {
            this.callback(state);
        }
    }
}

if(typeof Array.prototype.flat == "undefined"){
    Array.prototype.flat = function() {
        let r = [];
        for(let i = 0; i < this.length; i ++) {
            let elm = this[i];
            if(Array.isArray(elm)) {
                r = r.concat(elm);
            }
            else {
                r.push(elm);
            }
        }
        return r;
    };
}

export class EcgLoader {
    constructor(reportId, meta) {
        this.reportId = reportId;
        this.ranges = [];
        this.blocks = {};
        this.maxBlockCount = 100;
        this.preLoadCount = 2;
        this.pendingTasks = [];
        this.timeoutMS = 30 * 1000;

        this.originalFrequency = meta.originalFrequency;
        this.cachedFrequency = meta.cachedFrequency;
        this.serverBlockSize = Block.BLOCK_SECONDS * this.originalFrequency;
        this.cachedBlockSize = Block.BLOCK_SECONDS * this.cachedFrequency;
        this.cacheRatio = this.cachedFrequency / this.originalFrequency;

        let blockData = new Array(this.cachedBlockSize);
        blockData.fill(null, 0, blockData.length);
        this.nullBlock = new Block(blockData, BlockState.READY);
    }

    setMaxMemoryMB(mb) {
        this.maxBlockCount = Math.floor(mb * 1024 * 1024 / (this.cachedBlockSize * 4));
    }

    setPreLoadCount(n) {
        this.preLoadCount = n;
    }

    setTimeoutMS(ms) {
        this.timeoutMS = ms;
    }
    
    _block(i, curTime) {
        var block = this.blocks[i];
        if (typeof block !== "undefined" && block.state == BlockState.READY) {
            block.lastVisitTime = curTime;
            return block;
        }

        return this.nullBlock;
    }

    getRanges() {
        return this.ranges;
    }

    _sections(ids) {
        if (ids.length == 0) {
            return [];
        }

        var r = [
            {
                begin: ids[0],
                end: ids[0] + 1
            }
        ];

        for (let i = 1; i < ids.length; i++) {
            var cur = r[r.length - 1];

            if (ids[i] == cur.end) {
                cur.end++;
            }
            else {
                r.push({
                    begin: ids[i],
                    end: ids[i] + 1
                });
            }
        }

        return r;
    }

    _checkMemoryUsage() {
        var removeCount = Object.keys(this.blocks).length - this.maxBlockCount;
        if (removeCount <= 0) {
            return;
        }

        //
        var entries = Object.entries(this.blocks).sort(function (a, b) {
            return a[1].lastVisitTime - b[1].lastVisitTime;
        });

        for (let i = 0; i < removeCount; i++) {
            delete this.blocks[entries[i][0]];
        }

        console.log("清除缓存：" + removeCount + "块");
    }

    decodeData(arrayBuffer, blockSize) {
        // 需和服务端对应
        let MIN_VOLTAGE = -1.5;
        let MAX_VOLTAGE = 1.5;
        let VOLTAGE_WIDTH = 30000.0;
        let NULL_VALUE = 32767;
    
        let blocks = {};
        let blockStride = 4 + blockSize * 2;
        
        for(let p = 0; p + blockStride <= arrayBuffer.byteLength; p += blockStride) {
            let arrBlockIndex = new Int32Array(arrayBuffer, p, 1);
            let arrBlockData = new Int16Array(arrayBuffer, p + 4, blockSize);
            let blockData = new Array(blockSize);

            for(let i = 0; i < blockSize; i++) {
                if(arrBlockData[i] == NULL_VALUE) {
                    blockData[i] = null;
                }
                else {
                    blockData[i] = MIN_VOLTAGE + arrBlockData[i] * (MAX_VOLTAGE -  MIN_VOLTAGE) / VOLTAGE_WIDTH;
                }
            }

            let blockIndex = arrBlockIndex[0];
            blocks[blockIndex] = blockData;
        }

        return blocks;
    }

    loadBlocksRange(begin, end, callback) {
        for (let i = begin; i < end; i++) {
            var block = this.blocks[i];
            if (typeof block === "undefined") {
                this.blocks[i] = new Block(null, BlockState.DOWNLOADING);
                continue;
            }

            block.state = BlockState.DOWNLOADING;
        }

        let that = this;
        let req = new XMLHttpRequest();
        req.timeout = this.timeoutMS;
        req.open(
            "GET",
            "/ecg/blocks2?report_id=" + this.reportId
            + "&block_index=" + begin
            + "&limit=" + (end - begin)
            + "&frequency=" + this.cachedFrequency,
            true
        );

        req.onreadystatechange = function () {
            if (this.readyState != 4) {
                return;
            }

            if (req.status == 200) {
                let blocks = that.decodeData(req.response, that.cachedBlockSize);

                for (let ib = begin; ib < end; ib++) {
                    let blockData = blocks[ib];

                    if(typeof(blockData) === "undefined" || blockData == null) {
                        that.blocks[ib] = that.nullBlock;
                    }
                    else {
                        that.blocks[ib].data = blockData;
                        that.blocks[ib].state = BlockState.READY;
                    }
                }
            }
            else {
                for (let ib = begin; ib < end; ib++) {
                    that.blocks[ib].state = BlockState.FAILED;
                    that.blocks[ib].error = req.status;
                }
                console.log("请求错误("+req.status+")：begin="+begin+", end="+end);
            }

            let state = BlockState.FAILED;
            if(req.status == 200)
                state = BlockState.READY;
            else
                state = BlockState.FAILED;

            if (callback) {
                callback(state);
            }
        };

        req.responseType = "arraybuffer";
        req.send(null);
    }

    addTask(indexes, callback) {
        let task = new PendingTask(indexes, callback);

        this.pendingTasks.push(task);
    }

    pollTasks(state, begin, end) {
        let stillPendingTasks = [];

        for(let i = 0; i < this.pendingTasks.length; i++) {
            let task = this.pendingTasks[i];

            if(state === BlockState.READY) {
                if(task.isReady(this.blocks)) {
                    task.fire(BlockState.READY);
                }
                else {
                    stillPendingTasks.push(task);
                }
            }
            else if(state === BlockState.FAILED) {
                task.fire(BlockState.FAILED);
            }
        }

        this.pendingTasks = stillPendingTasks;
    }

    loadBlocks(indexes, callback) {
        let hasDownloadingBlocks = false;
        let missedBlocks = [];

        for (let i = 0; i < indexes.length; i++) {
            let block = this.blocks[indexes[i]];
            // 缓存块不存在
            if (typeof block === "undefined" || block == null) {
                missedBlocks.push(indexes[i]);
            }
            // 缓存块存在，但正在下载
            else if(block.state === BlockState.DOWNLOADING) {
                hasDownloadingBlocks = true;
            }
            // 缓存成功或者失败
            else {

            }
        }
        
        // 所有需要的块都已经存在（成功或者失败）时，直接回调。
        if (!hasDownloadingBlocks && missedBlocks.length == 0) {
            callback();
            return;
        }

        // 创建回调任务
        this.addTask(indexes, callback);

        // 所有需要的块都正在下载，这时不需要重新下载
        if(missedBlocks.length === 0) {
            return;
        }

        let sections = this._sections(missedBlocks);
        let nFinish = 0;
        let that = this;

        for (let i = 0; i < sections.length; i++) {
            let sec = sections[i];
            this.loadBlocksRange(sec.begin, sec.end, function (state) {
                that.pollTasks(state, sec.begin, sec.end);

                nFinish++;
                if (nFinish == sections.length) {
                    that._checkMemoryUsage();
                }
            });
        }
    }

    _originToCache(pos) {
        return Math.round(pos * this.cacheRatio);
    }
    
    _get(beginPos, endPos) {
        let blockSize = this.cachedBlockSize;
        beginPos = this._originToCache(beginPos);
        endPos = this._originToCache(endPos);

        let beginBlock = Math.floor(beginPos / blockSize);
        let endBlock = Math.floor((endPos + blockSize - 1) / blockSize);
        let that = this;
        let curTime = new Date().getTime();

        if (endBlock - beginBlock === 1) {
            let block = that._block(beginBlock, curTime);
            let begin = beginPos - beginBlock * blockSize;
            let end = endPos - beginBlock * blockSize;

            let r = block.data.slice(begin, end);
            return r;
        }

        let v = [];
        let block, begin, end;

        // first block
        block = that._block(beginBlock, curTime);
        begin = beginPos - beginBlock * blockSize;
        v.push(block.data.slice(begin, blockSize));

        // middle blocks
        for (let i = beginBlock + 1; i < endBlock - 1; i++) {
            block = that._block(i, curTime);
            v.push(block.data);
        }

        // last block
        block = that._block(endBlock - 1, curTime);
        end = endPos - (endBlock - 1) * blockSize;
        v.push(block.data.slice(0, end));

        //
        let r = v.flat();
        return r;
    }

    getByPosition(beginPos, endPos, callback) {
        let serverBlockSize = this.serverBlockSize;
        let beginBlock = Math.floor(beginPos / serverBlockSize);
        let endBlock = Math.floor((endPos + serverBlockSize - 1) / serverBlockSize);
        let blocks = [];
        let that = this;

        for (let i = beginBlock - this.preLoadCount; i < endBlock + this.preLoadCount; i++) {
            blocks.push(i);
        }

        this.loadBlocks(blocks, function () {
            let wave = that._get(beginPos, endPos);
            callback(wave);
        });
    }

    _getSlices(positions, leftLen, rightLen) {
        let slices = [];

        for (let i = 0; i < positions.length; i++) {
            let begin = positions[i] - leftLen;
            let end = positions[i] + rightLen;

            let data = this._get(begin, end);
            slices.push({
                pos: positions[i],
                data: data
            });
        }

        return slices;
    }

    getSlices(positions, leftLen, rightLen, callback) {
        let blockSize = this.serverBlockSize;
        let blocks = {};
        let that = this;

        for (let i = 0; i < positions.length; i++) {
            let biLeft = Math.floor((positions[i] - leftLen) / blockSize);
            let biRight = Math.floor((positions[i] + rightLen) / blockSize);
            blocks[biLeft] = biLeft;
            blocks[biRight] = biRight;
        }

        this.loadBlocks(Object.values(blocks), function () {
            let slices = that._getSlices(positions, leftLen, rightLen);
            if (callback) {
                callback(slices);
            }
        });
    }

    getSlicesOfBeats(beats, leftLen, rightLen, callback) {
        let blockSize = this.serverBlockSize;
        let blocks = {};
        let that = this;
        let positions = beats.map(function(beat) {
            return beat.p;
        });

        for (let i = 0; i < positions.length; i++) {
            let biLeft = Math.floor((positions[i] - leftLen) / blockSize);
            let biRight = Math.floor((positions[i] + rightLen) / blockSize);
            blocks[biLeft] = biLeft;
            blocks[biRight] = biRight;
        }

        this.loadBlocks(Object.values(blocks), function () {
            let slices = that._getSlices(positions, leftLen, rightLen);
            
            for (let i = 0; i < beats.length; i++) {
                beats[i].wave = slices[i].data;
            }

            if (callback) {
                callback(beats);
            }
        });
    }

    linearInterpolate(src, dst) {
        let nSrc = src.length;
        let nDst = dst.length;
        let rate =  (nSrc - 1) / nDst;

        for (let i = 0; i < dst.length; i++) {
            let fSrc = i * rate;
            let iSrc = Math.floor(fSrc);
            let r = fSrc - iSrc;

            dst[i] = src[iSrc] * (1 - r) + src[iSrc + 1] * r;
        }
    }

    getSlicesImage(positions, leftLen, rightLen, width, height, callback) {
        let canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        let ctx = canvas.getContext("2d");
        let images = [];
        let that = this;

        this.getSlices(positions, leftLen, rightLen, function (slices) {
            let w = new Array(width);
            let scale = height;
            let ofs = Math.floor(height / 2);

            ctx.strokeStyle = 'blue';
            ctx.lineWidth = 1;

            for (let i = 0; i < slices.length; i++) {
                that.linearInterpolate(slices[i].data, w);

                ctx.clearRect(0, 0, width, height);
                ctx.beginPath();
                ctx.moveTo(0, ofs + scale * w[0]);
                for (let i = 1; i < width; i++) {
                    ctx.lineTo(i, ofs + scale * w[i]);
                }
                ctx.stroke();

                images.push({
                    pos: slices[i],
                    url: canvas.toDataURL()
                });
            }

            callback(images);
        });
    }

    clearBlocks(indexes) {
        for(let i = 0; i < indexes.length; i ++) {
            delete this.blocks[indexes[i]];
        }
    }

    clearBlockRange(beginBlock, endBlock) {
        for(let i = beginBlock; i < endBlock; i ++) {
            delete this.blocks[i];
        }
    }

    clearPositionRange(beginPos, endPos) {
        let beginBlock = Math.floor(beginPos / this.serverBlockSize);
        let endBlock = Math.floor((endPos - 1) / this.serverBlockSize) + 1;
        this.clearBlockRange(beginBlock, endBlock);
    }
}

