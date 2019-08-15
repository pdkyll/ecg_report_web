var requestId = 0;
var GC_TIMEOUT = 5000; // 被遗弃的数据块5秒后回收内存
var RETRY_DELEY_TIMEOUTS = [ // 对于每个块而言
    500, // Ajax首次加载失败后等半秒再重试,
    1000, // 第二次失败后等一秒后再重试,
    2000 // 第三次失败后等两秒后再重试
]; // 还TMD不成功, 界面显示错误

// 客户端Block的缓存和Ajax交互
var Block = function (reportId, start, positions, index, loadedCallback) {
    this.reportId = reportId;
    this.index = index;
    this.loadedCallback = loadedCallback; // 数据加载成功后的回调
    this.start = start;
    this.positions = positions;
    this.loaded = false; // 是否被加载
    this.loading = false; // 是否正在被加载, 首次加载前变为true, 加载成功或最后一次重试失败后变为false
    this.data = null; // 如果被加载, 就是一个[]; 否则为null
    this.used = false; // 被使用(显示或显示相邻)还是被遗弃(稍后自动执行data = null以释放客户端内存)
    this.retryCount = 0; // 以及重试的次数, 失败后++, 最终重试失败或数据被回收时归0
};
Block.prototype.load = function () {
    this.used = true; //当前块已经被使用
    if (this.data != null || this.loading) { // 已加载或正在加载
        return;
    }
    this.loading = true; // 设置正在加载标志
    this._load();
};
Block.prototype._load = function () {
    var that = this;
    var request = new XMLHttpRequest();
    request.open(
        "GET",
        "/ecg/slices?limit=1&report_id=" +
        this.reportId +
        "&block_index=" +
        that.index,
        true
    );
    let formData  = new FormData();
    formData.append('limit', '24');
    formData.append('report_id', this.reportId);
    formData.append('start', this.start);
    formData.append('positions', this.positions);
    fetch('/ecg/slices', {
        method: 'post',
        headers:{
            "Content-Type":'application/x-www-form-urlencoded'
        },
        body: formData
    }).then( data => {

    });
    // request.setRequestHeader("id", requestId);
    request.send(null);
    request.onreadystatechange = function () {
        if (request.readyState == 4) {
            if (request.status == 200) {
                var json = eval(request.responseText);
                if (json.length != 0) {
                    that.data = json[0].data;
                } else {
                    that.data = new Array(that.blockSize);
                }
                that.loading = false; // 因加载成功而清除loading
                that.loadedCallback(); // 加载成功共的回调
                // console.log("reportId为" + that.reportId + "且index为" + that.index + "的Block加载成功");
            } else if (that.used) { // 仅仅当块未被遗弃时才重试
                if (that.retryCount < RETRY_DELEY_TIMEOUTS.length) {
                    setTimeout(
                        function () {
                            that._load();
                        },
                        RETRY_DELEY_TIMEOUTS[that.retryCount]
                    ); // 重试次数不足则重试
                    that.retryCount++;
                    // console.log("reportId为" + that.reportId + "且index为" + that.index + "的Block加载失败, 稍候进行第" + that.retryCount + "次重试");
                } else {
                    that.loading = false; // 因最后一次重试失败而清除loaoding
                    that.retryCount = 0; // 当前重试重视, 但以后重新重试什允许的
                    // console.log("reportId为" + that.reportId + "且index为" + that.index + "的Block最终未能重试成功");
                }
            }
        }
    }
};
Block.prototype.abandon = function () {
    var that = this;
    if (that.used) {
        that.used = false; // 遗弃标志
        // console.log("reportId为" + that.reportId + "且index为" + that.index + "的Block被遗弃");
        setTimeout(
            function () {
                if (!that.used) { // 如果在GC_TIMEOUT等待期内仍然没有被重新使用
                    that.data = null; // 数据内存回收
                    that.retryCount = 0;
                    // console.log("reportId为" + that.reportId + "且index为" + that.index + "的Block持续处于被遗弃状态超过" + GC_TIMEOUT + "毫秒, 释放其数据");
                }
            },
            GC_TIMEOUT
        );
    }
}

// 除下文的构造函数外, 提供如下API
// getOffset():
// 	返回当前要第一个被显示点的索引, 该索引为针对整个测试的绝对索引, 无视分页逻辑
// moveTo(offset):
// 	设置当前要第一个被显示点的索引, 该索引为针对整个测试的绝对索引, 无视分页逻辑
// getVisibleData():
// 	返回被显示的数据端, 如果数据并未就绪, 返回null
function EcgViewer(reportId,
                   blockSize, // 服务端数据块中点的数量, 经典值为512 * 60
                   blockCount, // 总块的个数, 经典值为1440 * 7
                   viewSize, // 界面显示的点的数量
                   beforeSize, // 向前后预留点的数量, 暂时看不见, 但是和可见数据相邻, 预先加载并延迟释放, 以备随时上场显示
                   afterSize, // 向前后预留点的数量, 暂时看不见, 但是和可见数据相邻, 预先加载并延迟释放, 以备随时上场显示
                   dataChangedCallback //数据变更事件通知, 当数据变为无效或者数据加载成功的时, 触发此回调
) {
    this.reportId = reportId;
    this.blockSize = blockSize;
    this.blockCount = blockCount;
    this.viewSize = viewSize;
    this.beforeSize = beforeSize;
    this.afterSize = afterSize;
    this.dataChangedCallback = dataChangedCallback;

    this.offset = -1; //当前第一个可见点的索引, 该索引为7天数据的绝对索引, 无视分块逻辑

    var blocks = new Array(blockCount);
    var that = this;
    for (var i = blockCount - 1; i >= 0; --i) {
        blocks[i] = new Block(reportId, i, function () {
            that._refreshData();
        });
    }
    this.blocks = blocks; // 总共有哪些块
    this.firstUsedBlockIndex = -1; // 第一个正在使用的块(包含显示的及其前后相邻的)
    this.lastUsedBlockIndex = -1; // 最后一个正在使用的块(包含显示的及其前后相邻的)

    this.visibleData = null; // 最终的可显示数据, 为null表示数据为加载到位; 否则, 为一个数字数组
};
EcgViewer.prototype.changeViewSize = function (viewSize) {
    this.viewSize = viewSize;
    this._refreshData();
};
EcgViewer.prototype.getRequestId = function () {
    return requestId;
};
EcgViewer.prototype.destroy = function() {
    this.blocks = [];
};

EcgViewer.prototype.getOffset = function () {
    return this.offset;
};
EcgViewer.prototype.moveTo = function (offset) {
    if (offset >= this.blockSize * this.blockCount) {
        offset = this.blockSize * this.blockCount;
    }
    if (offset < 0) {
        offset = 0;
    }
    if (this.offset == offset) {
        return;
    }
    requestId++;
    this.offset = offset;
    var firstUsedBlockIndex = Math.max(Math.floor((offset - this.beforeSize) / this.blockSize), 0);
    var lastUsedBlockIndex = Math.min(Math.floor((offset + this.viewSize + this.afterSize) / this.blockSize), this.blockCount - 1);

    for (var i = this.firstUsedBlockIndex; i <= this.lastUsedBlockIndex; i++) {
        if (i >= 0 && (i < firstUsedBlockIndex || i > lastUsedBlockIndex)) {
            this.blocks[i].abandon(); // 遗弃旧块
        }
    }
    this.firstUsedBlockIndex = firstUsedBlockIndex;
    this.lastUsedBlockIndex = lastUsedBlockIndex;
    for (var i = firstUsedBlockIndex; i <= lastUsedBlockIndex; i++) {
        this.blocks[i].load(); // 加载新块(load函数实现了幂等, 如果已经加载, 其内部逻辑回忽略)
    }
    this._refreshData();
};
EcgViewer.prototype.getVisibleData = function () {
    return this.visibleData;
}
EcgViewer.prototype._refreshData = function () {
    var firstVisibleBlockIndex = Math.floor(this.offset / this.blockSize);
    var lastVisibleBlockIndex = Math.min(Math.floor((this.offset + this.viewSize) / this.blockSize), this.blockCount - 1);
    for (var i = firstVisibleBlockIndex; i <= lastVisibleBlockIndex; i++) {
        if (this.blocks[i].data == null) {
            this._setVisibleData(null);
            return;
        }
    }
    var visibleData = [];
    var blockIndex = firstVisibleBlockIndex;
    var subIndex = this.offset % this.blockSize;
    while (blockIndex <= lastVisibleBlockIndex && visibleData.length < this.viewSize) {
        visibleData.push(this.blocks[blockIndex].data[subIndex]);
        if (subIndex++ == this.blockSize) {
            blockIndex++;
            subIndex = 0;
        }
    }
    this._setVisibleData(visibleData);
};
EcgViewer.prototype._setVisibleData = function (visibleData) {
    this.visibleData = visibleData;
    if (typeof(this.dataChangedCallback) == "function") {
        this.dataChangedCallback();
    }
}

export {EcgViewer}





