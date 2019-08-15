<template>
    <div v-loading="pageLoading" style="position: relative;min-height: 300px">
        <div class="flexPaper">
            <div class="selectBlock"></div>
            <div class="singlePaper" draggable="false" v-for="item in showArr" :key="item.position">
                <canvas :id="item.position" width="140px" height="88px"></canvas>
            </div>
        </div>
        <div class="buttonBox">
            <el-button type="primary" style="margin: 3px 0 10px 0;width: 100px" @click="pageUp"
                       :disabled="pageObj.start === 0">上一页
            </el-button>
            <br>
            <el-button type="primary" style="width: 100px" @click="pageDown"
                       :disabled="pageObj.total <= pageObj.start + pageObj.limit">下一页
            </el-button>
        </div>
    </div>

</template>
<script>
    import API from '../../api/api_block_view';
    import {mapState, mapMutations} from 'vuex';

    export default {
        name: 'paperBlock',
        data () {
            return {
                select: false,
                selectArr: [],
                onCtrlButton: false,
                onShiftButton: false,
                showArr: [],
                pageLoading: false,
                onShiftStart: -1,
                selectBlock: {
                    startX: 0,
                    startY: 0
                },
                pageObj: {
                    limit: 24,
                    start: 0,
                    total: 0
                }
            }
        },
        computed: {
            ...mapState('paperBlock', {
                selectArray: state => state.selectArray[state.type],
                type: state => state.type
            })
        },
        watch: {
            selectArray: function () {
                this.init();
            }
        },
        mounted() {
            let that = this;
            $(document).on('keydown', function (e) {
                that.onCtrlButton = e.ctrlKey;
                that.onShiftButton = e.shiftKey;
                if (e.shiftKey) {
                    if (that.selectArr.length) {
                        that.onShiftStart = that.selectArr[0];
                    } else {
                        that.$message('请先选择起始卡片')
                    }
                }
            });
            $(document).on('keyup', () => {
                that.onCtrlButton = false;
                that.onShiftButton = false;
            });
            $('.flexPaper').on('mousedown', function (e) {
                if (!that.select) {
                    $('.singlePaper').removeClass('selectBorder');
                    that.select = true;
                    that.selectBlock.startX = e.clientX - $('.flexPaper').offset().left;
                    that.selectBlock.startY = e.clientY - $('.flexPaper').offset().top;
                    $('.selectBlock').css({
                        display: 'block',
                        left: that.selectBlock.startX,
                        top: that.selectBlock.startY
                    });
                } else {
                    that.select = false;
                    that.isOverlap();
                }
            });
            $('.flexPaper').on('mouseup', function () {
                that.select = false;
                that.isOverlap();
            });
            $('.flexPaper').on('mouseleave', function () {
                that.select = false;
//                that.isOverlap();
            });
            $('.flexPaper').on('mousemove', function (e) {
                if (that.select) {
                    let width = e.clientX - $('.flexPaper').offset().left - that.selectBlock.startX;
                    let height = e.clientY - $('.flexPaper').offset().top - that.selectBlock.startY;
                    if (width >= 0) {
                        if (height >= 0) {
                            $('.selectBlock').css({
                                width: Math.abs(width),
                                height: Math.abs(height)
                            });
                        } else {
                            $('.selectBlock').css({
                                width: Math.abs(width),
                                height: Math.abs(height),
                                left: e.clientX - $('.flexPaper').offset().left - Math.abs(width),
                                top: e.clientY - $('.flexPaper').offset().top
                            });
                        }

                    } else {
                        if (height >= 0) {
                            $('.selectBlock').css({
                                width: Math.abs(width),
                                height: Math.abs(height),
                                left: e.clientX - $('.flexPaper').offset().left,
                                top: e.clientY - $('.flexPaper').offset().top - Math.abs(height)
                            });
                        } else {
                            $('.selectBlock').css({
                                width: Math.abs(width),
                                height: Math.abs(height),
                                left: e.clientX - $('.flexPaper').offset().left,
                                top: e.clientY - $('.flexPaper').offset().top
                            });
                        }
                    }
                } else {
                    $('.selectBlock').css({
                        display: 'none',
                        width: 0,
                        height: 0
                    });
                }
            });
        },
        methods: {
            ...mapMutations('paperBlock', [
                'changeshowPosition'
            ]),
            init() {
                this.pageObj.start = 0;
                this.pageObj.total = 0;
                this.getSelectPointEcg();
            },
            pageUp() {
                if (this.pageObj.start <= 0) {
                    this.pageObj.start = 0;
                } else {
                    this.pageObj.start -= this.pageObj.limit;
                }
                this.getSelectPointEcg();
            },
            pageDown() {
                if (this.pageObj.start + this.pageObj.limit < this.pageObj.total) {
                    this.pageObj.start += this.pageObj.limit;
                }
                this.getSelectPointEcg();
            },
            getSelectPointEcg() {
                this.pageLoading = true;
                API.getBlockData({
                    limit: this.pageObj.limit,
                    positions: this.selectArray,
                    report_id: localStorage.getItem('report_id'),
                    start: this.pageObj.start
                }).then(data => {
                    this.pageLoading = false;
                    this.pageObj.total = this.selectArray.length;
                    this.showArr = data;
                    this.$nextTick(() => {
                        this.showArr.map(item => {
                            let showData = item.voltages;
                            let id = '#' + item.position;
                            let c_canvas = $(id)[0];
                            let context = c_canvas.getContext("2d");
                            context.clearRect(0, 0, c_canvas.width, c_canvas.height);
                            this.drawEcg(context, showData);
                        });
                    });
                }).catch(err => {
                    this.pageLoading = false;
                })
            },
            addArr (index) {
                if (this.selectArr.indexOf(index) === -1) {
                    this.selectArr.push(index);
                    this.selectArr.sort((a, b) => a - b);
                    let lastIndex = this.selectArr[this.selectArr.length - 1];
                    this.changeshowPosition(this.selectArray[lastIndex])
                }
            },
            isOverlap() {
                if (!this.onCtrlButton && !this.onShiftButton) {
                    this.selectArr = [];
                }
                let aim = $('.selectBlock');
                let offsetAim = aim.offset();
                let topAim = offsetAim.top;
                let leftAim = offsetAim.left;
                let widthAim = aim.width();
                let heightAim = aim.height();
                for (let i = 0, len = $('.singlePaper').length; i < len; i++) {
                    let obj = $('.singlePaper').eq(i);
                    let offsetObj = obj.offset();
                    let topObj = offsetObj.top;
                    let leftObj = offsetObj.left;
                    let widthObj = obj.width();
                    let heightObj = obj.height();
                    let isOverlap = true;
                    if (leftAim > leftObj + widthObj) {
                        isOverlap = false;
                    }
                    if (leftAim + widthAim < leftObj) {
                        isOverlap = false;
                    }
                    if (topAim >= topObj + heightObj) {
                        isOverlap = false;
                    }
                    if (topAim + heightAim < topObj) {
                        isOverlap = false;
                    }
                    if (isOverlap) {
                        if (this.onCtrlButton) {
                            this.addArr(i);
                            this.onCtrlButton = false;
                        } else if (this.onShiftButton) {
                            if (this.selectArr.length === 0) {
                                this.addArr(i);
                            } else {
                                let endIndex = i;
                                let startIndex = this.onShiftStart;
                                if (startIndex > endIndex) {
                                    let temp = startIndex;
                                    startIndex = endIndex;
                                    endIndex = temp;
                                }
                                for (let i = startIndex; i <= endIndex; i++) {
                                    this.addArr(i);
                                }
                            }
                            this.onShiftButton = false;
                        } else {
                            this.addArr(i);
                        }
                    }
                }
                this.selectArr.map(item => {
                    $('.singlePaper').eq(item).addClass('selectBorder');
                });
                $('.selectBlock').css({
                    display: 'none',
                    width: 0,
                    height: 0
                });
            },
            drawEcg(context, data, x_pos = 0, x_end_pos = 140, y_start_pos = 0, frequency = 512 * 2, add = 10, y_height = 88){
                context.lineWidth = 1;
                context.beginPath();
                let length = data.length;
                context.moveTo(x_pos, y_height / 2 + y_start_pos[0]);
                for (let i = 0; i < length; i++) {
                    let xPosition = x_pos + i % frequency / frequency * (x_end_pos - x_pos);
                    let yPosition = 2 + data[i] * add * 5 + y_height / 2;
                    context.lineTo(xPosition, yPosition);
                }
                context.stroke();
                return;
            },
        }
    }
</script>
<style scoped>
    .flexPaper {
        position: relative;
        min-width: 600px;
        width: calc(100% - 100px);
        overflow: hidden;
        justify-content: space-around;
    }

    .singlePaper {
        float: left;
        width: 140px;
        height: 88px;
        border: 1px solid #ccc;
        margin: 3px;
    }

    .buttonBox {
        position: absolute;
        right: 0;
        top: 0;
    }

    .selectBorder {
        border: 1px dashed #ff1b13;
    }

    .selectBlock {
        position: absolute;
        display: none;
        width: 0;
        height: 0;
        left: 0;
        top: 0;
        border: 1px solid #ccc;
        background-color: rgba(45, 245, 255, 0.2);
    }
</style>
