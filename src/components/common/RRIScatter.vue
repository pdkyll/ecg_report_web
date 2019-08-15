<template>
    <div class="wrapper">
        <div ref="RRIScatterChart" :style="{width: width+'px',height: height+'px'}" class="chart">
        </div>
        <!--<div class="clicked-line" v-if="clickedLine !== null"
             :style="{left: clickedLine.position + 'px'}"></div>-->
        <div
                class="dragged-region"
                v-if="draggedRegion !== null"
                :style="{
                    left: draggedRegion.left + 'px',
                    width: draggedRegion.width + 'px'
                }">
            <div class="dragged-start-time dragged-time" v-if="dragTimeRange!==null">
                {{dragTimeRange !== null ? dragTimeRange.start : ''}}
            </div>
            <div class="dragged-end-time dragged-time"
                 v-if="dragTimeRange!==null && dragTimeRange.start!==dragTimeRange.end">
                {{dragTimeRange !== null ? dragTimeRange.end : ''}}
            </div>
        </div>
    </div>
</template>
<script>
    import echarts from 'echarts';
    import {mapState, mapMutations, mapActions} from 'vuex';
    import Util from '../../common/util';

    const X_AXIS_DATA = (function () {
        let arr = new Array(24);
        for (let i = 0; i < arr.length; i++) {
            arr[i] = i;
        }
        return arr;
    })();
    export default {
        name: 'RRIScatter',
        props: {
            data: {
                type: Array,
                required: true
            },
            width: {
                type: Number,
                default: 1000
            },
            height: {
                type: Number,
                default: 150
            },
            xStartTime: {
                type: String,
                required: true
            },
            symbolColor: {
                type: String,
                required: true
            },
            resetRRIHandle: {
                type: Boolean,
                default: true
            }
        },
        data() {
            return {
                loading: false,
                chart: null,
                clickedLine: null, //null or { timeStamp, position }
                draggedRegion: null, // null or { start, end, left, width }
                dragTimeRange: null
            }
        },
        methods: {
            changeRRILoading(data) {
                this.loading = data;
            },
            drawChart() {
                let option = {
                    animation: false,
                    grid: {
                        left: 40,
                        right: 40,
                        top: 25,
                        bottom: 20
                    },
                    xAxis: [
                        {
                            type: 'value',
                            show: false,
                            min: this.xData.xMin,
                            max: this.xData.xMax
                        },
                        {
                            type: 'value',
                            data: X_AXIS_DATA,
                            min: 0,
                            max: 24,
                            interval: 2,
                            axisLabel: {
                                formatter: function (value) {
                                    return (value < 10 ? "0" : "") + value + ":00"
                                }
                            },
                            position: 'bottom',
                            splitLine: {
                                show: false
                            }
                        }
                    ],
                    yAxis: {
                        type: 'value',
                        name: '(ms)',
                        splitLine: {
                            show: false
                        },
                        min: 0,
                        max: 3000,
                    },
                    series: [{
                        data: this.data,
                        type: 'scatter',
                        symbolSize: 4,
                        large: true,
                        itemStyle: {
                            color: this.symbolColor
                        }
                    }]
                };
                this.chart.setOption(option);
                this.loading = false;
            },
            formatTimeRange(time) {
                return time.split(' ')[1];
            },
            reset() {
                this.clickedLine = null;
                this.draggedRegion = null;
                this.dragTimeRange = null;
            },
            JudgeBoundary(e) {
                let startTimePx = this.chart.convertToPixel({xAxisIndex: 0}, new Date(this.ecgStartTime).getTime());
                let endTimePx = this.chart.convertToPixel({xAxisIndex: 0}, new Date(this.ecgEndTime).getTime());
                let startTimeStamp = new Date(this.ecgStartTime).getTime();
                let endTimeStamp = new Date(this.ecgEndTime).getTime();
                let timeStamp = parseInt(this.chart.convertFromPixel('xAxis', [e.offsetX]));
                let tempTimeStamp = timeStamp;
                let tempPosX = e.offsetX;
                if (timeStamp < startTimeStamp) {
                    tempTimeStamp = startTimeStamp;
                    tempPosX = startTimePx;
                } else if (timeStamp > endTimeStamp) {
                    tempTimeStamp = endTimeStamp;
                    tempPosX = endTimePx;
                }
                return {
                    timeStamp: tempTimeStamp,
                    positionX: tempPosX
                }
            },
            endDragX() {
                if (this.draggedRegion !== null) {
                    if (this.draggedRegion.startTime === this.draggedRegion.endTime) {
                        this.draggedRegion = null;
                        return;
                    }
                    if (new Date(this.draggedRegion.startTime).getTime() > new Date(this.draggedRegion.endTime).getTime()) {
                        this.$emit('selectTimeRange', {
                            start: this.draggedRegion.endTime,
                            end: this.draggedRegion.startTime
                        });
                    } else {
                        this.$emit('selectTimeRange', {
                            start: this.draggedRegion.startTime,
                            end: this.draggedRegion.endTime
                        });
                    }
                }
            },
            selectOneHour() {
                let date = new Date(this.clickedLine.timeStamp);
                date.setSeconds(date.getSeconds() - 30 * 60);
                let startTime = '';
                let endTime = '';
                if (date.getTime() < new Date(this.ecgStartTime).getTime()) {
                    startTime = this.ecgStartTime;
                    date = new Date(this.ecgStartTime);
                } else if (date.getTime() < this.xData.xMin) {
                    startTime = Util.formatTimeM(new Date(this.xData.xMin));
                    date = new Date(this.xData.xMin);
                } else {
                    startTime = Util.formatTimeM(date);
                }
                date.setSeconds(date.getSeconds() + 60 * 60);
                if (date.getTime() > new Date(this.ecgEndTime).getTime()) {
                    endTime = this.ecgEndTime;
                    date = new Date(this.ecgEndTime);
                    //往后取，不足一小时，向前补齐
                    date.setSeconds(date.getSeconds() - 60 * 60);
                    if (date.getTime() < new Date(this.ecgStartTime).getTime()) {
                        startTime = this.ecgStartTime;
                    } else {
                        startTime = Util.formatTimeM(date);
                    }
                } else if (date.getTime() > new Date(this.xData.xMax).getTime()) {
                    endTime = Util.formatTimeM(new Date(this.xData.xMax));
                    //往后取，不足一小时，向前补齐
                    date = new Date(this.xData.xMax);
                    date.setSeconds(date.getSeconds() - 60 * 60);
                    if (date.getTime() < new Date(this.ecgStartTime).getTime()) {
                        startTime = this.ecgStartTime;
                    } else {
                        startTime = Util.formatTimeM(date);
                    }
                } else {
                    endTime = Util.formatTimeM(date);
                }
                return {start: startTime, end: endTime};
            }
        },
        computed: {
            ...mapState('ecgView', {
                ecgStartTime: state => state.ecgStartTime,
                ecgEndTime: state => state.ecgEndTime
            }),
            xData() {
                let date = new Date(this.xStartTime);
                let xMin = date.getTime();
                date.setDate(date.getDate() + 1);
                let xMax = date.getTime();
                return {xMin, xMax};
            },
        },
        watch: {
            data() {
                if (this.resetRRIHandle) {
                    this.reset();//重置图表上的所有操作
                }
                this.drawChart();
            }
        },
        mounted() {
            this.chart = echarts.init(this.$refs.RRIScatterChart);
            this.chart.getZr().on('click', (e) => {
                if (e.offsetX < 40 || e.offsetX > (this.width-40) || this.draggedRegion !== null) {
                    return;
                }
                let {timeStamp, positionX} = this.JudgeBoundary(e);
                this.clickedLine = {timeStamp: timeStamp, position: positionX};
                let selectOneHour = this.selectOneHour();
                let selectAreaLeft = this.chart.convertToPixel({xAxisIndex: 0}, new Date(selectOneHour.start).getTime());
                let selectAreaRight = this.chart.convertToPixel({xAxisIndex: 0}, new Date(selectOneHour.end).getTime());
                //点击和x轴拖拽公用一个UI
                this.draggedRegion = {
                    x: selectAreaLeft,
                    left: selectAreaLeft,
                    width: selectAreaRight - selectAreaLeft,
                    startTime: selectOneHour.start,
                    endTime: selectOneHour.end
                };
                this.dragTimeRange = {
                    start: this.formatTimeRange(selectOneHour.start),
                    end: this.formatTimeRange(selectOneHour.end),
                };
                this.$emit('selectTime', selectOneHour);
            });
            this.chart.getZr().on('mousedown', e => {
                let event = e.event ? e.event : window.event;
                if (event.buttons === 1) {
                    if (e.offsetX < 40 || e.offsetX > (this.width-40)) {
                        return;
                    }
                    this.dragTimeRange = null;
                    this.draggedRegion = null;
                    let {timeStamp, positionX} = this.JudgeBoundary(e);
                    this.draggedRegion = {
                        x: positionX,
                        left: positionX,
                        width: 0,
                        startTime: Util.formatTimeM(new Date(timeStamp)),
                        endTime: Util.formatTimeM(new Date(timeStamp))
                    };
                }
            });
            this.chart.getZr().on('mousemove', e => {
                let event = e.event ? e.event : window.event;
                if (this.draggedRegion !== null && event.buttons === 1) {
                    if (e.offsetX < 40 || e.offsetX > (this.width-40)) {
                        return;
                    }
                    let {timeStamp, positionX} = this.JudgeBoundary(e);
                    let left = this.draggedRegion.x;
                    let right = positionX;
                    if (left > right) {
                        [left, right] = [right, left];
                    }
                    this.draggedRegion = {
                        ...this.draggedRegion,
                        left: left,
                        width: right - left,
                        endTime: Util.formatTimeM(new Date(timeStamp))
                    };
                    if (new Date(this.draggedRegion.startTime).getTime() > new Date(this.draggedRegion.endTime).getTime()) {
                        this.dragTimeRange = {
                            start: this.formatTimeRange(this.draggedRegion.endTime),
                            end: this.formatTimeRange(this.draggedRegion.startTime),
                        };
                    } else {
                        this.dragTimeRange = {
                            start: this.formatTimeRange(this.draggedRegion.startTime),
                            end: this.formatTimeRange(this.draggedRegion.endTime),
                        };
                    }
                }
            });
            this.chart.getZr().on('mouseup', e => {
                this.endDragX();
            });
            let $chartDom = $(this.chart.getZr().dom);
            $chartDom.on("mouseleave", e => {
                this.endDragX();
            });
        },
        beforeDestroy() {
            $(this.chart.getZr().dom).off();
            this.chart.dispose();
            this.chart=null;
        }
    }
</script>
<style scoped lang="scss">
    $line-color: #aaaaaa;
    $area-color: #555555;
    div.wrapper {
        width: 100%;
        margin: auto;
        position: relative;
        div.chart {
            height: 100%;
        }
        div.clicked-line {
            position: absolute;
            width: 0;
            top: 15px;
            bottom: 20px;
            border-left: solid 1px #ff1eba;
            pointer-events: none;
        }
        div.dragged-region {
            position: absolute;
            background-color: $area-color;
            border-left: solid 1px $line-color;
            border-right: solid 1px $line-color;
            top: 15px;
            bottom: 20px;
            opacity: 0.5;
            pointer-events: none;
            .dragged-start-time {
                left: -56px;
            }
            .dragged-end-time {
                right: -56px;
            }
            .dragged-time {
                position: absolute;
                top: -15px;
                color: #000;
                font-size: 14px;
                font-weight: bold;
            }
        }
    }
</style>