<template>
    <div class="warpper">
        <div ref="myChart" :style="{width: canvasWidth + 'px', height: canvasHeight + 'px'}"
             v-if="hackResetBlock"></div>
        <div
                class="dragged-region"
                v-if="xAxisDraggingInfo !== null"
                :style="{
                    left: xAxisDraggingInfo.left + 'px',
                    width: xAxisDraggingInfo.width + 'px',
                    height: canvasHeight + 'px'
                }">
        </div>
    </div>
</template>
<script>
    import {mapState} from 'vuex';
    import echarts from 'echarts';
    import Util from '../../common/util';

    export default {
        props: {
            keyItem: {
              type: Number,
              default: 0
            },
            showData: {
                type: Array,
                default: [],
            },
            canvasHeight: {
                type: Number,
                default: 300
            },
            canvasWidth: {
                type: Number,
                default: 1500
            },
            jianqi: {
                type: Boolean,
                default: false
            },
            onSelectChange: {
                type: Boolean,
                default: false
            },
            sendDatable: {
                type: Boolean,
                default: false
            }
        },
        name: 'HistogramBlock',
        data() {
            return {
                chart: null,
                degree: 25,
                selectPanelTop: 0,
                selectEchartIndex: [],
                diffDegreeNum: 50,
                clickedLine: null,
                xAxisDraggingInfo: null,
                startClickIndex: -1,
                endClickIndex: -1,
                clickIndex: -1,
                onCtrlState: false,
                onShiftState: false,
                hackResetBlock: true,
                sendData: []
            }
        },
        mounted() {
            this.drawEchart();
            this.caclSendData(this.showData);
            if (this.sendDatable) {
                this.sendSelectData();
            }
            this.bindEvents();
        },
        watch: {
            showData() {
                this.drawEchart();
                this.caclSendData(this.showData);
                if (this.sendDatable) {
                    this.sendSelectData();
                }
            },
            canvasHeight() {
                this.hackResetBlock = false;
                this.$nextTick(() => {
                    this.hackResetBlock = true;
                    setTimeout(() => {
                        this.chart.dispose();
                        this.drawEchart();
                        this.caclSendData(this.showData);
                        if (this.sendDatable) {
                            this.sendSelectData();
                        }
                        this.bindEvents();
                    }, 0);
                });
            }
        },
        computed: {
            ...mapState('ecgView', {
                selectComponent: state => state.selectComponent
            }),
            flatShowData: function () {
                return Util.flatArray(this.showData).sort((a, b) => a.p - b.p);
            }
        },
        methods: {
            bindEvents() {
                this.chart.getZr().on('mousemove', (e) => {
                    if (this.xAxisDraggingInfo) {
                        let width = e.offsetX - this.xAxisDraggingInfo.from;
                        if (width > 0) {
                            this.xAxisDraggingInfo = {
                                ...this.xAxisDraggingInfo,
                                width: width
                            };
                        } else {
                            this.xAxisDraggingInfo = {
                                ...this.xAxisDraggingInfo,
                                left: e.offsetX,
                                width: Math.abs(width)
                            };
                        }
                    }
                });
                let chartDom = this.$refs.myChart;
                chartDom.addEventListener('mousedown', this.setStartClick);
                chartDom.addEventListener('mouseup', this.clickFunc);
                chartDom.addEventListener('mouseleave', () => {
                    this.xAxisDraggingInfo = null;
                });
                document.removeEventListener('keydown', this.bindCtrlShiftState);
                document.addEventListener('keydown', this.bindCtrlShiftState);
                document.removeEventListener('keyup', this.removeCtrlShiftState);
                document.addEventListener('keyup', this.removeCtrlShiftState);
            },
            setStartClick(e) {
                this.xAxisDraggingInfo = {
                    ...this.xAxisDraggingInfo,
                    left: e.offsetX,
                    from: e.offsetX
                };
                if (this.clickIndex !== -1 && this.chart) {
                    this.startClickIndex = this.clickIndex;
                }
            },
            bindCtrlShiftState(e) {
                let keyCode = e.keyCode;
                this.onCtrlState = keyCode === 17;
                this.onShiftState = keyCode === 16;
            },
            removeCtrlShiftState() {
                this.onCtrlState = false;
                this.onShiftState = false;
            },
            clickFunc(e) {
                if (e.button === 0) {
                    if (this.clickIndex !== -1 && this.chart) {
                        this.endClickIndex = this.clickIndex;
                        let temp = null;
                        if (this.startClickIndex > this.endClickIndex) {
                            temp = this.startClickIndex;
                            this.startClickIndex = this.endClickIndex;
                            this.endClickIndex = temp;
                        }
                        let tempSelectIndex = new Set();
                        let sendData = [];
                        let sortIndex = this.selectEchartIndex.sort((a, b) => a - b);
                        let min = sortIndex[0];
                        let max = sortIndex[sortIndex.length - 1];
                        /**
                         * 当ctrlButton 按下的时候保留上一次操作的值
                         */
                        if (this.onCtrlState) {
                            this.selectEchartIndex.map(item => {
                                tempSelectIndex.add(item)
                            });
                        }
                        /**
                         * 当shiftButton 按下的时候就要去重置startClickIndex 和 EndClickIndex的值
                         */
                        if (this.onShiftState) {
                            if (this.startClickIndex >= min) {
                                this.startClickIndex = min;
                            }
                            if (this.endClickIndex <= max) {
                                this.endClickIndex = max
                            }
                        }
                        for (let i = this.startClickIndex; i <= this.endClickIndex; i++) {
                            let temp = Array.from(tempSelectIndex);
                            let index = temp.indexOf(i);
                            if (this.jianqi) {
                                if (this.showData[i * 10]) {
                                    if (index !== -1) {
                                        temp.splice(index, 1);
                                        tempSelectIndex = new Set(temp);
                                    } else {
                                        tempSelectIndex.add(i);
                                    }
                                }
                            } else {
                                if (this.showData[i]) {
                                    if (index !== -1) {
                                        temp.splice(index, 1);
                                        tempSelectIndex = new Set(temp);
                                    } else {
                                        tempSelectIndex.add(i);
                                    }
                                }
                            }
                        }
                        this.selectEchartIndex = Array.from(tempSelectIndex);
                        this.$emit('resetChangeFlag');
                        this.drawEchart();
                        this.caclSendData(this.showData);
                        this.sendSelectData();
                    }
                }
                this.xAxisDraggingInfo = null;
            },
            sendSelectData() {
                if (this.selectEchartIndex.length === 0) {
                    if (!this.onSelectChange) {
                        this.$emit('changeSelectArray', this.flatShowData);
                    } else {
                        this.$emit('changeSelectArray', [], false);
                    }
                } else {
                    this.sendSeriesData();
                }
            },
            caclSendData(positions) {
                let sendData = [];
                this.selectEchartIndex.map(item => {
                    if (this.jianqi) {
                        if (positions[item * 10]) {
                            sendData = sendData.concat(positions[item * 10])
                        }
                    } else {
                        if (positions[item]) {
                            sendData = sendData.concat(positions[item])
                        }
                    }
                });
                let clear = this.selectEchartIndex.length && sendData.length === 0;
                this.sendData = sendData;
                this.$emit('changeSelectData', sendData, clear);
            },
            sendSeriesData() {
                if (this.onSelectChange && this.sendData.length) {
                    this.$emit('clearOtherSelect');
                    this.$emit('changeSelectArray', this.sendData);
                } else {
                    if (this.sendData.length) {
                        this.$emit('changeSelectArray', this.sendData);
                    } else {
                        this.selectEchartIndex = [];
                        this.$emit('changeSelectArray', this.flatShowData, false);
                    }
                }
            },
            initEcharts() {
                this.selectEchartIndex = [];
            },
            drawEchart() {
                let dom = this.$refs.myChart;
                let that = this;
                if (dom) {
                    this.chart = echarts.init(dom);
                    let xData = [];
                    let data = [];
                    let max = 0;
                    let tempData = Object.assign([], this.showData);
                    if (tempData) {
                        for (let i in tempData) {
                            if (Number(i) > max) {
                                max = i;
                            }
                        }
                        if (max >= 120) max = 120;
                        if (this.jianqi) {
                            for (let t = 0; t <= max; t++) {
                                if (t % 10 === 0) {
                                    xData.push(t);
                                    if (tempData[t]) {
                                        data.push(tempData[t].length);
                                    } else {
                                        data.push(0);
                                    }
                                }
                            }
                        } else {
                            for (let t = 0; t <= max; t++) {
                                xData.push(t * this.degree);
                                if (tempData[t]) {
                                    data.push(tempData[t].length);
                                } else {
                                    data.push(0);
                                }
                            }
                        }
                        if (xData.length === 0) {
                            xData.push(0);
                            data.push(0);
                        }
                        let option = {
                            tooltip: {
                                trigger: 'axis',
                                axisPointer: {
                                    type: 'cross',
                                    label: {
                                        backgroundColor: '#283b56'
                                    }
                                },
                                formatter: function (params) {
                                    let html = '';
                                    if (params.length > 0) {
                                        that.clickIndex = params[0].dataIndex;
                                        for (let int = 0; int < params.length; int++) {
                                            let retHtml = `RR间期:${params[int].axisValue}-${Number(params[int].axisValue) + 25}<br>共:${params[int].data}条`;
                                            if (that.jianqi) {
                                                retHtml = `RR间期比:${params[int].axisValue}%<br>共:${params[int].data}条`
                                            }
                                            html += retHtml;
                                        }
                                    }
                                    return html;
                                }
                            },
                            grid: {
                                x: 40,
                                y: 10,
                                x2: 10,
                                y2: 40
                            },
                            draggable: false,
                            xAxis: {
                                data: xData,
                                axisLabel: {
                                    inside: false,
                                    textStyle: {
                                        color: '#000'
                                    },
                                    fontSize: 12
                                },
                                axisTick: {
                                    show: false
                                },
                                axisLine: {
                                    show: false
                                },
                                z: 10
                            },
                            yAxis: {
                                axisLine: {show: false},
                                axisTick: {show: false},
                                axisLabel: {
                                    textStyle: {
                                        color: '#999'
                                    },
                                    formatter: function (value) {
                                        if (value.toString().indexOf('.') === -1) {
                                            return value;
                                        }
                                    }
                                }
                            },
                            dataZoom: [{
                                type: 'inside',
                                moveOnMouseMove: false
                            }],
                            series: [
                                {
                                    type: 'bar',
                                    animation: false,
                                    clickable: false,
                                    itemStyle: {
                                        normal: {
                                            color: function (parms) {
                                                if (that.selectEchartIndex.indexOf(parms.dataIndex) !== -1) {
                                                    return new echarts.graphic.LinearGradient(
                                                        0, 0, 0, 1,
                                                        [
                                                            {offset: 0, color: '#83bff6'},
                                                            {offset: 0.5, color: '#188df0'},
                                                            {offset: 1, color: '#188df0'}
                                                        ]
                                                    )
                                                }
                                                return new echarts.graphic.LinearGradient(
                                                    0, 0, 0, 1,
                                                    [
                                                        {offset: 0, color: '#f7dc0f'},
                                                        {offset: 0.5, color: '#f0e172'},
                                                        {offset: 1, color: '#f6f3e6'}
                                                    ]
                                                )
                                            }
                                        }
                                    },
                                    data: data
                                }
                            ]
                        };
                        this.chart.setOption(option);
                    }
                }
            }
        }
    }
</script>
<style scoped lang="scss">
    $line-color: #aaaaaa;

    $area-color: #555555;

    .warpper {
        position: relative;

        .dragged-region {
            position: absolute;
            background-color: $area-color;
            border-left: solid 1px $line-color;
            border-right: solid 1px $line-color;
            top: 0;
            opacity: 0.5;
            pointer-events: none;
        }
    }
</style>