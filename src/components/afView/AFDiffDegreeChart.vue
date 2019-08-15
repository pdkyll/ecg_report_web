<template>
    <div class="wrapper" @mousedown="clearDropDom" @mouseup="showDropDown" @mouseenter="clearDropDom">
        <div class="chart" ref="chartDiv"></div>
        <div class="selected-panel" :style="{top: selectPanelTop + 'px'}"></div>
        <div class="selected-bar" :style="{top: selectPanelTop + 'px'}" ref="selectedBar"></div>
        <div class="selected-value" :style="{top: selectPanelTop + 'px'}" @mouseenter="">{{diffDegreeNum}}%</div>
        <div
                class="dragged-region"
                v-if="xAxisDraggingInfo !== null"
                :style="{
                    left: xAxisDraggingInfo.left + 'px',
                    width: xAxisDraggingInfo.width + 'px'
                }">
        </div>
        <div class="clicked-line" v-if="clickedLine !== null" :style="{left: clickedLine.position + 'px'}"></div>
        <div class="fixedBox"
             :style="{position:'absolute',zIndex: 2012,left: mouseOrigin.x +'px', top: mouseOrigin.y + 'px'}">
            <el-dropdown ref="operationMenuAFDiff" placement="bottom-end" trigger="click" @command="handleMenuOperation"
                         @visible-change="handleMenuVisible"
            >
                <span class="el-dropdown-link"></span>
                <el-dropdown-menu slot="dropdown">
                    <el-dropdown-item command="add">添加</el-dropdown-item>
                    <el-dropdown-item command="remove">删除</el-dropdown-item>
                </el-dropdown-menu>
            </el-dropdown>
        </div>
    </div>
</template>

<script>
    import echarts from 'echarts';
    import {mapState, mapMutations, mapActions} from 'vuex';
    import API from '../../api/api_af_view';
    import {RRExtractor} from '../../common/rr_extractor';
    import AbstractNavigator from './AbstractNavigator';

    const X_AXIS_DATA = (function () {
        let arr = new Array(24);
        for (let i = 0; i < arr.length; i++) {
            arr[i] = i;
        }
        return arr;
    })();

    const STEP_MINUTE = 10;

    export default {
        name: 'AFDiffDegreeChart',
        mixins: [AbstractNavigator],
        props: ['handleMenuOperation', 'handleMenuVisible'],
        data() {
            return {
                chart: null,
                diffDegreeNum: 50,
                selectPanelTop: 0,
                rrExtractor: null,
                showSelectDraw: false,
                mouseOrigin: {
                    x: 0,
                    y: 0
                },
                isShow: false
            }
        },
        watch: {
            currentDateTags() {
                this.rrExtractor = new RRExtractor(512, this.currentDateTags, this.ecgStartTime, 1440 / STEP_MINUTE - this.toOffset(STEP_MINUTE));
                this.rrExtractor.calcSimilarities();
                let yData = this.rrExtractor.getSimilaritiesWithTime();
//                this.changeTALMultipleSelection([]);
                this.changeAfFragmentData(this.filterAfRhythms(this.rrExtractor.belowWithTime(this.diffDegreeNum)));
                this.drawChart(yData);
                this.selectHour(this.startHour);
            },
        },
        computed: {},
        methods: {
            ...mapMutations('afView', [
                'changeTagsLoading',
                'changeAfFragmentData',
                'changeTALMultipleSelection'
            ]),
            drawChart(yData) {
                let date = new Date(this.validDates[this.dateIndex].replace(/\-/g, '/') + ' 00:00:00');
                let xMin = date.getTime();
                date.setDate(date.getDate() + 1);
                let xMax = date.getTime();

                let option = {
                    backgroundColor: 'black',
                    animation: false,
                    grid: {
                        id: 'diffDegree',
                        left: 40,
                        right: 40,
                        top: 30,
                        bottom: 30
                    },
                    xAxis: [
                        {
                            type: 'value',
                            show: false,
                            min: xMin,
                            max: xMax
                        },
                        {
                            type: 'value',
                            data: X_AXIS_DATA,
                            min: 0,
                            max: 24,
                            interval: 1,
                            axisLabel: {
                                formatter: function (value) {
                                    return (value < 10 ? "0" : "") + value + ":00"
                                }
                            },
                            position: 'bottom',
                            axisLine: {
                                lineStyle: {
                                    color: 'white'
                                }
                            },
                            splitLine: {
                                show: false
                            }
                        }
                    ],
                    yAxis:
                        {
                            type: 'value',
                            min: 0,
                            max: 100,
                            name: '百分比(%)',
                            axisLine: {
                                lineStyle: {
                                    color: 'white'
                                }
                            },
                            splitLine: {
                                show: false
                            }
                        }
                    ,
                    series: [{
                        data: yData,
                        type: 'line',
                        showSymbol: false,
                        lineStyle: {
                            color: 'white',
                            width: 1
                        }
                    }]
                };
                this.chart.setOption(option);
            },
            bindYAxisEvents() {
                var $bar = $(this.$refs.selectedBar);
                $bar.on('mousedown', (e) => {
                    this.xAxisDraggingInfo = null;
                    let top = this.chart.convertToPixel({yAxisIndex: 0}, [this.diffDegreeNum]);
                    this.yAxisDraggingInfo = {
                        ...this.yAxisDraggingInfo,
                        top: top,
                        screenY: e.screenY
                    };
                    e.preventDefault();
                });
                $bar.on('mousemove', (e) => {
                    this.dragY(e);
                });
                this.chart.getZr().on('mousemove', (e) => {
                    this.dragY(e.event);
                });
                $bar.on('mouseup', (e) => {
                    this.endDragY(e);
                });
                this.chart.getZr().on('mouseup', (e) => {
                    this.endDragY(e.event);
                });
                let $chartDom = $(this.chart.getZr().dom);
                $chartDom.off('mouseenter', this.mouseEnterEvents);
                $chartDom.on('mouseenter', (e) => {
                    setTimeout(() => {
                        if (!this.$refs.operationMenuAFDiff.visible) {
                            if (e.buttons === 0) {
                                this.xAxisDraggingInfo = null;
                            }
                        }
                    }, 0)
                });
                this.chart.getZr().on('mouseleave', (e) => {
                    this.endDragY(e.event);
                });
            },
            dragY(event) {
                if (this.yAxisDraggingInfo && !this.xAxisDraggingInfo && event.buttons == 1) {
                    let newTop = this.yAxisDraggingInfo.top + event.screenY - this.yAxisDraggingInfo.screenY;
                    let newNum = parseInt(this.chart.convertFromPixel({yAxisIndex: 0}, [newTop]));
                    if (newNum >= 0 && newNum <= 100) {
                        this.selectPanelTop = newTop;
                        this.diffDegreeNum = newNum;
                    }
                }
            },
            endDragY(event) {
                if (this.yAxisDraggingInfo) {
                    this.yAxisDraggingInfo = null;
                    let rrExtractor = this.rrExtractor;
                    if (rrExtractor) {
//                        this.changeTALMultipleSelection([]);
                        this.changeAfFragmentData(this.filterAfRhythms(rrExtractor.belowWithTime(this.diffDegreeNum)));
                    }
                }
                event.preventDefault();
            },
            showDropDown(e) {
                if (this.selectedRange !== null && this.selectedRange.from !== this.selectedRange.to) {
                    this.mouseOrigin = {
                        ...this.mouseOrigin,
                        x: e.offsetX,
                        y: e.offsetY
                    };
                    this.showSelectDraw = true;
                    setTimeout(() => {
                        this.$refs.operationMenuAFDiff.show();
                    }, 0);
                }
            },
            clearDropDom() {
                this.showSelectDraw = false;
                this.$refs.operationMenuAFDiff.hide();
            },
            //过滤掉临时列表内持续时间低于10秒的心律片段
            filterAfRhythms(arr) {
                return arr.filter(v => {
                    return v[1].getTime() - v[0].getTime() >= 10000
                })
            }
        },
        mounted() {
            this.chart = echarts.init(this.$refs.chartDiv);
            this.bindXAxisEvents();
            this.bindYAxisEvents();
            this.drawChart([]);
            this.selectPanelTop = this.chart.convertToPixel({yAxisIndex: 0}, [this.diffDegreeNum]);
        },
        beforeDestroy() {
            $(this.$refs.selectedBar).off();
            $(this.chart.getZr().dom).off();
            this.chart.dispose();
            this.chart = null;
        },
        destroyed() {

        }
    };
</script>
<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">

    $line-color: #aaaaaa;

    $area-color: #555555;

    div.wrapper {

        position: relative;

        div.chart {
            height: 100%;
        }

        div.selected-panel {
            position: absolute;
            left: 0px;
            right: 0px;
            bottom: 0px;
            pointer-events: none;
            background-color: $area-color;
            border-top: solid 1px $line-color;
            opacity: 0.5;
        }

        div.selected-value {
            position: absolute;
            color: white;
            left: 0px;
            font-weight: bold;
            margin-left: 70px;
            user-select: none;
            transform: translateY(-50%);
            pointer-events: none;
        }

        div.selected-bar {
            position: absolute;
            left: 0px;
            right: 0px;
            cursor: ns-resize;
            transform: translateY(-50%);
            height: 20px;
        }

        div.dragged-region {
            position: absolute;
            background-color: $area-color;
            border-left: solid 1px $line-color;
            border-right: solid 1px $line-color;
            top: 0px;
            bottom: 0px;
            opacity: 0.5;
            pointer-events: none;
        }

        div.clicked-line {
            position: absolute;
            width: 0px;
            top: 0px;
            bottom: 0px;
            border-left: solid 1px $line-color;
            pointer-events: none;
        }
    }
</style>
