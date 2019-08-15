<template>
    <div>
        <div class="dragOuter">
            <div class="operateBox" ref="operateBox" @click="operateBoxClick">
                <div class="operateLine" :style="{left:operateLinePos.left+'px'}">
                </div>
            </div>
            <canvas width="1000" height="130" class="dragCanvasBox" ref="dragCanvasBox"></canvas>
            <br>
        </div>
    </div>
</template>
<script>
    import {mapMutations, mapState} from 'vuex';
    import API from '../../api/api_ecg_view';
    import Util from '../../common/util';

    export default {
        name: 'dragEcg',
        props: {
            selectHour: {
                type: Number,
                default: 0
            }
        },
        data() {
            return {
                select: false,
                scrollStartTime: 0,
                scrollEndTime: 0,
                operateLinePos: {left: 0},
                selectHourNum: 0
            }
        },
        mounted() {
            this.$refs.operateBox.addEventListener('mousewheel', this.operateBoxScroll);
            this.$refs.operateBox.addEventListener('DOMMouseScroll', this.operateBoxScroll);
        },
        computed: {
            ...mapState(
                'ecgDrag', {
                    heartRates: state => state.heartRates
                }
            ),
            ...mapState('ecgView', {
                ecgStartTime: state => state.ecgStartTime,
                ecgEndTime: state => state.ecgEndTime,
                currentDate: state => state.currentDate,
                symbols: state => state.basicInfo.symbols,
                samplingFrequency: state => state.samplingFrequency,
                dateIndex: state => state.dateIndex
            }),
            report_id: function () {
                return localStorage.getItem('report_id');
            },
        },
        watch: {
            dateIndex: function () {
                this.initCanvas();
            },
            heartRates: function () {
                this.initCanvas();
            },
            selectHour(selectHour) {
                this.selectHourNum = selectHour;
            },
            selectHourNum(selectHourNum) {
                this.operateLinePos.left = Math.floor(selectHourNum * (940 / 24));
            }
        },
        methods: {
            ...mapMutations('ecgDrag', [
                'changeHeartRates'
            ]),
            initCanvas() {
                let c_canvas = this.$refs.dragCanvasBox;
                if (!c_canvas) {
                    return;
                }
                let options = {
                    data: this.heartRates.length === 0 ? [] : this.heartRates[this.dateIndex].data,
                    x_start_pos: 40,
                    x_end_pos: 980,
                    timeData: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
                    symbols: this.symbols
                };
                let context = c_canvas.getContext("2d");
                context.clearRect(0, 0, c_canvas.width, c_canvas.height);
                this.drawGrid(c_canvas, options);
            },
            drawClick(c_canvas, x_start_pos, x_end_pos, timeData) {
                let context = c_canvas.getContext("2d");
                context.strokeStyle = "#000";
                context.strokeWidth = 1;
                context.beginPath();
                context.font = "8pt Calibri";
                context.fillStyle = '#000';
//                绘制x,y轴
                context.moveTo(x_start_pos, 110);
                context.lineTo(x_start_pos, 10);
                context.moveTo(x_start_pos, 80);
                context.lineTo(x_end_pos, 80);
//                绘制y轴click
                for (let y = 140; y >= 40; y -= 10) {
                    context.moveTo(x_start_pos, 10 + (140 - y) * (100 / 100));
                    context.lineTo(x_start_pos - 6, 10 + (140 - y) * (100 / 100));
                    if (y % 40 === 0) {
                        if (y >= 100) {
                            context.fillText(y, x_start_pos - 26, 13 + (140 - y) * (100 / 100));
                        } else {
                            context.fillText(y, x_start_pos - 20, 13 + (140 - y) * (100 / 100));
                        }
                    }
                }
//                绘制x轴click
                for (let x = 0; x < timeData.length; x++) {
                    let xPos = x_start_pos + x * (x_end_pos - x_start_pos) / 24;
                    if (x === 0) continue;
                    context.moveTo(xPos, 80);
                    context.lineTo(xPos, 86);
                    if (timeData[x] >= 10) {
                        context.fillText(timeData[x], xPos - 6, 95);
                    } else {
                        context.fillText(timeData[x], xPos - 3, 95);
                    }
                }
                context.stroke();
                context.closePath();
                return;
            },
            drawEcg(c_canvas, x_start_pos, x_end_pos, data) {
                let context = c_canvas.getContext("2d");
                context.strokeStyle = "#ff0312";
                context.strokeWidth = 1;
                context.beginPath();
                let length = data.length;
                let startData = data[0];
                if (startData < 40) startData = 40;
                if (startData > 140) startData = 140;
                context.moveTo(x_start_pos, 10 + (140 - startData) * (100 / 100));
                for (let i = 1; i < length; i++) {
                    let xPos = x_start_pos + i * (x_end_pos - x_start_pos) / length;
                    let yData = data[i];
                    if (yData < 40) yData = 40;
                    if (yData > 140) yData = 140;
                    let yPos = 10 + (140 - yData) * (100 / 100);
                    let nextData = (i !== length - 1 ? data[i + 1] : data[i]);
                    if (nextData < 40) nextData = 40;
                    if (nextData > 140) nextData = 140;
                    let yPosNext = 10 + (140 - nextData) * (100 / 100);
                    if (yData !== 40) {
                        context.lineTo(xPos, yPos);
                    } else {
                        context.moveTo(xPos, yPosNext);
                    }
                }
                context.stroke();
                context.closePath();
                return;
            },
            drawSymbolLines(c_canvas, x_start_pos, x_end_pos, symbols) {
                let context = c_canvas.getContext("2d");
                context.strokeStyle = "rgb(255,192,0)";
                context.beginPath();
                for (let i = 0; i < symbols.length; i++) {
                    let startDate = new Date(this.ecgStartTime);
                    startDate.setSeconds(startDate.getSeconds() + parseInt(symbols[i] / this.samplingFrequency));
                    let symbolTimeOffset = startDate.getTime() - new Date(this.currentDate).getTime();
                    //处于当天的手动事件才绘制
                    if (symbolTimeOffset >= 0 && symbolTimeOffset <= 24 * 60 * 60 * 1000) {
                        let xPos = x_start_pos + parseInt(symbolTimeOffset / (24 * 60 * 60 * 1000) * (x_end_pos - x_start_pos));
                        context.moveTo(xPos, 0);
                        context.lineTo(xPos, 100);
                    }
                }
                context.stroke();
            },
            drawGrid(c_canvas, options) {
                let {x_start_pos, x_end_pos, timeData, data, symbols} = {...options};
                this.drawClick(c_canvas, x_start_pos, x_end_pos, timeData);
                this.drawEcg(c_canvas, x_start_pos, x_end_pos, data);
                this.drawSymbolLines(c_canvas, x_start_pos, x_end_pos, symbols)
            },
            operateBoxScroll(event) {
                event.preventDefault();
                this.scrollStartTime = new Date().getTime();
                if (this.scrollEndTime - this.scrollStartTime < -100) {
                    let down = true; // 定义一个标志，当滚轮向下滚时，执行一些操作
                    down = event.wheelDelta ? event.wheelDelta < 0 : event.detail > 0;
                    let tempSelectHourNum = this.selectHourNum;
                    if (down) {
                        tempSelectHourNum++;
                    } else {
                        tempSelectHourNum--;
                    }
                    this.operateBoxClickDo(tempSelectHourNum);
                }
                this.scrollEndTime = new Date().getTime();
            },
            operateBoxClick(e) {
                let offsetX = e.clientX - $(this.$refs.operateBox).offset().left;
                this.operateBoxClickDo(Math.floor(offsetX / 940 * 24));
            },
            operateBoxClickDo(selectHourNum) {
                let startDate = new Date(this.ecgStartTime);
                let endDate = new Date(this.ecgEndTime);
                let tempCurrentDate = new Date(this.currentDate);
                tempCurrentDate.setHours(tempCurrentDate.getHours() + selectHourNum);
                let tempDate = new Date(this.currentDate);
                tempDate.setDate(tempDate.getDate() + 1);//当前的下一天
                let ecgPosition = 0;
                //限制只能查看当天心电
                if (tempCurrentDate.getTime() >= new Date(this.currentDate).getTime() && tempCurrentDate.getTime() < tempDate.getTime()) {
                    //判断报告的数据边界
                    if (tempCurrentDate.getTime() >= startDate.getTime() && tempCurrentDate.getTime() <= endDate.getTime()) {
                        ecgPosition = (tempCurrentDate.getTime() - new Date(this.ecgStartTime).getTime()) / 1000 * this.samplingFrequency;
                        this.selectHourNum = selectHourNum;
                    }
                    if (tempCurrentDate.getTime() < startDate.getTime()) {
                        ecgPosition = 0;
                        this.selectHourNum = startDate.getHours();
                        this.$message.closeAll();
                        this.$message({
                            message: '超出测试的最早时间，将自动跳转至第一分钟的心电图！',
                            type: 'warning'
                        });
                    }
                    if (tempCurrentDate.getTime() > endDate.getTime()) {
                        ecgPosition = (endDate.getTime() - new Date(this.ecgStartTime).getTime()) / 1000 * this.samplingFrequency;
                        this.selectHourNum = endDate.getHours();
                        this.$message.closeAll();
                        this.$message({
                            message: '超出测试的最后时间，将自动跳转至心电图的末尾！',
                            type: 'warning'
                        });
                    }
                    this.$emit('change', ecgPosition);
                }
            },
            formatDateHour(time) {
                return time.split(' ')[0] + ' ' + time.split(' ')[1].split(':')[0] + ':00:00';
            }
        },
        beforeDestroy() {
            this.$refs.operateBox.removeEventListener('mousewheel', this.operateBoxScroll);
            this.$refs.operateBox.removeEventListener('DOMMouseScroll', this.operateBoxScroll);
        },
        destroyed() {

        }
    }
</script>
<style scoped lang="scss">
    .dragOuter {
        position: relative;
        box-sizing: border-box;
        width: 1000px;
        height: 146px;
        overflow: hidden;
        .operateBox {
            position: absolute;
            z-index: 99;
            box-sizing: border-box;
            width: 940px;
            left: 40px;
            height: 126px;
            .operateLine {
                position: absolute;
                left: 0;
                top: 5px;
                width: 38px;
                height: 100%;
                border: 1px solid #12d726;
            }
        }
    }

    .dragCanvasBox {
        position: absolute;
        box-sizing: border-box;
        bottom: 0;
        width: 1000px;
        height: 130px;
    }
</style>