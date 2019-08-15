<template>
    <div class="overlay-slots" :style="{width:width+'px',height:height+'px'}">
        <div
                class="slot0"
                @mousedown="dragStart"
        >
            <div class="slot-text" onselectstart="return false">
                <!--<div class="slot-index">
                    0
                </div>-->
                <div class="slot-beats-num">
                    {{slotBeatCounts}}
                </div>
            </div>
            <img :src="picSrc" alt="" ondragstart="return false;">
            <div v-if="dragArea!==null&&!(dragArea.width===0&&dragArea.height===0)"
                 :style="{left:dragArea.left+'px',width:dragArea.width+'px',top:dragArea.top+'px',height:dragArea.height+'px'}"
                 class="drag-area">

            </div>
        </div>
    </div>
</template>
<script>
    export default {
        name: 'OverlayMainArrhythmia',
        props: {
            width: {
                type: Number,
                default: 500
            },
            height: {
                type: Number,
                default: 300
            },
            picSrc: {
                type: String,
                default: ''
            },
            slotBeatCounts:{
                type:Number,
                default:0
            }
        },
        data() {
            return {
                dragArea: null,//{left: 0, top: 0, width: 0, height: 0}
                dragAreaPercent: null,
                dragEle: null,
            }
        },
        watch: {
            width(width) {
                if(this.dragArea &&this.dragAreaPercent){
                    this.dragArea = {
                        ...this.dragArea,
                        left: Math.floor(this.width * this.dragAreaPercent.left),
                        top: Math.floor(this.height * this.dragAreaPercent.top),
                        width: Math.floor(this.width * this.dragAreaPercent.right - this.width * this.dragAreaPercent.left),
                        height: Math.floor(this.height * this.dragAreaPercent.bottom - this.height * this.dragAreaPercent.top)
                    }
                }
            }
        },
        methods: {
            boundary() {
                let boundaryRight = this.width;
                let boundaryBottom = this.height;
                return {boundaryRight, boundaryBottom}
            },
            dragStart(e) {
                if (this.picSrc && e.buttons === 1) {
                    this.dragEle = e.currentTarget;
                    this.dragArea = null;
                    this.dragAreaPercent=null;
                    let left = e.clientX - e.currentTarget.getBoundingClientRect().left;
                    let top = e.clientY - e.currentTarget.getBoundingClientRect().top;
                    let {boundaryRight, boundaryBottom} = this.boundary();
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
                    && this.dragEle) {
                    let left = this.dragArea.x;
                    let right = e.clientX - this.dragEle.getBoundingClientRect().left;
                    let top = this.dragArea.y;
                    let bottom = e.clientY - this.dragEle.getBoundingClientRect().top;
                    if (left > right) {
                        [left, right] = [right, left];
                    }
                    if (bottom < top) {
                        [top, bottom] = [bottom, top];
                    }
                    let {boundaryRight, boundaryBottom} = this.boundary();
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
                if (this.dragEle && this.dragArea !== null) {
                    let {boundaryRight, boundaryBottom} = this.boundary();
                    let leftPercent = this.dragArea.left / boundaryRight;
                    let rightPercent = (this.dragArea.left + this.dragArea.width) / boundaryRight;
                    let topPercent = this.dragArea.top / boundaryBottom;
                    let bottomPercent = (this.dragArea.top + this.dragArea.height) / boundaryBottom;
                    let formatLeftPercent=this.formatAreaPos(leftPercent);
                    let formatRightPercent=this.formatAreaPos(rightPercent);
                    let formatTopPercent=this.formatAreaPos(topPercent);
                    let formatBottomPercent=this.formatAreaPos(bottomPercent);
                    this.$emit('selectOverlayArea',
                        formatLeftPercent,
                        formatRightPercent,
                        formatTopPercent,
                        formatBottomPercent,
                        !(formatLeftPercent===formatRightPercent&&formatTopPercent===formatBottomPercent)
                    );
                    this.dragEle = null;
                    //记住当前拖拽区域在当前尺寸下的百分比，方便放大或缩小时同比例放缩拖拽区域
                    this.dragAreaPercent = {
                        left: leftPercent,
                        right: rightPercent,
                        top: topPercent,
                        bottom: bottomPercent
                    }
                }
            },
            formatAreaPos(val) {
                return Number(val.toFixed(4));
            },
            //清空叠加图的拖拽框
            resetDragArea() {
                this.dragArea = null;
                this.dragAreaPercent=null;
            },
            //清空叠加图的所有状态，包括选中状态，拖拽款，5个窗口的内容
            reset() {
                this.dragArea = null;
                this.dragAreaPercent=null;
                this.picSrc = '';
            }
        },
        mounted() {

        },
        beforeDestroy() {

        },
        deactivated() {
            $(document).off('mousemove', this.dragging);
            $(document).off('mouseup', this.endDrag);
        },
        activated() {
            $(document).on('mousemove', this.dragging);
            $(document).on('mouseup', this.endDrag);
        },
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
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
    }

    .overlay-slots > div {
        position: relative;
    }

    .slot0 {
        width: 100%;
        height: 100%;
        background-color: #000;
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

    .drag-area {
        position: absolute;
        background-color: #6f6f6f;
        opacity: 0.6;
    }

    .slot-index {
        position: absolute;
        left: 0;
    }
</style>