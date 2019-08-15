<template>
    <div class="wrapper" id="RRILineChartView" @mousedown="clearDropDom" @mouseup="showDropDown"
         @mouseenter="clearDropDom">
        <div ref="chartDiv" class="chart"></div>
        <div class="clicked-line" v-if="clickedLine !== null" :style="{left: clickedLine.position + 'px'}"></div>
        <div
                class="dragged-region"
                v-if="draggedRegion !== null"
                :style="{
                    left: draggedRegion.left + 'px',
                    width: draggedRegion.width + 'px'
                }">
        </div>
        <div class="fixedBox"
             :style="{position:'absolute',zIndex: 2012,left: mouseOrigin.x +'px', top: mouseOrigin.y + 'px'}">
            <el-dropdown ref="operationMenuRRInterval" placement="bottom-end" trigger="click"
                         @command="handleMenuOperation"
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
    import {bus} from '../../bus';
    import Util from '../../common/util';

    const FREQUENCY = 512;
    const DURATION_MINUTES = 10;
    const STEP_MINUTES = 1;

    export default {
        name: 'RRILineChartView',
        props: ['handleMenuOperation', 'handleMenuVisible'],
        data() {
            return {
                chart: null,
                clickedLine: null, //null or { relativePos, position }
                draggedRegion: null, // null or { fromPos, toPos, x, left, width }
                mouseOrigin: {
                    x: 0,
                    y: 0
                },
            };
        },
        computed: {
            ...mapState('ecgView', {
                ecgStartTime: state => state.ecgStartTime,
                ecgEndTime: state => state.ecgEndTime,
                beatList: state => state.currentDateTags
            }),
            ...mapState('afView', {
                currentTime: state => state.selectedTime,
                selectedRange: state => state.selectedRange
            })
        },
        methods: {
            ...mapMutations('afView', [
                'changeSelectedPosition',
                'changeSelectedRange'
            ]),
            drawChart(position) {
                Date.prototype.format = function (fmt) {
                    let o = {
                        "M+": this.getMonth() + 1, //月份
                        "d+": this.getDate(), //日
                        "H+": this.getHours(), //小时
                        "m+": this.getMinutes(), //分
                        "s+": this.getSeconds(), //秒
                        "q+": Math.floor((this.getMonth() + 3) / 3), //季度
                        "S": this.getMilliseconds() //毫秒
                    };
                    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
                    for (let k in o)
                        if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length === 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
                    return fmt;
                };

                let beats = this.beatList.filter(beat => (beat.p >= position && beat.p < position + FREQUENCY * 60 * DURATION_MINUTES));

                let rris = [];
                for (let i = 1; i < beats.length; i++) {
                    if (beats[i].t === 'O' || beats[i - 1].t === 'O')
                        continue;

                    // 出现时差1分钟以上的心拍是因为设备关机
                    if (beats[i].p - beats[i - 1].p > FREQUENCY * 60) {
                        continue;
                    }

                    rris.push({p: beats[i].p, i: Math.round((beats[i].p - beats[i - 1].p) * 1000 / 512)})
                }

                let chartItems = rris.map(rri => [rri.p - position, rri.i]);
                let options = {
                    title: {
                        text: 'RR趋势图',
                        left: 'center',
                        textAlign: 'left',
                        textStyle: {
                            fontSize: 16
                        }
                    },
                    grid: {
                        left: '8%',
                        right: '4%',
                        top: 30,
                        bottom: 30
                    },
                    xAxis: {
                        type: 'value',
                        min: 0,
                        max: FREQUENCY * 60 * DURATION_MINUTES,
                        interval: FREQUENCY * 60 * STEP_MINUTES,
                        axisLabel: {
                            formatter: (value, index) => {
                                let time = new Date(this.ecgStartTime);
                                time.setSeconds(time.getSeconds() + position / FREQUENCY);   //坐标原点时间
                                time.setMinutes(time.getMinutes() + index); //坐标刻度
                                return time.format("HH:mm:ss");
                            }
                        }
                    },
                    yAxis: {
                        type: 'value',
                        min: 0,
                        max: 2000,
                        interval: 400
                    },
                    series: [{
                        data: chartItems,
                        type: 'line',
                        showSymbol: false,
                        lineStyle: {
                            normal: {
                                width: 1,
                                color: 'darkGrey',
                            }
                        }
                    }]
                };
                this.chart.setOption(options);

                if (rris.length === 0) {
                    this.clickedLine = null;
                    return false;
                }
                return true;
            },
            selectSecond(seconds) {
                let position = Math.floor(seconds * FREQUENCY);
                let relativePos = position % (FREQUENCY * 60 * DURATION_MINUTES);
                if (position >= 0) {
                    if (this.drawChart(position - relativePos)) {
                        let pxOffset = this.chart.convertToPixel('xAxis', relativePos);
                        this.clickedLine = {...this.clickedLine, relativePos: relativePos, position: pxOffset};
                    }
                    let beats = this.beatList.filter(beat => (beat.p >= position && beat.p < position + FREQUENCY * 60 * DURATION_MINUTES));
                    let nearestBeat = Util.findNearestBeat(position, beats);
                    this.$emit('returnPosition', {
                        val: nearestBeat !== null ? nearestBeat.p : position,
                        selectBeat: nearestBeat !== null
                    });
                } else {
                    this.chart.clear();
                    this.clickedLine = null;
                }
            },
            showDropDown(e) {
                if (this.selectedRange !== null && this.selectedRange.from !== this.selectedRange.to) {
                    this.mouseOrigin = {
                        ...this.mouseOrigin,
                        x: e.offsetX,
                        y: e.offsetY
                    };
                    setTimeout(() => {
                        this.$refs.operationMenuRRInterval.show();
                    }, 0);
                }
            },
            clearDropDom() {
                this.$refs.operationMenuRRInterval.hide();
            },
        },
        watch: {
            beatList: function () {
                this.selectSecond(this.currentTime);
            },
            currentTime: function () {
                this.selectSecond(this.currentTime);
            },
        },
        mounted() {

            let timeoutTime = null;
            const scrollFun = function (e) {
                e.preventDefault();
                e.stopPropagation();
                let scrollWay = e.deltaY || e.detail;
                clearTimeout(timeoutTime);
                timeoutTime = setTimeout(() => {
                    if (scrollWay > 0) {
                        bus.$emit('changeScrollWay', 'right');
                    } else {
                        bus.$emit('changeScrollWay', 'left');
                    }
                }, 200);
            };
            document.getElementById('RRILineChartView').addEventListener('DOMMouseScroll', scrollFun);
            document.getElementById('RRILineChartView').addEventListener('mousewheel', scrollFun);
            this.chart = echarts.init(this.$refs.chartDiv);
            this.chart.getZr().on("click", e => {
                if (this.currentTime == null || this.clickedLine == null)
                    return;

                let relativePos = this.chart.convertFromPixel('xAxis', [e.offsetX]);
                if (relativePos < 0 || relativePos >= FREQUENCY * 60 * DURATION_MINUTES) {
                    return;
                }

                this.changeSelectedRange(null);

                this.clickedLine = {...this.clickedLine, relativePos: relativePos, position: e.offsetX};

                let position = Math.floor(this.currentTime * FREQUENCY);
                let startPos = position - position % (FREQUENCY * 60 * DURATION_MINUTES);
                let beats = this.beatList.filter(beat => (beat.p >= startPos && beat.p < startPos + FREQUENCY * 60 * DURATION_MINUTES));
                let mouseClickPos = Math.floor(startPos + relativePos);
                let nearestBeat = Util.findNearestBeat(mouseClickPos, beats);
                this.$emit('returnPosition', {
                    val: nearestBeat !== null ? nearestBeat.p : mouseClickPos,
                    selectBeat: nearestBeat !== null
                });
            });
            this.chart.getZr().on("mousedown", e => {
                if (this.currentTime == null)
                    return;

                let fromPos = this.chart.convertFromPixel('xAxis', [e.offsetX]);
                if (fromPos < 0 || fromPos >= FREQUENCY * 60 * DURATION_MINUTES) {
                    return;
                }

                this.draggedRegion = {
                    ...this.draggedRegion,
                    fromPos: fromPos,
                    toPos: fromPos,
                    x: e.offsetX,
                    left: e.offsetX,
                    width: 0
                }
            });
            this.chart.getZr().on("mousemove", e => {
                if (this.draggedRegion == null || event.buttons !== 1) {
                    return;
                }
                let toPos = this.chart.convertFromPixel('xAxis', [e.offsetX]);
                toPos = Math.min(Math.max(toPos, 0), FREQUENCY * 60 * DURATION_MINUTES);
                let left = this.draggedRegion.x;
                let right = e.offsetX;
                if (left > right) {
                    [left, right] = [right, left];
                }
                this.draggedRegion = {
                    ...this.draggedRegion,
                    toPos: toPos,
                    left: left,
                    width: right - left
                }
            });
            this.chart.getZr().on("mouseup", e => {
                if (this.draggedRegion !== null && this.draggedRegion.width > 0) {
                    let from = this.draggedRegion.fromPos;
                    let to = this.draggedRegion.toPos;
                    if (from > to) [from, to] = [to, from];
                    let position = Math.floor(this.currentTime * FREQUENCY);
                    let startPos = position - position % (FREQUENCY * 60 * DURATION_MINUTES);
                    this.changeSelectedRange({from: from + startPos, to: to + startPos});
                }
            });
            this.chart.getZr().on('mouseout', (e) => {
                if (this.selectedRange == null)
                    this.draggedRegion = null;
            });
            let $chartDom = $(this.chart.getZr().dom);
            $chartDom.on("mouseenter", e => {
                if (e.buttons == 0) {
                    this.draggedRegion = null;
                }
            });

            this.selectSecond(this.currentTime);
        },
        beforeDestroy() {
            $(this.chart.getZr().dom).off();
            this.chart.dispose();
            this.chart = null;
        }
    }
</script>

<style scoped lang="scss">
    $line-color: #aaaaaa;

    $area-color: #555555;

    div.wrapper {

        position: relative;

        div.chart {
            height: 100%;
        }

        div.clicked-line {
            position: absolute;
            width: 0px;
            top: 30px;
            bottom: 30px;
            border-left: solid 1px #ff1eba;
            pointer-events: none;
        }

        div.dragged-region {
            position: absolute;
            background-color: $area-color;
            border-left: solid 1px $line-color;
            border-right: solid 1px $line-color;
            top: 30px;
            bottom: 30px;
            opacity: 0.5;
            pointer-events: none;
        }
    }
</style>