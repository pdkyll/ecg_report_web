<template>
    <div class="container" v-loading="ecgLoading" ref="container">
        <canvas ref="canvas" :width="canvasWidth" height="130" ></canvas>
        <canvas ref="canvas_box" :width="canvasWidth" height="130" @click="handleChangePosition" style="z-index: 1000;position: absolute;top: 0;left: 0;"></canvas>
        <canvas ref="canvas_bg" :width="canvasWidth" height="130" @click="handleChangePosition" style="position: absolute;top: 0;left: 0;"></canvas>
        <div class="currentTime">{{showTime}}</div>
    </div>
</template>
<script type="text/ecmascript-6">
    import axios from 'axios'
    import {EcgViewer} from '../../common/ecg_viewer';
    import Util from '../../common/util'
    import {mapState, mapMutations} from 'vuex';
    import {RhythmMatcher} from '../../common/rhythmMatcher';
    const pointNum = 512*30
    export default {
        props: {
            currentPosition: {
                type: Number,
                default: -1
            }
        },
        data() {
            return {
                rhythmData: [],
                currentPageNoise: [],//当前页面的NOISE
                currentPageMaxHr: [],//当前页面的最快心率(非自定义的)
                currentPageMinHr: [],//当前页面的最慢心率(非自定义的)
                currentPageAF: [], //当前页面的房颤
                currentPageAFLUT: [], //当前页面的房扑
                ecgStartPosition: 0,
                ecgEndPosition: 0,
                isDrawBox: true, // 是否加载了新的心电片段标志，控制是否画绿色边框
                clickPosition: null,
                moveToPosition: -5120,
                ecgLoading: false,
                canvasWidth: 1550,
                canvasHeight: 130,
                box_width: 513,
                report_id: localStorage.getItem('report_id'),
                ecgViewer: null,
                ecgData: [],
                tagData:[]
            }
        },
        mounted() {
            this.drawBorder(this.canvasWidth, this.canvasHeight)
            this.ecgEndPosition = (new Date(this.ecgEndTime) - new Date(this.ecgStartTime))/ 1000 * 512
        },
        watch: {
            currentPosition(val, oldVal) {
                if (this.currentPosition === -2) return;
                this.ecgLoading = true
                this.isDrawBox = true
                let moveToPosition = this.currentPosition;
                if (moveToPosition > pointNum/2) {
                    moveToPosition = moveToPosition - pointNum/2
                } else {
                    moveToPosition = this.ecgStartPosition
                }
                if (this.moveToPosition !== moveToPosition) {
                    this.moveToPosition = moveToPosition
                    this.getSliceData([this.moveToPosition])
//                    this.ecgViewer.moveTo(this.moveToPosition)
                } else {
                    this.ecgLoading = false;
                    this.initCanvas()
                }
            }
        },
        computed: {
            ...mapState('ecgView', {
                ecgEndTime: state => state.ecgEndTime,
                ecgStartTime: state => state.ecgStartTime,
                ecgLoader: state => state.ecgLoader,
                lastBlockIndex: state => state.lastBlockIndex
            }),
            showTime() {
                if (this.currentPosition === -1) return ''
                else {
                    return this.calcEcgTime(this.moveToPosition)
                }
            }
        },
        methods: {
            // 翻转片段改变心电图
//            updateVisibleData() {
//                this.ecgViewer.updateVisibleData();
//            },
            // 点击改变选中心电位置
            handleChangePosition (e) {
                this.drawBox(e.offsetX, 0, this.canvasWidth, pointNum)
            },
            setRhythmData(val) {
                this.rhythmData = val.rhythm
                let options = {
                    data: this.ecgData,
                    frequency: 512 * 30,
                    x_start_pos: 0,
                    x_end_pos: this.canvasWidth,
                    y_start_pos: [0],
                    y_height: this.canvasHeight,
                    add: 10,
                    rhythm: []
                };
                let c_canvas = this.$refs['canvas'];
                let {data, x_start_pos, x_end_pos, y_start_pos, y_height, tagData, frequency, add, rhythm} = {...options};
                this.drawEcg(c_canvas, data, x_start_pos, x_end_pos, y_start_pos, frequency, add, y_height);
            },
            getRhythmData(rhythmData) {
                this.currentPageNoise = [];
                this.currentPageAF = [];
                this.currentPageAFLUT = [];
                this.currentPageMaxHr = [];
                this.currentPageMinHr = [];
                for (let i = 0, len = rhythmData.length; i < len; i++) {
                    if (rhythmData[i].end >= this.moveToPosition) {
                        if (rhythmData[i].type === 'AF') {
                            if (rhythmData[i].state !== 0) this.currentPageAF.push(rhythmData[i]);
                        }
                        if (rhythmData[i].type === 'AFLUT') {
                            if (rhythmData[i].state !== 0) this.currentPageAFLUT.push(rhythmData[i]);
                        }
                        if (rhythmData[i].type === 'NOISE' && rhythmData[i].state !== 0) {
                            this.currentPageNoise.push(rhythmData[i]);
                        }
                        if (rhythmData[i].type === 'MAXHR' && rhythmData[i].state !== 0) {
                            this.currentPageMaxHr.push(rhythmData[i]);
                        }
                        if (rhythmData[i].type === 'MINHR' && rhythmData[i].state !== 0) {
                            this.currentPageMinHr.push(rhythmData[i]);
                        }
                    }
                }
            },
            //计算每行心电起始时间
            calcEcgTime(index) {
                let startDate = new Date(this.ecgStartTime);
                startDate.setSeconds(startDate.getSeconds() + Math.floor(index / 512));
                let hour = startDate.getHours() < 10 ? '0' + startDate.getHours() : startDate.getHours();
                let minute = startDate.getMinutes() < 10 ? '0' + startDate.getMinutes() : startDate.getMinutes();
                let second = startDate.getSeconds() < 10 ? '0' + startDate.getSeconds() : startDate.getSeconds();
                return hour + ':' + minute + ':' + second;
            },
            getSliceData(slicePositions) {
                this.ecgLoader.getSlices(slicePositions, 0, 512 * 30,(data)=>{
                    this.ecgData = data[0].data
                    this.ecgLoading = false;
                    this.initCanvas()
                })
            },
            initCanvas() {
                let c_canvas = this.$refs['canvas'];
                let options = {
                    data: this.ecgData,
                    frequency: 512 * 30,
                    x_start_pos: 0,
                    x_end_pos: this.canvasWidth,
                    y_start_pos: [0],
                    y_height: this.canvasHeight,
                    add: 10,
                    rhythm: []
                };
                let context = c_canvas.getContext("2d");
                context.clearRect(0, 0, c_canvas.width, c_canvas.height);
                this.drawGrid(c_canvas, options);
            },
            drawGrid(c_canvas, options) {
                let {data, x_start_pos, x_end_pos, y_start_pos, y_height, tagData, frequency, add, rhythm} = {...options};
                if (this.currentPosition !== -1) {
                    this.drawEcg(c_canvas, data, x_start_pos, x_end_pos, y_start_pos, frequency, add, y_height);
                    if (this.isDrawBox) {
                        if (this.currentPosition >= this.ecgStartPosition + pointNum/2 && this.currentPosition <= this.ecgEndPosition - pointNum/2) {
                            this.drawBox(this.canvasWidth/2, x_start_pos, x_end_pos, frequency, 1)
                        } else if (this.currentPosition < this.ecgStartPosition + pointNum/2 || (this.currentPosition > this.ecgEndPosition - pointNum/2 && this.currentPosition <= this.ecgEndPosition)) {
                            let position = x_start_pos + (this.currentPosition - this.moveToPosition) % frequency / frequency * (x_end_pos - x_start_pos);
                            this.drawBox(position, x_start_pos, x_end_pos, frequency, 1)
                        }
                    }
                } else {
                    let context = this.$refs['canvas_box'].getContext('2d')
                    context.clearRect(0, 0, this.canvasWidth, this.canvasHeight)
                }
            },
            drawBorder ( x_end_pos, y_height) {
                let context = this.$refs['canvas_bg'].getContext("2d");
                context.strokeStyle = "#000";
                context.strokeWidth = 1;
                context.beginPath();
                context.strokeRect(0 + 0.5, 0 + 0.5, x_end_pos - 0.5, y_height - 0.5);
                context.stroke();
                return;
            },
            changeEcgColor(context, color) {
                if (context.strokeStyle !== color) {
                    context.stroke();
                    context.beginPath();
                    context.strokeStyle = color;
                }
            },
            drawEcg(c_canvas, data, x_pos, x_end_pos, y_start_pos, frequency1, add, y_height) {
                this.getRhythmData(this.rhythmData)
                let frequency = data.length
                if (!data) return false;
                let context = c_canvas.getContext("2d");
                context.lineWidth = 1;
                context.beginPath();
                let length = data.length;

                let normalColor = '#000000';
                let noiseColor = '#838383';
                let afColor = Util.afRythmColor;
                let aflutColor = Util.aflutRythmColor;
                let maxHrColor = Util.vTag;
                let minHrColor = Util.sTag;

                let rhythmMatcherNoise = new RhythmMatcher();
                rhythmMatcherNoise.setRhythms(this.currentPageNoise);
                let rhythmMatcherMaxHr = new RhythmMatcher();
                rhythmMatcherMaxHr.setRhythms(this.currentPageMaxHr);
                let rhythmMatcherMinHr = new RhythmMatcher();
                rhythmMatcherMinHr.setRhythms(this.currentPageMinHr);
                let rhythmMatcherAF = new RhythmMatcher();
                rhythmMatcherAF.setRhythms(this.currentPageAF);
                let rhythmMatcherAFLUT = new RhythmMatcher();
                rhythmMatcherAFLUT.setRhythms(this.currentPageAFLUT);

                let begin = true;
                context.strokeStyle = '#030304';
                context.moveTo(x_pos, y_height / 2 + y_start_pos[0]);
                let halfH = y_height /2, dis = x_end_pos - x_pos // 存储计算结果 尽量减少下面循环负担
                for (let i = 0; i < length; i++) {
                    let xPosition = x_pos + i % frequency / frequency * dis;
                    let yPosition = Util.type(data[i]) !== 'null'?(- data[i] * add * 5*4 + halfH): NaN;
                    //心电曲线变色
                    let currentPointIndex = i*4 + this.moveToPosition; // 因为当前画图的数据每秒只有128个 与后端返回的节律数据频率每秒512个相差四倍 所以乘以4
                    if (rhythmMatcherNoise.find(currentPointIndex)) {
                        this.changeEcgColor(context, noiseColor);
                    } else if (rhythmMatcherMaxHr.find(currentPointIndex)) {
                        this.changeEcgColor(context, maxHrColor);
                    } else if (rhythmMatcherMinHr.find(currentPointIndex)) {
                        this.changeEcgColor(context, minHrColor);
                    } else if (rhythmMatcherAF.find(currentPointIndex)) {
                        this.changeEcgColor(context, afColor);
                    } else if (rhythmMatcherAFLUT.find(currentPointIndex)) {
                        this.changeEcgColor(context, aflutColor);
                    } else {
                        this.changeEcgColor(context, normalColor);
                    }

                    if (begin) {
                        if (xPosition && yPosition) {
                            begin = false;
                            context.moveTo(xPosition, yPosition);
                        }
                    } else {
                        context.lineTo(xPosition, yPosition);
                    }
                }
                context.stroke();
                return;
            },
            // 根据点得到相对于canvas左侧position的位置
            _getRelativeDistance(point, x_start_pos, x_end_pos, frequency) {
                return parseInt((point - x_start_pos) / (x_end_pos - x_start_pos) *frequency)
            },
            emitRange(clickPosition) {
                let start =clickPosition - this._getRelativeDistance(this.box_width / 2,0, this.canvasWidth, pointNum)
                let end = start + 512* 10
                if (start < 0) {
                    start = 0
                }
                if (end > this.ecgEndPosition) {
                    end = this.ecgEndPosition
                }
                this.$emit('curentActiveRange', {range: {start:start, end: end}, position: clickPosition})
            },
            // flag 控制是否计算moveToPosition及clickPosition 0表示是点击的时候 1表示是根据currentPosition变化的时候触发的
            drawBox(click_position, x_start_pos, x_end_pos, frequency, flag = 0) {
                if (this.currentPosition === -1) return
                let context = this.$refs['canvas_box'].getContext('2d')
                context.clearRect(0, 0, this.canvasWidth, this.canvasHeight)
                context.strokeStyle = '#12d726';
                context.lineWidth = 2;
                context.beginPath();
                if (click_position - this.box_width/2 >= 0 && click_position + this.box_width/2 <= this.canvasWidth) { // 点击心电片段
                    if (flag === 0) {
                        this.clickPosition = this.moveToPosition + this._getRelativeDistance(click_position,x_start_pos, x_end_pos, frequency)
                        this.$emit('currentClickPosition', this.clickPosition)
                        this.emitRange(this.clickPosition)
                    }
                    context.strokeRect(click_position - this.box_width/2, 1, this.box_width, this.canvasHeight - 2);
                } else if (click_position - this.box_width/2 < 0) {
                    if (flag === 0) {
                        let overflowDistance = this.box_width / 2 - click_position
                        this.moveToPosition = this.moveToPosition - this._getRelativeDistance(overflowDistance, x_start_pos, x_end_pos, frequency)
                        if (this.moveToPosition < this.ecgStartPosition) {
                            this.moveToPosition = this.ecgStartPosition
                            this.clickPosition = this._getRelativeDistance(this.box_width / 2,x_start_pos, x_end_pos, frequency)
                            this.$emit('currentClickPosition', this.clickPosition)
                            this.$message({
                                message: '已自动对齐到报告的开始',
                                type: 'warning'
                            });
                        } else {
                            this.clickPosition = this.moveToPosition + this._getRelativeDistance(this.box_width / 2,x_start_pos, x_end_pos, frequency)
                            this.$emit('currentClickPosition', this.clickPosition)
                        }
                        this.isDrawBox = false
                        this.getSliceData([this.moveToPosition])
                        this.emitRange(this.clickPosition)
                    }
                    context.strokeRect(0, 1, this.box_width, this.canvasHeight - 2);
                } else if (click_position + this.box_width/2 > this.canvasWidth) {
                    if (flag === 0) {
                        if (this.moveToPosition + pointNum > this.ecgEndPosition) {
                            this.moveToPosition = this.ecgEndPosition - this.ecgData.length
                            this.clickPosition = this.moveToPosition + this._getRelativeDistance(click_position,x_start_pos, x_end_pos, frequency)
                            this.$emit('currentClickPosition', this.clickPosition)
                        } else {
                            let overflowDistance = this.box_width / 2 + click_position - this.canvasWidth
                            this.moveToPosition = this.moveToPosition + this._getRelativeDistance(overflowDistance, x_start_pos, x_end_pos, frequency)
                            this.clickPosition = this.moveToPosition + this._getRelativeDistance(5* this.canvasWidth / 6,x_start_pos, x_end_pos, frequency)
                            this.$emit('currentClickPosition', this.clickPosition)
                        }
                        this.isDrawBox = false
                        this.getSliceData([this.moveToPosition])
                        this.emitRange(this.clickPosition)
                    }
                    context.strokeRect(this.canvasWidth - this.box_width, 1, this.box_width, this.canvasHeight -  2)
                }
                context.stroke();
             }
        }
    }
</script>
<style type="text/css" scoped lang="scss">
.container {
    position: relative;
    width: 1550px;
    margin-top: 10px;
    height: 130px;
}
.currentTime {
    position: absolute;
    top: 15px;
    left: 20px;
    text-align: left;
    -moz-user-select:none;
    -webkit-user-select: none;
    -ms-user-select: none;
}
</style> 