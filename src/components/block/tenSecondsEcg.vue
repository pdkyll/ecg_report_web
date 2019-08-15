<template>
    <div style="position:relative;margin-top: 10px;position: relative;height: 230px" :style="{'width': canvasWidth + 'px'}" ref="selfCanvasWidth" v-loading="ecgLoading" @click="jumpToEcgPos($event)">
        <div ref="time" style="position: absolute;left: 0;height: 230px;top: 0;box-sizing:border-box;vertical-align: bottom;width: 30px;"><p style="position: absolute;bottom: 20px;left: -15px;">{{showTime}}</p></div>
        <canvas ref="selfScatterCanvas" :width="canvasWidth" height="230px" style="position: absolute;top: 0;left: 0"></canvas>
    </div>
</template>
<script>
    import {EcgViewer} from '../../common/ecg_viewer';
    import {mapState, mapMutations} from 'vuex';
    import axios from 'axios'
    import Util from '../../common/util';
    import {bus} from '../../bus';

    const FREQUENCY = 512* 10
    export default {
        name: 'tenSecondsEcg',
        props: {
            showPosition: {
                type: Number,
                default: -5120
            },
            canvasWidth: {
                type: Number,
                default: 1550
            },
            isDrawBox: {
                type: Boolean,
                default: true
            }
        },
        data() {
            return {
                moveToPosition: null,
                boxStartPosition: null,
                clickPosition: null,
                report_id: 0,
                ecgViewer: null,
                ecgData: [],
                tagData: [],
                highLightBlock: {
                    start: 757,
                    end: 789
                },
                fillColorMap: {  // N,V,S,Q的颜色值
                    N: Util.nTag, //#1dd307
                    V: Util.vTag,
                    S: Util.sTag,
                    Q: Util.qTag
                },
                showTime: '',
                ecgLoading: false
            }
        },
        computed: {
//            ...mapState('afView', {
//                showPosition: state => parseInt(state.selectedPosition)
//            }),
            ...mapState('ecgView', {
                ecgStartTime: state => state.ecgStartTime,
                lastBlockIndex: state => state.lastBlockIndex
            })
        },
        watch: {
            showPosition: function (val, oldVal) {
                if (val === oldVal) return
                if (!this.ecgViewer) return;
                this.ecgLoading = true;
                let moveToPosition = this.showPosition;
                if (moveToPosition > 2560) {
                    moveToPosition = this.showPosition - 2560;
                }else {
                    moveToPosition = 0
                }
                if (this.showPosition === -5120) {
                    this.showTime = '';
                } else {
                    this.showTime = this.calcEcgTime(this.showPosition);
                    let boxWidth = 30
                    let start = (this.showPosition - moveToPosition) % FREQUENCY / FREQUENCY * this.canvasWidth - boxWidth/2
                    this.boxStartPosition = {start:start, end:start+ 32}
                }
                if (moveToPosition !== this.moveToPosition) {
                    this.moveToPosition = moveToPosition
                    this.ecgViewer.moveTo(moveToPosition);
                } else {
                    let index = this.tagData.findIndex((val) => {
                        return val.p === this.showPosition
                    });
                    if (index === -1) {
                        this.selectSpliceType = 'N';
                    } else {
                        this.selectSpliceType = this.tagData[index].t;
                    }
                    this.initCanvas();
                    this.ecgLoading = false
                }
            }
        },
        beforeDestroy() {
            this.ecgViewer = null
        },
        deactivated() {
            this.ecgViewer = null
        },
        activated() {
            this.initEcgViewer();
            this.initCanvas();
        },
        mounted() {
            this.report_id = localStorage.getItem('report_id');
            this.canvasWidth = $(this.$refs['selfCanvasWidth']).width();
        },
        methods: {
            ...mapMutations('ecgView', [
                'changeSelectComponent'
            ]),
            changePositionHalfEcg(data) {
                let range = data.range
                if (range.start< this.showPosition && this.showPosition < range.end) {
                    if(range.start === this.moveToPosition) return
                    let frequency = 512 * 10, boxWidth = 30;
                    let c_canvas = this.$refs['selfScatterCanvas'];
                    let start = (this.showPosition - range.start) % frequency / frequency * this.canvasWidth - boxWidth/2
                    this.boxStartPosition = {start:start, end:start+ 32}
                } else {
                    this.boxStartPosition = -1
                }
                if (this.moveToPosition !== range.start) {
                    this.moveToPosition = range.start
                    this.ecgViewer.moveTo(range.start);
                } else {
                    let index = this.tagData.findIndex((val) => {
                        return val.p === this.showPosition
                    });
                    if (index === -1) {
                        this.selectSpliceType = 'N';
                    } else {
                        this.selectSpliceType = this.tagData[index].t;
                    }
                    this.initCanvas();
                    this.ecgLoading = false
                }
            },
            flatArray(arr) {
                return arr.reduce((pre, cur) => {
                    return pre.concat(cur);
                }, []);
            },
            initEcgViewer() {
                if (this.ecgViewer === null) {
                    this.ecgViewer = new EcgViewer(
                            this.report_id, // reportId
                            512 * 60, // 块大小
                            this.lastBlockIndex + 1, // 块数量
                            512 * 10, // 显示数据量
                            0, // 向前预加载显示数据的2倍
                            0, // 向后预加载显示数据的2倍,
                            () => {
                                this.ecgData = this.ecgViewer.getVisibleData();
                                if (this.ecgData) {
                                    let requestId = this.ecgViewer.getRequestId();
                                    axios.get('/ecg/abnormal_list', {
                                        headers: {
                                            'id': requestId
                                        },
                                        params: {
                                            report_id: this.report_id,
                                            start: this.moveToPosition,
                                            end: this.moveToPosition + 5120
                                        }
                                    }).then(data => {
                                        this.ecgLoading = false;
                                        this.tagData = data.data.tagPos;
                                        let index = this.tagData.findIndex((val) => {
                                            return val.p === this.showPosition
                                        });
                                        if (index === -1) {
                                            this.selectSpliceType = 'N';
                                        } else {
                                            this.selectSpliceType = this.tagData[index].t;
                                        }
                                        this.initCanvas();
                                    }).catch(err => {
                                        this.ecgLoading = false;
                                    });
                                }
                            }
                    );
                }
            },
            jumpToEcgPos(event) {
                if (this.showPosition !== -5120) {
                    this.changeSelectComponent('main');
                    if (this.boxStartPosition !==  -1) {
                        bus.$emit('getPosEcg', this.showPosition, false, false);
                    } else {
                        let dis = event.pageX - $(this.$refs.selfScatterCanvas).offset().left
                        let position = this.moveToPosition + parseInt((dis - 0) / (this.canvasWidth - 0) *FREQUENCY)
                        bus.$emit('getPosEcg', position, false, true);
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
            initCanvas() {
                let c_canvas = this.$refs['selfScatterCanvas'];
                let options = {
                    data: this.ecgData,
                    frequency: 512 * 10,
                    x_start_pos: 0,
                    x_end_pos: this.canvasWidth,
                    y_start_pos: [30],
                    y_height: 200,
                    add: 10,
                    tagData: this.tagData,
                    rhythm: []
                };
                let context = c_canvas.getContext("2d");
                context.clearRect(0, 0, c_canvas.width, c_canvas.height);
                this.drawGrid(c_canvas, options);
            },
            drawBigGrid(c_canvas, x_pos, x_end_pos, y_start_pos, y_height) {
                let context = c_canvas.getContext("2d");
                context.strokeStyle = "#000";
                context.strokeWidth = 1;
                context.beginPath();
                context.strokeRect(0 + 0.5, 0 + 0.5, x_end_pos - 0.5, y_height - 0.5 + 30);
                y_start_pos.map(item => {
                    let y_end_pos = item + y_height;
                    context.moveTo(x_pos + 0.5, item + 0.5);
                    context.lineTo(x_end_pos, item + 0.5);
//                    context.moveTo(x_pos + 0.5, item + 0.5);
//                    context.lineTo(x_pos + 0.5, y_end_pos - 0.5);
//                    context.moveTo(x_end_pos, item + 0.5);
//                    context.lineTo(x_end_pos, y_end_pos - 0.5);
//                    context.moveTo(x_pos + 0.5, y_end_pos - 0.5);
//                    context.lineTo(x_end_pos, y_end_pos - 0.5);
                });
                context.stroke();
                return;
            },
            drawMediumGrid(c_canvas, x_pos, x_end_pos, y_start_pos, y_height) {
                let context = c_canvas.getContext("2d");
                context.strokeStyle = "#c3c3dc";
                context.strokeWidth = 1;
                context.beginPath();
                y_start_pos.map(item => {
                    let y_end_pos = item + y_height;
                    for (let x = x_pos; x < x_end_pos; x += 25) {
                        context.moveTo(x + 0.5, item + 0.5);
                        context.lineTo(x + 0.5, y_end_pos - 0.5);
                    }
                    for (let y = item; y < y_end_pos; y += 25) {
                        context.moveTo(x_pos + 0.5, y + 0.5);
                        context.lineTo(x_end_pos, y + 0.5);
                    }
                });
                context.stroke();
                return;
            },
            drawSmallGrid(c_canvas, x_pos, x_end_pos, y_start_pos, y_end_pos) {
                let context = c_canvas.getContext("2d");
                context.strokeStyle = "#d7e7ed";
                context.beginPath();
                for (let x = x_pos; x <= x_end_pos; x += 5) {
                    context.moveTo(x + 0.5, 30 + 0.5);
                    context.lineTo(x + 0.5, y_end_pos + 30 - 0.5);
                }
                for (let y = 30; y <= y_end_pos + 30; y += 5) {
                    context.moveTo(x_pos + 0.5, y + 0.5);
                    context.lineTo(x_end_pos, y + 0.5);
                }
                context.stroke();
            },
            drawEcg(c_canvas, data, x_pos, x_end_pos, y_start_pos, frequency, add, y_height) {
                let context = c_canvas.getContext("2d");
                context.lineWidth = 1;
                context.beginPath();
                let length = data && data.length;
                context.moveTo(x_pos, y_height / 2 + y_start_pos[0]);
                let color = this.fillColorMap[this.selectSpliceType];
                if (this.selectSpliceType === 'N') {
                    color = '#312bff'
                }
                for (let i = 0; i < length; i++) {
                    let xPosition = x_pos + i % frequency / frequency * (x_end_pos - x_pos);
                    let yPosition = 30 - data[i] * add * 5 + y_height / 2;
                    if (xPosition >= this.boxStartPosition.start && xPosition <= this.boxStartPosition.end && this.boxStartPosition !== -1) {
                        if (context.strokeStyle !== color) {
                            context.stroke();
                            context.beginPath();
                            context.strokeStyle = color;
                        }
                    } else {
                        if (context.strokeStyle !== '#030304') {
                            context.stroke();
                            context.beginPath();
                            context.strokeStyle = '#030304';
                        }
                    }
                    context.lineTo(xPosition, yPosition);
                }
                context.stroke();
                if (this.boxStartPosition !== -1) {
                    $(this.$refs.time).css({
                        display: 'block',
                        left: this.boxStartPosition.start + 'px'
                    })
                } else {
                    $(this.$refs.time).css({
                        display: 'none'
                    })
                }
                return;
            },
            drawTags(c_canvas, x_pos, x_end_pos, y_start_pos, tagData, frequency) {
                let context = c_canvas.getContext("2d");
                context.beginPath();
                tagData.map((item, index) => {
                    let xPosition = (item.p - this.moveToPosition) % frequency / frequency * (x_end_pos - x_pos) + x_pos;
                    context.font = "12pt Calibri";
                    context.fillStyle = "red";
                    context.fillText(item.t, xPosition - 10, 20);
                    context.lineWidth = 2;
                    if (this.boxStartPosition !== -1 && this.isDrawBox) {
                        if (xPosition >= this.boxStartPosition.start && xPosition <= this.boxStartPosition.end && this.boxStartPosition !== -1) {
                            context.strokeStyle = '#224df8';
                            context.strokeRect(this.boxStartPosition.start, 30, 30, 199);
                        }
                    }
                    if (tagData[index + 1]) {
                        context.fillStyle = "#000";
                        let fillText = parseInt((tagData[index + 1].p - tagData[index].p) / 512 * 1000);
                        let nextXPosition = (tagData[index + 1].p - this.moveToPosition) % frequency / frequency * (x_end_pos - x_pos) + x_pos;
                        context.font = "10pt Calibri";
                        context.fillText(fillText, xPosition + (nextXPosition - xPosition) / 2 - 10, 20);
                    }
                    context.moveTo(xPosition - 4, 30);
                    context.lineTo(xPosition - 4, 26);
                });
                context.stroke();
                return;
            },
            drawGrid(c_canvas, options) {
                let {data, x_start_pos, x_end_pos, y_start_pos, y_height, tagData, frequency, add, rhythm} = {...options};
//                绘制网格线
                this.drawSmallGrid(c_canvas, x_start_pos, x_end_pos, y_start_pos, y_height);
                this.drawMediumGrid(c_canvas, x_start_pos, x_end_pos, y_start_pos, y_height);
                this.drawBigGrid(c_canvas, x_start_pos, x_end_pos, y_start_pos, y_height);
                if (this.showPosition !== -5120) {
                    this.drawTags(c_canvas, x_start_pos, x_end_pos, y_start_pos, tagData, frequency);
                    this.drawEcg(c_canvas, data, x_start_pos, x_end_pos, y_start_pos, frequency, add, y_height);
                }
            }
        }
    }
</script>
<style scoped>

</style>