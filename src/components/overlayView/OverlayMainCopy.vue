<template>
    <div class="overlay-slots">
        <div
                :class="[{active:currentActiveIndex===index,'small-slot':index>0},'slot'+index]"
                v-for="(item,index) in 5"
                @mousedown="dragStart($event,index)"
                v-loading="overlayImgLoading[index]"
        >
            <div class="slot-text" onselectstart="return false">
                <div class="slot-index">
                    {{index}}
                </div>
                <div class="slot-beats-num">
                    {{slotBeatCounts[index] === 0 ? '' : slotBeatCounts[index]}}
                </div>
            </div>
            <img :src="overlayImgUrls[index]" alt="" ondragstart="return false;" @load="imgLoaded(index)">
            <div v-if="currentActiveIndex===index&&dragArea!==null&&!(dragArea.width===0&&dragArea.height===0)"
                 :style="{left:dragArea.left+'px',width:dragArea.width+'px',top:dragArea.top+'px',height:dragArea.height+'px'}"
                 class="drag-area">

            </div>
        </div>
    </div>
</template>
<script>
    import imgUrl from '../../assets/images/timg.jpg';

    export default {
        name: 'OverlayMain',
        props: {
            slotBeatCounts: {
                type: Array,
                required: true
            }
        },
        data() {
            return {
                currentActiveIndex: 0,
                dragArea: null,//{left: 0, top: 0, width: 0, height: 0}
                activeBorderWidth: 2,
                overlayImgLoading: new Array(5).fill(false),
                overlayImgUrls: new Array(5).fill(null),
                dragEle: null
            }
        },
        methods: {
            selectSlot(num) {
                if (this.overlayImgUrls[num]) {
                    if (num !== this.currentActiveIndex) {
                        this.currentActiveIndex = num;
                        this.dragArea = null;
                        this.$emit('slotChange', this.currentActiveIndex)
                    }
                }
            },
            boundary(index) {
                let boundaryRight = index === 0 ? 306 : 150;
                let boundaryBottom = index === 0 ? 150 : 100;
                return {boundaryRight, boundaryBottom}
            },
            dragStart(e, index) {
                if (this.overlayImgUrls[index] && e.buttons === 1) {
                    this.dragEle = {node: e.currentTarget, index: index};
                    this.dragArea = null;
                    if (this.slotBeatCounts[index] === 0) {//如果当前叠加图里面的心拍个数为0，则不能继续拖拽，清空拖拽区域
                        return;
                    }
                    if (index !== this.currentActiveIndex) {
                        this.currentActiveIndex = index;
                        this.$emit('slotChange', this.currentActiveIndex);
                    }
                    let left = e.clientX - e.currentTarget.getBoundingClientRect().left - this.activeBorderWidth;
                    let top = e.clientY - e.currentTarget.getBoundingClientRect().top - this.activeBorderWidth;
                    let {boundaryRight, boundaryBottom} = this.boundary(index);
                    if (left < 0 || left > boundaryRight || top < 0 || top > boundaryBottom) {
                        return;
                    }
                    this.dragArea = {
                        x: left,
                        y: top,
                        left: left,
                        top: top,
                        width: 0,
                        height: 0
                    };
                }
            },
            dragging(e) {
                if (this.dragArea !== null && e.buttons === 1
                    && this.dragEle && this.dragEle.index === this.currentActiveIndex) {
                    let left = this.dragArea.x;
                    let right = e.clientX - this.dragEle.node.getBoundingClientRect().left - this.activeBorderWidth;
                    let top = this.dragArea.y;
                    let bottom = e.clientY - this.dragEle.node.getBoundingClientRect().top - this.activeBorderWidth;
                    if (left > right) {
                        [left, right] = [right, left];
                    }
                    if (bottom < top) {
                        [top, bottom] = [bottom, top];
                    }
                    let {boundaryRight, boundaryBottom} = this.boundary(this.dragEle.index);
                    left = this.calcBound(left, boundaryRight);
                    right = this.calcBound(right, boundaryRight);
                    top = this.calcBound(top, boundaryBottom);
                    bottom = this.calcBound(bottom, boundaryBottom);
                    this.dragArea = {
                        ...this.dragArea,
                        left: left,
                        width: right - left,
                        top: top,
                        height: bottom - top
                    };
                }
            },
            calcBound(edge, boundary) {
                let res = edge;
                if (edge < 0) {
                    res = 0;
                }
                if (edge > boundary) {
                    res = boundary;
                }
                return res;
            },
            endDrag(e) {
                if (this.dragEle && this.dragEle.index === this.currentActiveIndex && this.dragArea !== null) {
                    let {boundaryRight, boundaryBottom} = this.boundary(this.dragEle.index);
                    this.$emit('selectOverlayArea',
                        this.formatAreaPos(this.dragArea.left / boundaryRight),
                        this.formatAreaPos((this.dragArea.left + this.dragArea.width) / boundaryRight),
                        this.formatAreaPos(this.dragArea.top / boundaryBottom),
                        this.formatAreaPos((this.dragArea.top + this.dragArea.height) / boundaryBottom)
                    );
                    this.dragEle = null;
                }
            },
            formatAreaPos(val) {
                return Number(val.toFixed(4));
            },
            //清空叠加图的拖拽框
            resetDragArea() {
                this.dragArea = null;
            },
            changeOverlayImgLoading(index, load) {
                this.overlayImgLoading[index] = load;
                this.notifyLoadingUpdate(index);
            },
            imgLoaded(index) {
                this.overlayImgLoading[index] = false;
                this.notifyLoadingUpdate(index);
            },
            notifyLoadingUpdate(index) {
                this.$set(this.overlayImgLoading, index, this.overlayImgLoading[index]);
            },
            changeOverlayImgUrls(index, url) {
                this.overlayImgUrls[index] = url;
                this.notifyOverlayImgUpdate(index);
            },
            notifyOverlayImgUpdate(index) {
                this.$set(this.overlayImgUrls, index, this.overlayImgUrls[index]);
            },
            //清空叠加图的所有状态，包括选中状态，拖拽款，5个窗口的内容
            reset() {
                this.currentActiveIndex = 0;
                this.dragArea = null;
                this.overlayImgLoading = new Array(5).fill(false);
                this.overlayImgUrls = new Array(5).fill(null);
            }
        },
        mounted() {
            $(document).on('mousemove', this.dragging);
            $(document).on('mouseup', this.endDrag);
        },
        beforeDestroy(){
            $(document).off('mousemove', this.dragging);
            $(document).off('mouseup', this.endDrag);
        }
    }
</script>
<style scoped lang="scss">
    $activeColor: #12d726;
    $dragLineColor: #fe010f;
    img {
        width: 100%;
        height: 100%;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
    }

    .overlay-slots {
        width: 310px;
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
    }

    .overlay-slots > div {
        position: relative;
    }

    .slot0 {
        width: 100%;
        height: 150px;
        background-color: #000;
        border: 2px solid #fff;
    }

    .small-slot {
        width: 150px;
        height: 100px;
        margin-top: 5px;
        background-color: #000;
        border: 2px solid #fff;
    }

    .active {
        border: 2px solid $activeColor;
    }

    .slot-text {
        width: 100%;
        position: absolute;
        top: 0;
        text-align: center;
        font-size: 12px;
        font-weight: bold;
        color: #fff;
    }

    .slot-index {
        position: absolute;
        left: 0;
    }

    .drag-area {
        position: absolute;
        background-color: #6f6f6f;
        opacity: 0.6;
    }
</style>